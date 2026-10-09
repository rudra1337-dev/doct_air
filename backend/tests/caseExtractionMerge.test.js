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
import { generateToken } from '../src/utils/token.js';
import * as caseExtractor from '../src/modules/case/case.extractor.js';
import * as caseMerge from '../src/modules/case/case.merge.js';
import * as caseExtractionService from '../src/modules/case/case.extraction.service.js';
import { streamUserMessageWithAI } from '../src/modules/conversation/conversation.service.js';

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

const createMockExtractionClient = (responsePayload) => {
  let capturedRequest = null;
  return {
    getCapturedRequest: () => capturedRequest,
    models: {
      generateContent: async (req) => {
        capturedRequest = req;
        const textOutput =
          typeof responsePayload === 'string'
            ? responsePayload
            : JSON.stringify(responsePayload);
        return {
          text: textOutput,
          candidates: [{ finishReason: 'STOP' }],
        };
      },
    },
  };
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  patientA = await User.create({
    name: 'Alice Extraction',
    email: 'alice.extract@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(patientA);

  convA = await Conversation.create({
    userId: patientA._id,
    title: 'Alice Intake Consult',
  });

  patientB = await User.create({
    name: 'Bob Extraction',
    email: 'bob.extract@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenB = generateToken(patientB);

  convB = await Conversation.create({
    userId: patientB._id,
    title: 'Bob Consult',
  });

  doctor = await User.create({
    name: 'Dr. James Wilson',
    email: 'dr.wilson@example.com',
    passwordHash: 'hashed_pw',
    role: 'PROFESSIONAL',
    isActive: true,
  });
  tokenDoctor = generateToken(doctor);
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('Step 4.2 & Step 4.3: Structured Clinical Extraction and Safe Merge Test Suite', async (t) => {
  // ── 1. Structured Candidate Extraction ────────────────────────────────────
  await t.test('1. Message containing clear symptoms produces structured candidate with source attribution', async () => {
    const messageId = new mongoose.Types.ObjectId();
    const mockOutput = {
      chiefComplaint: 'Throbbing headache and slight nausea',
      symptoms: [
        {
          name: 'Throbbing headache',
          severity: 'moderate',
          location: 'frontal forehead',
          onset: '2 days ago',
          status: 'active',
        },
      ],
      onset: '2 days ago',
      severity: 'moderate',
      symptomLocation: 'frontal forehead',
      allergies: [
        {
          substance: 'Penicillin',
          reaction: 'Hives and itching',
          severity: 'moderate',
        },
      ],
    };

    const validated = caseExtractor.parseAndValidateExtractionOutput(
      JSON.stringify(mockOutput),
      messageId
    );

    assert.equal(validated.chiefComplaint.text, 'Throbbing headache and slight nausea');
    assert.equal(validated.chiefComplaint.source.sourceType, 'patient_report');
    assert.equal(validated.chiefComplaint.source.sourceId, messageId.toString());
    assert.equal(validated.chiefComplaint.source.confidence, null);

    assert.equal(validated.symptoms.length, 1);
    assert.equal(validated.symptoms[0].name, 'Throbbing headache');
    assert.equal(validated.symptoms[0].severity, 'moderate');
    assert.equal(validated.symptoms[0].location, 'frontal forehead');
    assert.equal(validated.symptoms[0].source.sourceId, messageId.toString());

    assert.equal(validated.allergies.length, 1);
    assert.equal(validated.allergies[0].substance, 'Penicillin');
    assert.equal(validated.allergies[0].source.sourceId, messageId.toString());
  });

  // ── 2. Markdown Code-Fence Cleaning and Malformed JSON Recovery ───────────
  await t.test('2. Handles markdown code fences and rejects malformed JSON safely without crashing', async () => {
    const messageId = new mongoose.Types.ObjectId();
    const fencedJson = '```json\n{"chiefComplaint": "Back pain", "symptoms": [{"name": "Lower back pain", "severity": "mild"}]}\n```';

    const parsed = caseExtractor.parseAndValidateExtractionOutput(fencedJson, messageId);
    assert.equal(parsed.chiefComplaint.text, 'Back pain');
    assert.equal(parsed.symptoms[0].name, 'Lower back pain');
    assert.equal(parsed.symptoms[0].severity, 'mild');

    // Completely malformed JSON throws MALFORMED_EXTRACTION_OUTPUT so failures are not marked as processed
    assert.throws(
      () => caseExtractor.parseAndValidateExtractionOutput('NOT VALID JSON {{{', messageId),
      /Malformed extraction JSON output/
    );
  });

  // ── 3. Sanitizes Invalid Enums & Rejects Fabricated Confidences ──────────
  await t.test('3. Fallbacks invalid enums to unspecified and does not fabricate confidence scores', async () => {
    const messageId = new mongoose.Types.ObjectId();
    const payloadWithInvalidEnums = {
      symptoms: [
        {
          name: 'Cough',
          severity: 'EXTREME_DANGER', // Invalid enum
          status: 'unknown_status', // Invalid enum
        },
      ],
      relevantMedicalHistory: [
        {
          condition: 'Asthma',
          status: 'invalid_history_status',
        },
      ],
    };

    const validated = caseExtractor.parseAndValidateExtractionOutput(
      JSON.stringify(payloadWithInvalidEnums),
      messageId
    );

    assert.equal(validated.symptoms[0].severity, 'unspecified');
    assert.equal(validated.symptoms[0].status, 'unspecified');
    assert.equal(validated.relevantMedicalHistory[0].status, 'unspecified');
    assert.equal(validated.symptoms[0].source.confidence, null);
  });

  // ── 4. Assistant-Generated Messages Not Attributed to Patient ─────────────
  await t.test('4. Assistant messages are never attributed to patient and skip extraction', async () => {
    const assistantMessage = {
      _id: new mongoose.Types.ObjectId(),
      role: 'assistant',
      content: 'Could you tell me if you have any chest pain or dizziness?',
    };

    const result = await caseExtractor.extractStructuredCaseFromMessage({
      messages: [assistantMessage],
      targetMessage: assistantMessage,
    });

    assert.deepEqual(result, {});
  });

  // ── 5. End-to-End Extraction and Non-Destructive Initial Merge ───────────
  await t.test('5. End-to-end extraction merges new clinical facts into Case with message attribution', async () => {
    const msg1 = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'I have had a dull lower back pain for 3 days, severity about 5/10. I also take Metformin 500mg daily.',
    });

    const mockAiClient = createMockExtractionClient({
      chiefComplaint: 'Dull lower back pain',
      symptoms: [
        {
          name: 'Lower back pain',
          severity: 'moderate',
          duration: '3 days',
          status: 'active',
        },
      ],
      duration: '3 days',
      severity: 'moderate',
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'daily',
          status: 'current',
        },
      ],
    });

    const updatedCase = await caseExtractionService.extractAndMergeCaseForConversation({
      conversationId: convA._id,
      userId: patientA._id,
      userRole: 'PATIENT',
      messageId: msg1._id,
      client: mockAiClient,
    });

    assert.ok(updatedCase);
    assert.equal(updatedCase.chiefComplaint.text, 'Dull lower back pain');
    assert.equal(updatedCase.chiefComplaint.source.sourceId, msg1._id.toString());
    assert.equal(updatedCase.symptoms.length, 1);
    assert.equal(updatedCase.symptoms[0].name, 'Lower back pain');
    assert.equal(updatedCase.symptoms[0].severity, 'moderate');
    assert.equal(updatedCase.medications.length, 1);
    assert.equal(updatedCase.medications[0].name, 'Metformin');
    assert.equal(updatedCase.medications[0].dosage, '500mg');
    assert.ok(updatedCase.processedMessageIds.some((id) => id.toString() === msg1._id.toString()));
  });

  // ── 6. Preserves Existing Facts When Subsequent Extraction Omits Them ───────
  await t.test('6. Follow-up extraction preserves existing fields when candidate omits them', async () => {
    const msg2 = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'I also noticed stiffness in the morning.',
    });

    // Mock response only mentions stiffness; omits chiefComplaint and medications
    const mockAiClient = createMockExtractionClient({
      symptoms: [
        {
          name: 'Morning stiffness',
          severity: 'mild',
          status: 'active',
        },
      ],
    });

    const updatedCase = await caseExtractionService.extractAndMergeCaseForConversation({
      conversationId: convA._id,
      userId: patientA._id,
      userRole: 'PATIENT',
      messageId: msg2._id,
      client: mockAiClient,
    });

    // Existing chiefComplaint and Metformin medication remain intact
    assert.equal(updatedCase.chiefComplaint.text, 'Dull lower back pain');
    assert.equal(updatedCase.medications.length, 1);
    assert.equal(updatedCase.medications[0].name, 'Metformin');

    // New symptom is appended
    assert.equal(updatedCase.symptoms.length, 2);
    const symNames = updatedCase.symptoms.map((s) => s.name);
    assert.ok(symNames.includes('Lower back pain'));
    assert.ok(symNames.includes('Morning stiffness'));

    // Both message IDs are recorded
    assert.ok(updatedCase.processedMessageIds.includes(msg2._id.toString()));
  });

  // ── 7. Deduplication of Existing Symptoms, Medications, and Allergies ────
  await t.test('7. Deduplicates array items non-destructively and updates fields without duplicates', async () => {
    const msg3 = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'The lower back pain is radiating to my right hip.',
    });

    // Mock re-extracts "Lower back pain" with additional location
    const mockAiClient = createMockExtractionClient({
      symptoms: [
        {
          name: 'Lower back pain',
          location: 'right hip',
          severity: 'moderate',
          status: 'active',
        },
      ],
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'twice daily', // updated frequency
          status: 'current',
        },
      ],
    });

    const updatedCase = await caseExtractionService.extractAndMergeCaseForConversation({
      conversationId: convA._id,
      userId: patientA._id,
      userRole: 'PATIENT',
      messageId: msg3._id,
      client: mockAiClient,
    });

    // Symptoms count remains 2 (not duplicated)
    assert.equal(updatedCase.symptoms.length, 2);
    const backPainSym = updatedCase.symptoms.find((s) => s.name === 'Lower back pain');
    assert.equal(backPainSym.location, 'right hip');

    // Medications count remains 1, frequency updated
    assert.equal(updatedCase.medications.length, 1);
    assert.equal(updatedCase.medications[0].frequency, 'twice daily');
  });

  // ── 8. Preserves Conflicting Claims in Discrepancies ───────────────────────
  await t.test('8. Competing/conflicting statements are preserved in discrepancies without clinical guesswork', async () => {
    const msg4 = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'Actually, the pain started 2 weeks ago, not 3 days ago. And it is severe now.',
    });

    const mockAiClient = createMockExtractionClient({
      duration: '2 weeks ago',
      severity: 'severe',
    });

    const updatedCase = await caseExtractionService.extractAndMergeCaseForConversation({
      conversationId: convA._id,
      userId: patientA._id,
      userRole: 'PATIENT',
      messageId: msg4._id,
      client: mockAiClient,
    });

    // Current scalar fields updated to latest report
    assert.equal(updatedCase.duration.value, '2 weeks ago');
    assert.equal(updatedCase.severity.value, 'severe');

    // Historical conflicts recorded in discrepancies
    assert.ok(updatedCase.discrepancies.length >= 2);
    const durationDisc = updatedCase.discrepancies.find((d) => d.field === 'duration');
    assert.ok(durationDisc);
    assert.equal(durationDisc.previousValue, '3 days');
    assert.equal(durationDisc.newValue, '2 weeks ago');
    assert.ok(durationDisc.previousSource);
    assert.equal(durationDisc.previousSource.sourceType, 'patient_report');
    assert.ok(durationDisc.source);
    assert.equal(durationDisc.source.sourceType, 'patient_report');

    const severityDisc = updatedCase.discrepancies.find((d) => d.field === 'severity');
    assert.ok(severityDisc);
    assert.equal(severityDisc.previousValue, 'moderate');
    assert.equal(severityDisc.newValue, 'severe');
    assert.ok(severityDisc.previousSource);
    assert.equal(severityDisc.previousSource.sourceType, 'patient_report');
  });

  // ── 9. Strict Idempotency Check ──────────────────────────────────────────
  await t.test('9. Repeated extraction of the same message is strictly idempotent (no duplicates)', async () => {
    const caseBefore = await Case.findOne({ conversationId: convA._id });
    const symptomsCountBefore = caseBefore.symptoms.length;
    const discrepanciesCountBefore = caseBefore.discrepancies.length;

    // Repeated run with msg4
    const caseAfter = await caseExtractionService.extractAndMergeCaseForConversation({
      conversationId: convA._id,
      userId: patientA._id,
      userRole: 'PATIENT',
      messageId: caseBefore.processedMessageIds[0], // Already processed message
      client: createMockExtractionClient({ duration: '2 weeks ago' }),
    });

    assert.equal(caseAfter.symptoms.length, symptomsCountBefore);
    assert.equal(caseAfter.discrepancies.length, discrepanciesCountBefore);
  });

  // ── 10. Gemini Failure Does Not Corrupt Existing Case ─────────────────────
  await t.test('10. Gemini service failure does not corrupt or delete existing Case facts', async () => {
    const msg5 = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'I also tried taking ibuprofen.',
    });

    const failingClient = {
      models: {
        generateContent: async () => {
          const err = new Error('Gemini API rate limit exceeded');
          err.statusCode = 429;
          throw err;
        },
      },
    };

    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForConversation({
          conversationId: convA._id,
          userId: patientA._id,
          userRole: 'PATIENT',
          messageId: msg5._id,
          client: failingClient,
        });
      },
      (err) => {
        assert.ok(err.message.includes('rate limit'));
        return true;
      }
    );

    // Case remains completely intact
    const preservedCase = await Case.findOne({ conversationId: convA._id });
    assert.equal(preservedCase.chiefComplaint.text, 'Dull lower back pain');
    assert.equal(preservedCase.symptoms.length, 2);
    // msg5 was NOT marked as processed, so it can be retried cleanly
    assert.ok(!preservedCase.processedMessageIds.some((id) => id.toString() === msg5._id.toString()));
  });

  // ── 11. Optimistic Concurrency and Version Conflict Retry ─────────────────
  await t.test('11. Optimistic concurrency retry resolves version collisions safely', async () => {
    const caseDoc = await Case.findOne({ conversationId: convA._id });
    const dummyMessageId = new mongoose.Types.ObjectId();

    const candidateData = {
      timeline: [
        {
          event: 'Patient started heating pad application',
          occurredAt: 'Yesterday evening',
        },
      ],
    };

    // Simulate parallel version bump in DB
    await Case.updateOne({ _id: caseDoc._id }, { $inc: { __v: 1 } });

    // saveCaseWithRetry handles the VersionError and re-applies
    const saved = await caseMerge.saveCaseWithRetry(
      caseDoc,
      candidateData,
      dummyMessageId,
      3
    );

    assert.ok(saved);
    const updated = await Case.findById(caseDoc._id);
    const timelineEvent = updated.timeline.find(
      (t) => t.event === 'Patient started heating pad application'
    );
    assert.ok(timelineEvent);
  });

  // ── 12. Cross-Patient & Cross-Conversation Security Boundaries ────────────
  await t.test('12. Rejects cross-conversation message references and unauthorized patient access', async () => {
    // 1. Message from Conv B passed to Conv A
    const msgFromB = await Message.create({
      conversationId: convB._id,
      role: 'user',
      content: 'Bob has a sprained ankle.',
    });

    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForConversation({
          conversationId: convA._id,
          userId: patientA._id,
          userRole: 'PATIENT',
          messageId: msgFromB._id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    // 2. Patient A trying to trigger extraction on Patient B's conversation
    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForConversation({
          conversationId: convB._id,
          userId: patientA._id,
          userRole: 'PATIENT',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  // ── 13. Case Extraction API Endpoint ──────────────────────────────────────
  await t.test('13. HTTP API endpoint POST /api/conversations/:id/case/extract triggers extraction with auth', async () => {
    const msg6 = await Message.create({
      conversationId: convB._id,
      role: 'user',
      content: 'Bob sprained his right ankle playing basketball.',
    });

    // 1. Unauthorized request is rejected
    const unauthRes = await fetch(`${baseUrl}/conversations/${convB._id}/case/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msg6._id.toString() }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. Cross-patient request (Alice on Bob's conv) is rejected
    const forbiddenRes = await fetch(`${baseUrl}/conversations/${convB._id}/case/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ messageId: msg6._id.toString() }),
    });
    assert.equal(forbiddenRes.status, 404);

    // 3. Authorized request by Bob succeeds (skips live AI if no API key in test environment)
    const authRes = await fetch(`${baseUrl}/conversations/${convB._id}/case/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ messageId: msg6._id.toString() }),
    });
    assert.equal(authRes.status, 200);
    const body = await authRes.json();
    assert.equal(body.success, true);
    assert.equal(body.case.conversationId, convB._id.toString());
  });

  // ── 14. SSE Streaming Integration Non-Interference ────────────────────────
  await t.test('14. User message streaming lifecycle dispatches SSE and triggers non-blocking extraction', async () => {
    let messageStarted = false;
    let messageCompleted = false;
    let deltasReceived = 0;

    const mockStreamClient = {
      models: {
        generateContentStream: async () => {
          return (async function* () {
            yield { text: 'I understand your ', candidates: [{ finishReason: null }] };
            yield { text: 'concerns about back pain.', candidates: [{ finishReason: 'STOP' }] };
          })();
        },
      },
    };

    const result = await streamUserMessageWithAI({
      conversationId: convA._id,
      userId: patientA._id,
      content: 'Does applying heat help with muscle spasms?',
      client: mockStreamClient,
      onMessageStart: () => {
        messageStarted = true;
      },
      onMessageDelta: () => {
        deltasReceived++;
      },
      onMessageComplete: () => {
        messageCompleted = true;
      },
    });

    assert.equal(messageStarted, true);
    assert.equal(messageCompleted, true);
    assert.equal(deltasReceived, 2);
    assert.equal(result.userMessage.content, 'Does applying heat help with muscle spasms?');
    assert.equal(result.assistantMessage.content, 'I understand your concerns about back pain.');
  });
});
