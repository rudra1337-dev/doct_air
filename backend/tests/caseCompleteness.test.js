import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Conversation from '../src/modules/conversation/models/Conversation.js';
import Case from '../src/modules/case/models/Case.js';
import { generateToken } from '../src/utils/token.js';
import * as completenessService from '../src/modules/case/case.completeness.service.js';

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
    email: 'alice.completeness@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(patientA);

  convA = await Conversation.create({
    userId: patientA._id,
    title: 'Alice Completeness Consultation',
  });

  patientB = await User.create({
    name: 'Bob Patient',
    email: 'bob.completeness@example.com',
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
    email: 'dr.smith.completeness@example.com',
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

test('Case Completeness & Missing Information Engine Test Suite', async (t) => {
  let completeCaseId;
  let incompleteCaseId;

  // ── 1. Case with All Required Information ──────────────────────────────────
  await t.test('1. A case with all required information allows review and marks canSubmitForReview=true', async () => {
    const fullCase = await Case.create({
      patientId: patientA._id,
      conversationId: convA._id,
      status: 'in_progress',
      chiefComplaint: {
        text: 'Acute persistent headache and blurred vision for the past 3 days',
        source: { sourceType: 'patient_report' },
      },
      symptoms: [
        {
          name: 'Headache',
          severity: 'severe',
          location: 'frontal lobe',
          onset: '3 days ago',
          status: 'active',
          source: { sourceType: 'patient_report' },
        },
      ],
      onset: {
        value: '3 days ago',
        source: { sourceType: 'patient_report' },
      },
      duration: {
        value: '72 hours',
        source: { sourceType: 'patient_report' },
      },
      severity: {
        value: 'severe',
        source: { sourceType: 'patient_report' },
      },
      symptomLocation: {
        value: 'forehead and temples',
        source: { sourceType: 'patient_report' },
      },
      medications: [
        {
          name: 'Ibuprofen',
          dosage: '400mg',
          frequency: 'every 8 hours',
          status: 'current',
        },
      ],
      allergies: [
        {
          substance: 'Penicillin',
          reaction: 'Hives',
          severity: 'moderate',
        },
      ],
      relevantMedicalHistory: [
        {
          condition: 'Migraine',
          diagnosedApprox: '2 years ago',
          status: 'active',
        },
      ],
      vitals: [
        {
          bloodPressure: '120/80',
          heartRate: '72',
        },
      ],
    });

    completeCaseId = fullCase._id.toString();

    const evaluation = completenessService.evaluateCaseCompleteness(fullCase);
    assert.equal(evaluation.canSubmitForReview, true);
    assert.equal(evaluation.missingRequiredInformation.length, 0);
    assert.ok(evaluation.completionPercentage >= 80);
    assert.equal(evaluation.discrepancyCount, 0);

    // Call HTTP API endpoint
    const res = await fetch(`${baseUrl}/cases/${completeCaseId}/completeness`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.caseId, completeCaseId);
    assert.equal(body.completeness.canSubmitForReview, true);
    assert.equal(body.completeness.missingRequiredInformation.length, 0);
  });

  // ── 2. Case with Required Information Missing ──────────────────────────────
  await t.test('2. A case with required information missing flags missingRequiredInformation and blocks submission', async () => {
    const sparseCase = await Case.create({
      patientId: patientB._id,
      conversationId: convB._id,
      status: 'in_progress',
      // No chief complaint, no symptoms, no onset, no severity
      medications: [
        {
          name: 'Vitamin D',
          dosage: '1000 IU',
          frequency: 'daily',
        },
      ],
    });

    incompleteCaseId = sparseCase._id.toString();

    const evaluation = completenessService.evaluateCaseCompleteness(sparseCase);
    assert.equal(evaluation.canSubmitForReview, false);
    assert.equal(evaluation.isComplete, false);
    assert.ok(evaluation.missingRequiredInformation.length >= 3);

    const requiredFields = evaluation.missingRequiredInformation.map((m) => m.field);
    assert.ok(requiredFields.includes('chiefComplaint'));
    assert.ok(requiredFields.includes('symptoms'));
    assert.ok(requiredFields.includes('timing'));

    // Attempting to advance status to ready_for_review via HTTP should fail with 400
    const patchRes = await fetch(`${baseUrl}/cases/${incompleteCaseId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ status: 'ready_for_review' }),
    });

    assert.equal(patchRes.status, 400);
    const patchBody = await patchRes.json();
    assert.ok(patchBody.message.includes('required clinical intake information is missing'));
  });

  // ── 3. Case with Optional Information Missing ──────────────────────────────
  await t.test('3. A case with optional information missing permits review but details missing optional items', async () => {
    // Case has required fields (chiefComplaint, symptoms, timing, severity), but lacks allergies and history
    const caseObj = {
      chiefComplaint: { text: 'Sprained left ankle during soccer game' },
      symptoms: [{ name: 'Ankle pain', severity: 'moderate', onset: 'yesterday' }],
      onset: { value: 'yesterday' },
      severity: { value: 'moderate' },
      medications: [],
      allergies: [],
      relevantMedicalHistory: [],
      vitals: [],
      missingInformation: [],
      discrepancies: [],
    };

    const evaluation = completenessService.evaluateCaseCompleteness(caseObj);
    assert.equal(evaluation.canSubmitForReview, true);
    assert.equal(evaluation.missingRequiredInformation.length, 0);
    assert.equal(evaluation.isComplete, false); // Not 100% complete because optional context is missing
    assert.ok(evaluation.missingOptionalInformation.length >= 3);

    const optionalFields = evaluation.missingOptionalInformation.map((o) => o.field);
    assert.ok(optionalFields.includes('allergies'));
    assert.ok(optionalFields.includes('relevantMedicalHistory'));
    assert.ok(optionalFields.includes('medications'));
  });

  // ── 4. Case Containing Unresolved Discrepancies ───────────────────────────
  await t.test('4. A case containing unresolved discrepancies reports them and tracks two-sided assertions', async () => {
    const caseWithDisc = {
      chiefComplaint: { text: 'Abdominal cramps' },
      symptoms: [{ name: 'Stomach pain', severity: 'moderate', onset: '2 days' }],
      onset: { value: '2 days' },
      severity: { value: 'moderate' },
      discrepancies: [
        {
          field: 'onset',
          previousValue: '1 week ago',
          previousSource: { sourceType: 'patient_report', sourceId: 'msg_1' },
          newValue: '2 days ago',
          source: { sourceType: 'patient_report', sourceId: 'msg_4' },
          recordedAt: new Date(),
        },
      ],
    };

    const evaluation = completenessService.evaluateCaseCompleteness(caseWithDisc);
    assert.equal(evaluation.canSubmitForReview, true);
    assert.equal(evaluation.isComplete, false);
    assert.equal(evaluation.discrepancyCount, 1);
    assert.equal(evaluation.unresolvedDiscrepancies.length, 1);
    assert.equal(evaluation.unresolvedDiscrepancies[0].field, 'onset');
    assert.equal(evaluation.unresolvedDiscrepancies[0].previousValue, '1 week ago');
    assert.equal(evaluation.unresolvedDiscrepancies[0].previousSource.sourceType, 'patient_report');
    assert.equal(evaluation.unresolvedDiscrepancies[0].newValue, '2 days ago');
  });

  // ── 5. Case with Incomplete Field Values ──────────────────────────────────
  await t.test('5. A case with incomplete field values identifies partial items without crashing', async () => {
    const caseIncompleteFields = {
      chiefComplaint: { text: 'Cough' }, // Very brief text
      symptoms: [
        {
          name: 'Dry cough',
          severity: 'unspecified', // Incomplete severity
          status: 'unspecified',
        },
      ],
      onset: { value: 'Last night' },
      severity: { value: 'unspecified' },
      medications: [
        {
          name: 'Lisinopril',
          dosage: null, // Incomplete
          frequency: null,
        },
      ],
    };

    const evaluation = completenessService.evaluateCaseCompleteness(caseIncompleteFields);
    assert.ok(evaluation.incompleteFields.length >= 2);
    const incompleteLabels = evaluation.incompleteFields.map((i) => i.label);
    assert.ok(incompleteLabels.some((l) => l.includes('Dry cough')));
    assert.ok(incompleteLabels.some((l) => l.includes('Lisinopril')));
  });

  // ── 6. Case Updated After Earlier Evaluation ──────────────────────────────
  await t.test('6. Updating a case recalculates completeness accurately upon subsequent evaluation', async () => {
    // Sparse case currently cannot submit for review
    const beforeRes = await fetch(`${baseUrl}/cases/${incompleteCaseId}/completeness`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const beforeBody = await beforeRes.json();
    assert.equal(beforeBody.completeness.canSubmitForReview, false);

    // Patient B updates the case with required information
    const updateRes = await fetch(`${baseUrl}/cases/${incompleteCaseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        chiefComplaint: { text: 'Severe right knee swelling following twist' },
        symptoms: [
          {
            name: 'Knee swelling',
            severity: 'severe',
            onset: 'Today morning',
            status: 'active',
          },
        ],
        onset: { value: 'Today morning' },
        severity: { value: 'severe' },
      }),
    });
    assert.equal(updateRes.status, 200);

    // Re-evaluate completeness
    const afterRes = await fetch(`${baseUrl}/cases/${incompleteCaseId}/completeness`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const afterBody = await afterRes.json();
    assert.equal(afterBody.completeness.canSubmitForReview, true);
    assert.equal(afterBody.completeness.missingRequiredInformation.length, 0);
    assert.ok(afterBody.completeness.completionPercentage > beforeBody.completeness.completionPercentage);
  });

  // ── 7. Cross-Patient Access Boundaries ────────────────────────────────────
  await t.test('7. Patient A cannot access Patient B case completeness (rejected with 404)', async () => {
    const forbiddenRes = await fetch(`${baseUrl}/cases/${incompleteCaseId}/completeness`, {
      headers: { Authorization: `Bearer ${tokenA}` }, // Alice on Bob's case
    });

    assert.equal(forbiddenRes.status, 404);
    const body = await forbiddenRes.json();
    assert.equal(body.message, 'Case not found');

    // Clinician CAN access Bob's case completeness
    const docRes = await fetch(`${baseUrl}/cases/${incompleteCaseId}/completeness`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.equal(docRes.status, 200);
    const docBody = await docRes.json();
    assert.equal(docBody.success, true);
  });

  // ── 8. Unauthenticated Request ────────────────────────────────────────────
  await t.test('8. Unauthenticated request to completeness endpoint is rejected with 401', async () => {
    const unauthRes = await fetch(`${baseUrl}/cases/${completeCaseId}/completeness`);
    assert.equal(unauthRes.status, 401);
  });

  // ── 9. Invalid Case Identifier and Nonexistent Case ───────────────────────
  await t.test('9. Invalid case ID format returns 400 and nonexistent ID returns 404', async () => {
    // Invalid mongo ID
    const badIdRes = await fetch(`${baseUrl}/cases/invalid-mongo-id/completeness`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(badIdRes.status, 400);

    // Nonexistent mongo ID
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${baseUrl}/cases/${nonExistentId}/completeness`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(notFoundRes.status, 404);
  });

  // ── 10. Preservation of Existing Case Data During Evaluation ─────────────
  await t.test('10. Evaluating case completeness is read-only and preserves all case data verbatim', async () => {
    const caseBefore = await Case.findById(completeCaseId).lean();

    // Call service evaluation multiple times
    const eval1 = completenessService.evaluateCaseCompleteness(caseBefore);
    const eval2 = completenessService.evaluateCaseCompleteness(caseBefore);

    assert.deepEqual(eval1.missingRequiredInformation, eval2.missingRequiredInformation);
    assert.equal(eval1.completionPercentage, eval2.completionPercentage);

    // Verify DB record unchanged
    const caseAfter = await Case.findById(completeCaseId).lean();
    assert.equal(caseBefore.chiefComplaint.text, caseAfter.chiefComplaint.text);
    assert.equal(caseBefore.symptoms.length, caseAfter.symptoms.length);
    assert.equal(caseBefore.vitals.length, caseAfter.vitals.length);
    assert.equal(caseBefore.status, caseAfter.status);
    assert.equal(caseBefore.updatedAt.getTime(), caseAfter.updatedAt.getTime());
  });

  // ── 11. Explicit Semantics: isComplete vs canSubmitForReview ─────────────
  await t.test('11. Distinction between isComplete and canSubmitForReview is consistent and verifiable', async () => {
    // A: Required fields only -> canSubmitForReview: true, isComplete: false
    const reviewableCase = {
      chiefComplaint: { text: 'Throat pain and difficulty swallowing' },
      symptoms: [{ name: 'Sore throat', severity: 'moderate' }],
      onset: { value: '2 days ago' },
      severity: { value: 'moderate' },
      medications: [],
      allergies: [],
      relevantMedicalHistory: [],
    };
    const evalA = completenessService.evaluateCaseCompleteness(reviewableCase);
    assert.equal(evalA.canSubmitForReview, true);
    assert.equal(evalA.isComplete, false);
    assert.ok(evalA.missingRequiredInformation.length === 0);
    assert.ok(evalA.missingOptionalInformation.length > 0);

    // B: 100% complete case -> canSubmitForReview: true, isComplete: true
    const fullyCompleteCase = {
      chiefComplaint: { text: 'Throat pain and difficulty swallowing' },
      symptoms: [{ name: 'Sore throat', severity: 'moderate', status: 'active', onset: '2 days ago' }],
      onset: { value: '2 days ago' },
      duration: { value: '48 hours' },
      severity: { value: 'moderate' },
      symptomLocation: { value: 'oropharynx' },
      medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'twice daily' }],
      allergies: [{ substance: 'None known', reaction: 'none', severity: 'none' }],
      relevantMedicalHistory: [{ condition: 'Tonsillectomy in childhood', status: 'resolved' }],
      vitals: [{ bloodPressure: '120/80' }],
      associatedSymptoms: [{ name: 'Fever' }],
      timeline: [{ event: 'Started Monday' }],
      discrepancies: [],
    };
    const evalB = completenessService.evaluateCaseCompleteness(fullyCompleteCase);
    assert.equal(evalB.canSubmitForReview, true);
    assert.equal(evalB.isComplete, true);
    assert.equal(evalB.completionPercentage, 100);
    assert.equal(evalB.missingRequiredInformation.length, 0);
    assert.equal(evalB.missingOptionalInformation.length, 0);
    assert.equal(evalB.incompleteFields.length, 0);
    assert.equal(evalB.discrepancyCount, 0);
  });

  // ── 12. Role Permissions on Status Transitions ────────────────────────────
  await t.test('12. Patient cannot mark case as reviewed (403), but Clinician can transition status', async () => {
    // Alice attempts to mark her own case as 'reviewed' -> 403 Forbidden
    const patientReviewRes = await fetch(`${baseUrl}/cases/${completeCaseId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    assert.equal(patientReviewRes.status, 403);
    const patientErr = await patientReviewRes.json();
    assert.ok(patientErr.message.includes('Only clinical professionals'));

    // Clinician updates case status to 'reviewed' -> 200 OK
    const docReviewRes = await fetch(`${baseUrl}/cases/${completeCaseId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDoctor}`,
      },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    assert.equal(docReviewRes.status, 200);
    const docBody = await docReviewRes.json();
    assert.equal(docBody.success, true);
    assert.equal(docBody.case.status, 'reviewed');
    assert.ok(docBody.case.completeness);
  });

  // ── 13. Failed Transition Does Not Corrupt Case Data ──────────────────────
  await t.test('13. Failed status transition does not alter existing case fields', async () => {
    const unreadyConv = await Conversation.create({
      userId: patientB._id,
      title: 'Bob Incomplete Consultation',
    });

    const unreadyCase = await Case.create({
      patientId: patientB._id,
      conversationId: unreadyConv._id,
      status: 'in_progress',
      chiefComplaint: { text: 'General fatigue' },
      // Lacks symptoms, timing, severity
    });

    const caseBefore = await Case.findById(unreadyCase._id).lean();

    // Patient attempts to mark incomplete case as 'ready_for_review' -> 400
    const failRes = await fetch(`${baseUrl}/cases/${unreadyCase._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ status: 'ready_for_review' }),
    });
    assert.equal(failRes.status, 400);

    const caseAfter = await Case.findById(unreadyCase._id).lean();
    assert.equal(caseBefore.status, caseAfter.status);
    assert.equal(caseBefore.updatedAt.getTime(), caseAfter.updatedAt.getTime());
    assert.deepEqual(caseBefore.chiefComplaint, caseAfter.chiefComplaint);
  });

  // ── 14. Edge Cases: Null, Empty Objects, Whitespace Values ────────────────
  await t.test('14. Completeness evaluation is safe and bounded under null, empty, or whitespace inputs', async () => {
    // Null input
    const evalNull = completenessService.evaluateCaseCompleteness(null);
    assert.equal(evalNull.isComplete, false);
    assert.equal(evalNull.canSubmitForReview, false);
    assert.equal(evalNull.completionPercentage, 0);

    // Empty object
    const evalEmpty = completenessService.evaluateCaseCompleteness({});
    assert.equal(evalEmpty.isComplete, false);
    assert.equal(evalEmpty.canSubmitForReview, false);
    assert.equal(evalEmpty.completionPercentage, 0);

    // Whitespace only strings do not satisfy required fields
    const evalWhitespace = completenessService.evaluateCaseCompleteness({
      chiefComplaint: { text: '   ' },
      onset: { value: '  \t ' },
      severity: { value: '   ' },
      symptoms: [],
    });
    assert.equal(evalWhitespace.canSubmitForReview, false);
    const reqFields = evalWhitespace.missingRequiredInformation.map((r) => r.field);
    assert.ok(reqFields.includes('chiefComplaint'));
    assert.ok(reqFields.includes('symptoms'));
    assert.ok(reqFields.includes('timing'));
    assert.ok(reqFields.includes('severity'));
  });
});
