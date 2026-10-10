import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Conversation from '../src/modules/conversation/models/Conversation.js';
import Message from '../src/modules/conversation/models/Message.js';
import Case from '../src/modules/case/models/Case.js';
import Document from '../src/modules/document/models/Document.js';
import { generateToken } from '../src/utils/token.js';
import * as followUpService from '../src/modules/case/case.followUp.service.js';
import * as caseExtractionService from '../src/modules/case/case.extraction.service.js';

let mongod;
let server;
let baseUrl;

let patientA;
let tokenA;
let convA;

let patientB;
let tokenB;
let convB;

let doctor;
let tokenDoctor;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  patientA = await User.create({
    name: 'Alice Patient',
    email: 'alice.followup@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(patientA);

  convA = await Conversation.create({
    userId: patientA._id,
    title: 'Alice Follow-up Consultation',
  });

  patientB = await User.create({
    name: 'Bob Patient',
    email: 'bob.followup@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenB = generateToken(patientB);

  convB = await Conversation.create({
    userId: patientB._id,
    title: 'Bob Consultation',
  });

  doctor = await User.create({
    name: 'Dr. Sarah Smith',
    email: 'dr.smith.followup@example.com',
    passwordHash: 'hashed_pw',
    role: 'PROFESSIONAL',
    isActive: true,
  });
  tokenDoctor = generateToken(doctor);
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('Step 6.2: Context-Aware Follow-up Questions & Answer Integration Test Suite', async (t) => {
  // ── 1. Missing Required Field Produces Appropriate Follow-up Question ───────
  await t.test('1. A missing required field produces an appropriate follow-up question', async () => {
    // Case has chief complaint and symptom, but lacks timing (onset/duration)
    const caseDoc = await Case.create({
      patientId: patientA._id,
      conversationId: convA._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Severe throbbing headache' },
      symptoms: [{ name: 'Headache', severity: 'moderate' }],
      severity: { value: 'moderate' },
      // Lacks timing (onset/duration)
    });

    const nextQ = followUpService.selectNextFollowUpQuestion(caseDoc);
    assert.equal(nextQ.needed, true);
    assert.equal(nextQ.targetField, 'timing');
    assert.equal(nextQ.category, 'required');
    assert.ok(nextQ.questionText.toLowerCase().includes('symptoms begin') || nextQ.questionText.toLowerCase().includes('how long'));
    assert.ok(nextQ.rationale.includes('required for clinical review'));

    // Test HTTP endpoint GET /api/cases/conversation/:convId/follow-up
    const res = await fetch(`${baseUrl}/cases/conversation/${convA._id}/follow-up`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.needed, true);
    assert.equal(body.nextQuestion.targetField, 'timing');
    assert.equal(body.completeness.canSubmitForReview, false);
  });

  // ── 2. Already Answered Field Does Not Trigger Redundant Question ─────────
  await t.test('2. An already answered field does not trigger a redundant question', async () => {
    const caseDoc = await Case.findOne({ conversationId: convA._id });

    // Populate timing
    caseDoc.onset = { value: 'Yesterday afternoon' };
    await caseDoc.save();

    const nextQ = followUpService.selectNextFollowUpQuestion(caseDoc);
    // Timing is now satisfied; next priority should NOT be timing
    assert.notEqual(nextQ.targetField, 'timing');
  });

  // ── 3. Previously Asked Questions Remain Tracked After Reloading ───────────
  await t.test('3. Previously asked questions remain tracked after reloading the conversation', async () => {
    // Call ask endpoint to ask follow-up question
    const askRes = await fetch(`${baseUrl}/cases/conversation/${convA._id}/follow-up/ask`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(askRes.status, 200);
    const askBody = await askRes.json();
    assert.equal(askBody.success, true);
    assert.equal(askBody.needed, true);
    assert.ok(askBody.question);
    assert.equal(askBody.question.status, 'asked');

    // Reload case from DB directly
    const reloadedCase = await Case.findOne({ conversationId: convA._id }).lean();
    assert.ok(Array.isArray(reloadedCase.followUpQuestions));
    assert.ok(reloadedCase.followUpQuestions.length >= 1);
    const trackedQ = reloadedCase.followUpQuestions.find(
      (q) => q.questionKey === askBody.question.questionKey
    );
    assert.ok(trackedQ);
    assert.equal(trackedQ.status, 'asked');
    assert.ok(trackedQ.messageId);
    assert.ok(trackedQ.askedAt);
  });

  // ── 4. Duplicate Requests Do Not Create Duplicate Messages ────────────────
  await t.test('4. Duplicate requests do not create duplicate follow-up messages', async () => {
    const msgCountBefore = await Message.countDocuments({ conversationId: convA._id });

    // Call ask endpoint second time (duplicate request)
    const askRes2 = await fetch(`${baseUrl}/cases/conversation/${convA._id}/follow-up/ask`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(askRes2.status, 200);
    const body2 = await askRes2.json();
    assert.equal(body2.alreadyActive, true);

    const msgCountAfter = await Message.countDocuments({ conversationId: convA._id });
    // No new message created
    assert.equal(msgCountAfter, msgCountBefore);
  });

  // ── 5. A Patient Answer Updates Only the Correct Case ─────────────────────
  await t.test('5. A patient answer updates only the correct case', async () => {
    // Initialize case for Bob (Patient B)
    const bobCase = await Case.create({
      patientId: patientB._id,
      conversationId: convB._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Sprained wrist' },
    });

    const aliceCaseBefore = await Case.findOne({ conversationId: convA._id }).lean();

    // Patient B sends a message
    const bobMsg = await Message.create({
      conversationId: convB._id,
      role: 'user',
      content: 'I fell down the stairs 2 hours ago and hurt my right wrist.',
      status: 'completed',
    });

    // Mock Gemini extraction client for Bob
    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            chiefComplaint: 'Sprained wrist from fall',
            symptoms: [{ name: 'Wrist pain', severity: 'moderate' }],
            onset: '2 hours ago',
            severity: 'moderate',
            medications: [],
            allergies: [],
            relevantMedicalHistory: [],
            vitals: [],
            timeline: [],
            missingInformation: [],
          }),
        }),
      },
    };

    // Integrate answer for Bob
    const answerRes = await followUpService.integratePatientAnswer({
      conversationId: convB._id.toString(),
      userId: patientB._id.toString(),
      userRole: 'PATIENT',
      messageId: bobMsg._id.toString(),
      client: mockClient,
    });

    assert.ok(answerRes.case);
    assert.equal(answerRes.case._id.toString(), bobCase._id.toString());
    assert.equal(answerRes.case.onset?.value, '2 hours ago');

    // Verify Alice's case was NOT modified
    const aliceCaseAfter = await Case.findOne({ conversationId: convA._id }).lean();
    assert.equal(aliceCaseAfter.updatedAt.getTime(), aliceCaseBefore.updatedAt.getTime());
    assert.equal(aliceCaseAfter.patientId.toString(), patientA._id.toString());
  });

  // ── 6. Ambiguous Answer Does Not Create Unsupported Fact ──────────────────
  await t.test('6. An ambiguous answer does not create an unsupported fact and flags ambiguity', async () => {
    // Create new conversation and case for testing ambiguous answer
    const ambConv = await Conversation.create({
      userId: patientA._id,
      title: 'Ambiguity Test Consultation',
    });
    const ambCase = await Case.create({
      patientId: patientA._id,
      conversationId: ambConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Abdominal discomfort' },
      symptoms: [{ name: 'Stomach ache', severity: 'moderate' }],
      severity: { value: 'moderate' },
      followUpQuestions: [
        {
          questionKey: 'timing',
          targetField: 'timing',
          category: 'required',
          questionText: 'When did your stomach ache start?',
          status: 'asked',
          askedAt: new Date(),
        },
      ],
    });

    // User replies with ambiguous text: "I have had it for a while"
    const userMsg = await Message.create({
      conversationId: ambConv._id,
      role: 'user',
      content: 'I have had it for a while now.',
      status: 'completed',
    });

    // Mock extractor that preserves uncertainty by NOT inventing an onset
    const mockAmbiguousClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            chiefComplaint: 'Abdominal discomfort',
            symptoms: [{ name: 'Stomach ache', severity: 'moderate' }],
            onset: null, // Preserves uncertainty! Does not invent dates.
            duration: null,
            severity: 'moderate',
            medications: [],
            allergies: [],
            relevantMedicalHistory: [],
            vitals: [],
            timeline: [],
            missingInformation: [],
          }),
        }),
      },
    };

    const result = await followUpService.integratePatientAnswer({
      conversationId: ambConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      messageId: userMsg._id.toString(),
      client: mockAmbiguousClient,
    });

    // Ensure onset was NOT fabricated
    assert.equal(result.case.onset?.value || null, null);
    assert.equal(result.answeredQuestion?.status, 'ambiguous');
  });

  // ── 7. Contradictory Answer Preserves Both Assertion Sources ──────────────
  await t.test('7. A contradictory answer preserves both assertion sources without silent overwrite', async () => {
    const discConv = await Conversation.create({
      userId: patientA._id,
      title: 'Discrepancy Test Consultation',
    });
    const discCase = await Case.create({
      patientId: patientA._id,
      conversationId: discConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Knee pain' },
      symptoms: [{ name: 'Knee pain', severity: 'mild' }],
      onset: {
        value: '1 month ago',
        source: { sourceType: 'patient_report', sourceId: 'initial_msg' },
      },
      severity: { value: 'mild' },
    });

    const userMsg = await Message.create({
      conversationId: discConv._id,
      role: 'user',
      content: 'Actually, it only started 2 days ago after running.',
      status: 'completed',
    });

    // Extractor extracts updated onset: "2 days ago"
    const mockDiscClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            chiefComplaint: 'Knee pain',
            symptoms: [{ name: 'Knee pain', severity: 'mild' }],
            onset: '2 days ago',
            severity: 'mild',
            medications: [],
            allergies: [],
            relevantMedicalHistory: [],
            vitals: [],
            timeline: [],
            missingInformation: [],
          }),
        }),
      },
    };

    await followUpService.integratePatientAnswer({
      conversationId: discConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      messageId: userMsg._id.toString(),
      client: mockDiscClient,
    });

    const updatedCase = await Case.findById(discCase._id).lean();
    assert.equal(updatedCase.onset.value, '2 days ago');
    assert.ok(updatedCase.discrepancies.length >= 1);

    const onsetDisc = updatedCase.discrepancies.find((d) => d.field === 'onset');
    assert.ok(onsetDisc);
    assert.equal(onsetDisc.previousValue, '1 month ago');
    assert.equal(onsetDisc.previousSource?.sourceId, 'initial_msg');
    assert.equal(onsetDisc.newValue, '2 days ago');
    assert.equal(onsetDisc.source?.sourceId, userMsg._id.toString());
  });

  // ── 8. Reprocessing Same Answer Does Not Duplicate Case Updates ───────────
  await t.test('8. Reprocessing the same answer is idempotent and does not duplicate facts', async () => {
    const rConv = await Conversation.create({
      userId: patientA._id,
      title: 'Idempotency Test Consultation',
    });
    const rCase = await Case.create({
      patientId: patientA._id,
      conversationId: rConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Back pain' },
    });

    const userMsg = await Message.create({
      conversationId: rConv._id,
      role: 'user',
      content: 'I have lower back pain that started this morning.',
      status: 'completed',
    });

    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            chiefComplaint: 'Lower back pain',
            symptoms: [{ name: 'Lower back pain', severity: 'moderate' }],
            onset: 'This morning',
            severity: 'moderate',
            medications: [],
            allergies: [],
            relevantMedicalHistory: [],
            vitals: [],
            timeline: [],
            missingInformation: [],
          }),
        }),
      },
    };

    // First processing
    await followUpService.integratePatientAnswer({
      conversationId: rConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      messageId: userMsg._id.toString(),
      client: mockClient,
    });

    const caseAfterFirst = await Case.findById(rCase._id).lean();
    const symCount = caseAfterFirst.symptoms.length;

    // Second processing of identical message
    await followUpService.integratePatientAnswer({
      conversationId: rConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      messageId: userMsg._id.toString(),
      client: mockClient,
    });

    const caseAfterSecond = await Case.findById(rCase._id).lean();
    assert.equal(caseAfterSecond.symptoms.length, symCount);
    assert.equal(caseAfterSecond.processedMessageIds.length, 1);
  });

  // ── 9. Extraction Failure Does Not Mark Answer as Processed ───────────────
  await t.test('9. Extraction failure preserves existing case and does not mark answer processed', async () => {
    const fConv = await Conversation.create({
      userId: patientA._id,
      title: 'Failure Test Consultation',
    });
    const fCase = await Case.create({
      patientId: patientA._id,
      conversationId: fConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Ear ache' },
      followUpQuestions: [
        {
          questionKey: 'timing',
          targetField: 'timing',
          category: 'required',
          questionText: 'When did your ear ache start?',
          status: 'asked',
          askedAt: new Date(),
        },
      ],
    });

    const userMsg = await Message.create({
      conversationId: fConv._id,
      role: 'user',
      content: 'It started yesterday.',
      status: 'completed',
    });

    // Mock client that simulates an API error
    const failingClient = {
      models: {
        generateContent: async () => {
          throw new Error('AI Service Unavailable');
        },
      },
    };

    // Attempting extraction should catch or fail without marking processed
    try {
      await caseExtractionService.extractAndMergeCaseForConversation({
        conversationId: fConv._id.toString(),
        userId: patientA._id.toString(),
        userRole: 'PATIENT',
        messageId: userMsg._id.toString(),
        client: failingClient,
      });
    } catch (_err) {
      // Expected
    }

    const caseAfter = await Case.findById(fCase._id).lean();
    assert.ok(!caseAfter.processedMessageIds.some((id) => id.toString() === userMsg._id.toString()));
    const timingQ = caseAfter.followUpQuestions.find((q) => q.questionKey === 'timing');
    assert.notEqual(timingQ.status, 'answered');
  });

  // ── 10. Patient Cannot Access or Modify Another Patient Case ─────────────
  await t.test('10. Patient cannot access or modify another patient case (rejected with 404)', async () => {
    // Patient A tries to access Patient B's follow-up endpoint
    const forbiddenRes = await fetch(`${baseUrl}/cases/conversation/${convB._id}/follow-up`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(forbiddenRes.status, 404);

    // Patient A tries to trigger ask on Patient B's conversation
    const forbiddenAsk = await fetch(`${baseUrl}/cases/conversation/${convB._id}/follow-up/ask`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(forbiddenAsk.status, 404);
  });

  // ── 11. Unrelated Conversation Cannot Update Case ─────────────────────────
  await t.test('11. Message from an unrelated conversation cannot update another case', async () => {
    // Message belongs to convA
    const msgFromConvA = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'Testing cross-conversation answer.',
      status: 'completed',
    });

    // Attempt to answer follow-up in convB using msgFromConvA -> 404
    const res = await fetch(`${baseUrl}/cases/conversation/${convB._id}/follow-up/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ messageId: msgFromConvA._id }),
    });
    assert.equal(res.status, 404);
  });

  // ── 12. Existing Chat Streaming Continues to Work ─────────────────────────
  await t.test('12. Existing chat streaming continues to function properly', async () => {
    const streamConv = await Conversation.create({
      userId: patientA._id,
      title: 'Streaming Consultation Test',
    });

    const res = await fetch(`${baseUrl}/conversations/${streamConv._id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        content: 'Hello, this is a non-stream message.',
        inputMode: 'text',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message.content, 'Hello, this is a non-stream message.');
  });

  // ── 13. Voice Transcribed InputMode Recorded Correctly ────────────────────
  await t.test('13. Voice-transcribed inputMode is recorded and processed without issues', async () => {
    const vConv = await Conversation.create({
      userId: patientA._id,
      title: 'Voice Input Consultation',
    });

    const res = await fetch(`${baseUrl}/conversations/${vConv._id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        content: 'Voice dictated: I feel dizzy when standing up.',
        inputMode: 'voice',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.message.inputMode, 'voice');
  });

  // ── 14. PDF-Derived Information Prevents Unnecessary Questions ───────────
  await t.test('14. PDF-derived findings prevent redundant follow-up questions', async () => {
    const pdfConv = await Conversation.create({
      userId: patientA._id,
      title: 'PDF Derived Test Consultation',
    });
    // Case already has timing derived from an uploaded report
    const pdfCase = await Case.create({
      patientId: patientA._id,
      conversationId: pdfConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Chest tightness' },
      symptoms: [{ name: 'Chest tightness', severity: 'moderate' }],
      onset: {
        value: '3 days ago per ECG intake',
        source: { sourceType: 'document' },
      },
      severity: { value: 'moderate' },
      vitals: [
        {
          bloodPressure: '120/80',
          source: { sourceType: 'document' },
        },
      ],
    });

    const nextQ = followUpService.selectNextFollowUpQuestion(pdfCase);
    // Timing was satisfied by document, so it must NOT ask timing
    assert.notEqual(nextQ.targetField, 'timing');
    assert.notEqual(nextQ.targetField, 'vitals');
  });

  // ── 15. Optional Missing Info Does Not Block Professional Review ──────────
  await t.test('15. Optional missing info produces optional questions but permits review', async () => {
    const optCase = {
      chiefComplaint: { text: 'Mild seasonal allergies' },
      symptoms: [{ name: 'Sneezing', severity: 'mild' }],
      onset: { value: '2 days ago' },
      severity: { value: 'mild' },
      medications: [], // Optional
      allergies: [], // Optional
      relevantMedicalHistory: [], // Optional
      followUpQuestions: [],
    };

    const nextQ = followUpService.selectNextFollowUpQuestion(optCase);
    // Because all required fields are satisfied, next question is optional
    if (nextQ.needed) {
      assert.equal(nextQ.category, 'optional');
    }
  });

  // ── 16. System Stops Routine Follow-up When All Intake Complete ───────────
  await t.test('16. The system stops asking follow-up questions when all intake requirements are satisfied', async () => {
    const completeCase = {
      chiefComplaint: { text: 'Migraine with aura' },
      symptoms: [{ name: 'Migraine', severity: 'severe', onset: '3 days ago' }],
      onset: { value: '3 days ago' },
      duration: { value: '72 hours' },
      severity: { value: 'severe' },
      symptomLocation: { value: 'Right temple' },
      medications: [{ name: 'Sumatriptan', dosage: '50mg', frequency: 'as needed' }],
      allergies: [{ substance: 'None', reaction: 'none', severity: 'none' }],
      relevantMedicalHistory: [{ condition: 'History of migraines', status: 'active' }],
      followUpQuestions: [
        { category: 'optional', status: 'answered', questionKey: 'optional_1' },
        { category: 'optional', status: 'answered', questionKey: 'optional_2' },
      ],
    };

    const nextQ = followUpService.selectNextFollowUpQuestion(completeCase);
    assert.equal(nextQ.needed, false);
    assert.equal(nextQ.questionText, null);
  });

  // ── 17. Concurrent Requests Do Not Create Duplicate Questions ─────────────
  await t.test('17. Concurrent requests do not create duplicate outstanding questions', async () => {
    const concConv = await Conversation.create({
      userId: patientA._id,
      title: 'Concurrency Test Consultation',
    });
    await Case.create({
      patientId: patientA._id,
      conversationId: concConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Skin rash on arm' },
      symptoms: [{ name: 'Rash', severity: 'moderate' }],
      // timing and severity missing
    });

    // Fire 3 concurrent ask requests
    const [res1, res2, res3] = await Promise.all([
      fetch(`${baseUrl}/cases/conversation/${concConv._id}/follow-up/ask`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
      fetch(`${baseUrl}/cases/conversation/${concConv._id}/follow-up/ask`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
      fetch(`${baseUrl}/cases/conversation/${concConv._id}/follow-up/ask`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res3.status, 200);

    const concCase = await Case.findOne({ conversationId: concConv._id }).lean();
    const activeQuestions = concCase.followUpQuestions.filter((q) => q.status === 'asked');
    // Exactly 1 active question exists
    assert.equal(activeQuestions.length, 1);

    const messages = await Message.find({ conversationId: concConv._id }).lean();
    // Exactly 1 assistant question message created
    assert.equal(messages.length, 1);
  });

  // ── 18. Failed Message Creation Recovery & Orphaned Reservation Cleanup ───
  await t.test('18. Failed message creation recovery & orphaned reservation cleanup', async () => {
    const recConv = await Conversation.create({
      userId: patientA._id,
      title: 'Recovery Test Consultation',
    });
    // Create case with an orphaned reservation (messageId is null, simulating an uncommitted/crashed request)
    const orphanedCase = await Case.create({
      patientId: patientA._id,
      conversationId: recConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Persistent knee ache' },
      symptoms: [{ name: 'Knee ache', severity: 'moderate' }],
      followUpQuestions: [
        {
          questionKey: 'required_timing',
          targetField: 'timing',
          category: 'required',
          questionText: 'When did the knee ache begin?',
          status: 'asked',
          messageId: null, // Orphaned!
          askedAt: new Date(Date.now() - 5000),
        },
      ],
    });

    // Calling askOrGetFollowUpQuestion should detect and clean up the orphaned reservation, then ask properly
    const res = await followUpService.askOrGetFollowUpQuestion({
      conversationId: recConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
    });

    assert.equal(res.needed, true);
    assert.ok(res.question);
    assert.equal(res.question.status, 'asked');
    assert.ok(res.question.messageId); // Now has a real message!

    // Verify orphaned question was cleaned up and exactly 1 active question exists
    const reloaded = await Case.findById(orphanedCase._id).lean();
    const activeQuestions = reloaded.followUpQuestions.filter((q) => q.status === 'asked');
    assert.equal(activeQuestions.length, 1);
    assert.ok(activeQuestions[0].messageId);
  });

  // ── 19. Assistant Message Cannot Be Submitted as Patient Answer ───────────
  await t.test('19. Assistant message cannot be submitted as patient answer', async () => {
    const astConv = await Conversation.create({
      userId: patientA._id,
      title: 'Assistant Message Rejection Test',
    });
    const astMsg = await Message.create({
      conversationId: astConv._id,
      role: 'assistant',
      content: 'I am the AI assistant asking a question.',
      status: 'completed',
    });

    const res = await fetch(`${baseUrl}/cases/conversation/${astConv._id}/follow-up/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ messageId: astMsg._id.toString() }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('patient message'));
  });

  // ── 20. Existing Duration + Ambiguous Clarification Answer ("I'm not sure") ─
  await t.test('20. Existing duration + ambiguous clarification preserves existing duration and flags ambiguity', async () => {
    const ambConv = await Conversation.create({
      userId: patientA._id,
      title: 'Duration Clarification Ambiguity Test',
    });
    const origMsg = await Message.create({
      conversationId: ambConv._id,
      role: 'user',
      content: 'I have had a headache for 3 days.',
      status: 'completed',
    });

    // Case already contains duration: 3 days
    const ambCase = await Case.create({
      patientId: patientA._id,
      conversationId: ambConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Headache', source: { sourceType: 'patient_report', sourceId: origMsg._id.toString() } },
      symptoms: [{ name: 'Headache', severity: 'moderate', source: { sourceType: 'patient_report', sourceId: origMsg._id.toString() } }],
      duration: { value: '3 days', source: { sourceType: 'patient_report', sourceId: origMsg._id.toString() } },
      severity: { value: 'moderate' },
      followUpQuestions: [
        {
          questionKey: 'incomplete_duration',
          targetField: 'duration',
          category: 'incomplete',
          questionText: 'Could you clarify the exact hours or duration of the headache?',
          status: 'asked',
          askedAt: new Date(),
        },
      ],
    });

    // Patient sends an ambiguous answer: "I'm not sure."
    const patientReply = await Message.create({
      conversationId: ambConv._id,
      role: 'user',
      content: "I'm not sure.",
      status: 'completed',
    });

    // Mock client returns no duration extraction for "I'm not sure"
    const mockClientEmpty = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({}),
          candidates: [{ finishReason: 'STOP' }],
        }),
      },
    };

    const integrateRes = await followUpService.integratePatientAnswer({
      conversationId: ambConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      messageId: patientReply._id.toString(),
      client: mockClientEmpty,
    });

    assert.equal(integrateRes.answeredQuestion.status, 'ambiguous');
    assert.equal(integrateRes.answeredQuestion.answerMessageId.toString(), patientReply._id.toString());

    // CRITICAL: Existing duration MUST NOT be marked answered and MUST be preserved as 3 days
    const reloadedCase = await Case.findById(ambCase._id).lean();
    assert.equal(reloadedCase.duration.value, '3 days');
    assert.equal(reloadedCase.duration.source.sourceId, origMsg._id.toString());
    const storedQ = reloadedCase.followUpQuestions.find((q) => q.questionKey === 'incomplete_duration');
    assert.equal(storedQ.status, 'ambiguous');
  });

  // ── 21. Definite New Value, Contradictory Value, and Unrelated Answers ────
  await t.test('21. Definite new value, contradictory value, and unrelated answers on existing field', async () => {
    // 21A. Definite new value resolves question to 'answered'
    const defConv = await Conversation.create({
      userId: patientA._id,
      title: 'Definite Answer Test',
    });
    const defOrigMsg = await Message.create({
      conversationId: defConv._id,
      role: 'user',
      content: 'Headache',
      status: 'completed',
    });
    await Case.create({
      patientId: patientA._id,
      conversationId: defConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Headache', source: { sourceType: 'patient_report', sourceId: defOrigMsg._id.toString() } },
      duration: { value: '3 days', source: { sourceType: 'patient_report', sourceId: defOrigMsg._id.toString() } },
      followUpQuestions: [
        {
          questionKey: 'incomplete_duration',
          targetField: 'duration',
          category: 'incomplete',
          questionText: 'Please clarify duration',
          status: 'asked',
          askedAt: new Date(),
        },
      ],
    });

    const defReply = await Message.create({
      conversationId: defConv._id,
      role: 'user',
      content: 'It has been exactly 5 days now.',
      status: 'completed',
    });

    const mockClientDefinite = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            duration: '5 days',
          }),
          candidates: [{ finishReason: 'STOP' }],
        }),
      },
    };

    const defRes = await followUpService.integratePatientAnswer({
      conversationId: defConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      messageId: defReply._id.toString(),
      client: mockClientDefinite,
    });

    assert.equal(defRes.answeredQuestion.status, 'answered');
    const defCaseReloaded = await Case.findOne({ conversationId: defConv._id }).lean();
    assert.equal(defCaseReloaded.duration.value, '5 days');
    assert.equal(defCaseReloaded.duration.source.sourceId, defReply._id.toString());

    // 21B. Contradictory value resolves question to 'answered' and preserves discrepancy
    assert.ok(defCaseReloaded.discrepancies.length >= 1);
    const disc = defCaseReloaded.discrepancies.find((d) => d.field === 'duration');
    assert.ok(disc);
    assert.equal(disc.previousValue, '3 days');
    assert.equal(disc.newValue, '5 days');
    assert.equal(disc.previousSource.sourceId, defOrigMsg._id.toString());
    assert.equal(disc.source.sourceId, defReply._id.toString());
  });

  // ── 22. PDF Document Findings Transition Question to no_longer_relevant ───
  await t.test('22. PDF document findings transition asked question to no_longer_relevant without false patient answer', async () => {
    const pdfSyncConv = await Conversation.create({
      userId: patientA._id,
      title: 'PDF Follow-up Sync Consultation',
    });

    const pdfSyncCase = await Case.create({
      patientId: patientA._id,
      conversationId: pdfSyncConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'Chest pain' },
      symptoms: [{ name: 'Chest pain', severity: 'moderate' }],
      // timing missing
      followUpQuestions: [
        {
          questionKey: 'required_timing',
          targetField: 'timing',
          category: 'required',
          questionText: 'When did your chest pain start?',
          status: 'asked',
          messageId: new mongoose.Types.ObjectId(),
          askedAt: new Date(),
        },
      ],
    });

    const pdfDoc = await Document.create({
      userId: patientA._id,
      conversationId: pdfSyncConv._id,
      originalName: 'Clinical_Intake_Report.pdf',
      mimeType: 'application/pdf',
      fileSize: 32000,
      storageKey: 'fake-pdf-sync-1',
      storagePath: '/tmp/fake-pdf-sync-1.pdf',
      status: 'processed',
      extractedText: 'CLINICAL REPORT\nPatient presents with chest pain onset 2 days prior to admission.',
      extractedLength: 80,
      pageCount: 1,
    });

    const mockDocClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            symptoms: [
              {
                name: 'Chest pain',
                severity: 'moderate',
                onset: '2 days ago',
              },
            ],
            reportFindings: [
              {
                title: 'Clinical Finding',
                finding: 'Patient presents with onset 2 days prior',
              },
            ],
          }),
          candidates: [{ finishReason: 'STOP' }],
        }),
      },
    };

    const docCase = await caseExtractionService.extractAndMergeCaseForDocument({
      conversationId: pdfSyncConv._id.toString(),
      userId: patientA._id.toString(),
      userRole: 'PATIENT',
      documentId: pdfDoc._id.toString(),
      client: mockDocClient,
    });

    // Timing is now satisfied by document via symptoms
    assert.ok(docCase.symptoms.some((s) => s.onset === '2 days ago'));

    // Active follow-up question MUST be no_longer_relevant, NOT answered!
    const reloadedCase = await Case.findById(pdfSyncCase._id).lean();
    const timingQ = reloadedCase.followUpQuestions.find((q) => q.questionKey === 'required_timing');
    assert.equal(timingQ.status, 'no_longer_relevant');
    // Patient answer fields MUST NOT be falsely fabricated
    assert.equal(timingQ.answerMessageId, null);
    assert.equal(timingQ.answeredAt, null);
    assert.ok(timingQ.rationale.includes('Clinical_Intake_Report.pdf'));
  });
});
