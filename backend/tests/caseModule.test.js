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
    email: 'alice.case@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(patientA);

  convA = await Conversation.create({
    userId: patientA._id,
    title: 'Alice Intake Consultation',
  });

  patientB = await User.create({
    name: 'Bob Patient',
    email: 'bob.case@example.com',
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
    name: 'Dr. Sarah Chen, MD',
    email: 'dr.chen.case@example.com',
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

test('Case Module & Structured Medical Case Foundation Test Suite', async (t) => {
  let createdCaseId = null;

  // 1. Case model validation
  await t.test('1. Case model validation rejects missing required fields and invalid enums', async () => {
    // Missing patientId and conversationId
    const invalidCase = new Case({
      status: 'in_progress',
    });

    await assert.rejects(
      async () => {
        await invalidCase.validate();
      },
      (err) => {
        assert.ok(err.errors.patientId, 'Should have patientId error');
        assert.ok(err.errors.conversationId, 'Should have conversationId error');
        return true;
      }
    );

    // Invalid status enum
    const invalidStatusCase = new Case({
      patientId: patientA._id,
      conversationId: convA._id,
      status: 'cured_and_discharged',
    });

    await assert.rejects(
      async () => {
        await invalidStatusCase.validate();
      },
      (err) => {
        assert.ok(err.errors.status, 'Should reject invalid status enum');
        return true;
      }
    );

    // Text field exceeding limit (> 500 chars)
    const longTextCase = new Case({
      patientId: patientA._id,
      conversationId: convA._id,
      chiefComplaint: {
        text: 'A'.repeat(501),
      },
    });

    await assert.rejects(
      async () => {
        await longTextCase.validate();
      },
      (err) => {
        assert.ok(err.errors['chiefComplaint.text'], 'Should reject text exceeding 500 characters');
        return true;
      }
    );
  });

  // 2. Rejecting unauthorized access
  await t.test('2. Unauthenticated requests to Case endpoints are rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: convA._id.toString() }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 3. Handling conversations without existing cases
  await t.test('3. Retrieving a case for a conversation that has none returns 404', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA._id}/case`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /not found/i);
  });

  // 4. Validating invalid request bodies
  await t.test('4. Reject invalid request bodies on case creation (missing or malformed conversationId)', async () => {
    // Missing conversationId
    const res1 = await fetch(`${baseUrl}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res1.status, 400);

    // Malformed conversationId
    const res2 = await fetch(`${baseUrl}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ conversationId: 'not-a-mongo-id' }),
    });
    assert.equal(res2.status, 400);
  });

  // 5. Successful case creation
  await t.test('5. Successful case creation initializes structured case with source attribution', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA._id}/case`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        chiefComplaint: {
          text: 'Shortness of breath and mild chest discomfort',
          source: {
            sourceType: 'patient_report',
            sourceId: 'msg_001',
          },
        },
        symptoms: [
          {
            name: 'Dyspnea',
            severity: 'moderate',
            location: 'chest',
            onset: '2 days ago',
            status: 'active',
            source: {
              sourceType: 'patient_report',
              sourceId: 'msg_001',
            },
          },
        ],
        vitals: [
          {
            bloodPressure: '130/85 mmHg',
            heartRate: '78 bpm',
            source: {
              sourceType: 'document',
              sourceId: 'doc_vital_01',
            },
          },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.case);
    assert.equal(body.case.patientId, patientA._id.toString());
    assert.equal(body.case.conversationId, convA._id.toString());
    assert.equal(body.case.status, 'in_progress');
    assert.equal(body.case.chiefComplaint.text, 'Shortness of breath and mild chest discomfort');
    assert.equal(body.case.chiefComplaint.source.sourceType, 'patient_report');
    assert.equal(body.case.symptoms.length, 1);
    assert.equal(body.case.symptoms[0].name, 'Dyspnea');
    assert.equal(body.case.vitals.length, 1);
    assert.equal(body.case.vitals[0].bloodPressure, '130/85 mmHg');

    createdCaseId = body.case.id;
  });

  // 6. Duplicate case prevention
  await t.test('6. Duplicate case prevention returns existing case without creating duplicates', async () => {
    // Attempt to initialize case again for convA
    const res = await fetch(`${baseUrl}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ conversationId: convA._id.toString() }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.case.id, createdCaseId);

    // Verify in database: exactly ONE case exists for convA
    const count = await Case.countDocuments({ conversationId: convA._id });
    assert.equal(count, 1, 'Strictly one case document must exist for the conversation');
  });

  // 7. Retrieving a case by conversation
  await t.test('7. Retrieving a case by conversation returns the populated structured case', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA._id}/case`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.case.id, createdCaseId);
    assert.equal(body.case.conversationId, convA._id.toString());
  });

  // 8. Retrieving a case by ID
  await t.test('8. Retrieving a case by ID returns the case for authorized patient', async () => {
    const res = await fetch(`${baseUrl}/cases/${createdCaseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.case.id, createdCaseId);
  });

  // 9. Preventing cross-patient case access
  await t.test('9. Cross-patient case access is strictly rejected with 404', async () => {
    // Patient B attempts to retrieve Patient A's case by ID
    const res1 = await fetch(`${baseUrl}/cases/${createdCaseId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res1.status, 404);

    // Patient B attempts to retrieve Patient A's case via conversation endpoint
    const res2 = await fetch(`${baseUrl}/conversations/${convA._id}/case`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res2.status, 404);

    // Patient B attempts to update Patient A's case
    const res3 = await fetch(`${baseUrl}/cases/${createdCaseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        chiefComplaint: { text: 'Malicious update attempt' },
      }),
    });
    assert.equal(res3.status, 404);
  });

  // 10. Updating permitted fields and preserving source attribution
  await t.test('10. Updating permitted fields updates data and preserves source attribution', async () => {
    const res = await fetch(`${baseUrl}/cases/${createdCaseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        onset: {
          value: '3 days ago during morning exercise',
          source: {
            sourceType: 'patient_report',
            sourceId: 'msg_002',
          },
        },
        duration: 'Persistent for 72 hours',
        medications: [
          {
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'daily',
            status: 'current',
            source: {
              sourceType: 'patient_report',
              sourceId: 'msg_003',
            },
          },
        ],
        allergies: [
          {
            substance: 'Penicillin',
            reaction: 'Rash',
            severity: 'moderate',
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.case.onset.value, '3 days ago during morning exercise');
    assert.equal(body.case.onset.source.sourceType, 'patient_report');
    assert.equal(body.case.duration.value, 'Persistent for 72 hours');
    assert.equal(body.case.medications.length, 1);
    assert.equal(body.case.medications[0].name, 'Lisinopril');
    assert.equal(body.case.allergies.length, 1);
    assert.equal(body.case.allergies[0].substance, 'Penicillin');

    // Verify existing chiefComplaint was preserved (not overwritten by absent fields)
    assert.equal(body.case.chiefComplaint.text, 'Shortness of breath and mild chest discomfort');
    assert.equal(body.case.chiefComplaint.source.sourceType, 'patient_report');
  });

  // 11. Preventing patient/conversation ownership changes
  await t.test('11. Modifying patientId or conversationId via update is rejected with 400', async () => {
    const res1 = await fetch(`${baseUrl}/cases/${createdCaseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        patientId: patientB._id.toString(),
      }),
    });
    assert.equal(res1.status, 400);

    const res2 = await fetch(`${baseUrl}/cases/${createdCaseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        conversationId: convB._id.toString(),
      }),
    });
    assert.equal(res2.status, 400);
  });

  // 12. Updating lifecycle status
  await t.test('12. Lifecycle status transitions: Patient marks ready_for_review; only Clinician marks reviewed', async () => {
    // Patient advances case to ready_for_review
    const res1 = await fetch(`${baseUrl}/cases/${createdCaseId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'ready_for_review' }),
    });

    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.case.status, 'ready_for_review');

    // Patient attempts to mark case as reviewed (forbidden: requires clinician)
    const res2 = await fetch(`${baseUrl}/cases/${createdCaseId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'reviewed' }),
    });

    assert.equal(res2.status, 403);
    const body2 = await res2.json();
    assert.equal(body2.success, false);

    // Doctor marks case as reviewed (permitted)
    const res3 = await fetch(`${baseUrl}/cases/${createdCaseId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDoctor}`,
      },
      body: JSON.stringify({ status: 'reviewed' }),
    });

    assert.equal(res3.status, 200);
    const body3 = await res3.json();
    assert.equal(body3.case.status, 'reviewed');
  });

  // 13. Listing cases with role-based scoping
  await t.test('13. GET /api/cases lists cases with strict patient isolation and professional scope', async () => {
    // 1. Unauthenticated request is rejected with 401
    const resUnauth = await fetch(`${baseUrl}/cases`);
    assert.equal(resUnauth.status, 401);

    // 2. Patient A retrieves their cases: receives Case A
    const resPatientA = await fetch(`${baseUrl}/cases`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resPatientA.status, 200);
    const bodyA = await resPatientA.json();
    assert.equal(bodyA.success, true);
    assert.ok(Array.isArray(bodyA.cases));
    assert.ok(bodyA.cases.length >= 1);
    assert.ok(bodyA.cases.every((c) => c.patientId === patientA._id.toString()));

    // 3. Patient B retrieves their cases: Patient A's case is NEVER returned
    const resPatientB = await fetch(`${baseUrl}/cases`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(resPatientB.status, 200);
    const bodyB = await resPatientB.json();
    assert.equal(bodyB.success, true);
    assert.ok(Array.isArray(bodyB.cases));
    assert.ok(!bodyB.cases.some((c) => c.id === createdCaseId));

    // 4. Clinician retrieves cases: receives all cases including Case A
    const resClinician = await fetch(`${baseUrl}/cases`, {
      headers: { Authorization: `Bearer ${tokenDoctor}` },
    });
    assert.equal(resClinician.status, 200);
    const bodyDoc = await resClinician.json();
    assert.equal(bodyDoc.success, true);
    assert.ok(Array.isArray(bodyDoc.cases));
    assert.ok(bodyDoc.cases.some((c) => c.id === createdCaseId));
  });
});
