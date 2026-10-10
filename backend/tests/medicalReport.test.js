import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Conversation from '../src/modules/conversation/models/Conversation.js';
import Message from '../src/modules/conversation/models/Message.js';
import Document from '../src/modules/document/models/Document.js';
import Case from '../src/modules/case/models/Case.js';
import MedicalReport from '../src/modules/case/models/MedicalReport.js';
import { generateToken } from '../src/utils/token.js';
import * as caseReportService from '../src/modules/case/case.report.service.js';

let mongod;
let server;
let baseUrl;

let patientA;
let tokenA;
let convA;
let caseA;

let patientB;
let tokenB;
let convB;
let caseB;

let doctor;
let tokenDoctor;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  // Create Patient A
  patientA = await User.create({
    name: 'Alice Patient',
    email: 'alice.report@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(patientA);

  convA = await Conversation.create({
    userId: patientA._id,
    title: 'Alice Migraine Consultation',
  });

  // Create messages for Conv A
  await Message.create({
    conversationId: convA._id,
    role: 'user',
    content: 'I have had a severe throbbing headache for 3 days with nausea.',
  });

  await Message.create({
    conversationId: convA._id,
    role: 'assistant',
    content: 'I understand. Where is the headache located?',
  });

  await Message.create({
    conversationId: convA._id,
    role: 'user',
    content: 'It is concentrated on the right side behind my eye.',
  });

  // Create Case A with complete clinical intake data
  caseA = await Case.create({
    patientId: patientA._id,
    conversationId: convA._id,
    status: 'in_progress',
    chiefComplaint: {
      text: 'Severe throbbing right-sided headache with nausea',
      source: {
        sourceType: 'patient_report',
        sourceId: 'msg-1',
        recordedAt: new Date('2026-10-01T10:00:00Z'),
      },
    },
    symptoms: [
      {
        name: 'Right-sided headache',
        severity: 'severe',
        location: 'Right frontal/retro-orbital',
        onset: '3 days ago',
        duration: '72 hours continuous',
        status: 'active',
        source: {
          sourceType: 'patient_report',
          sourceId: 'msg-1',
        },
      },
      {
        name: 'Nausea',
        severity: 'moderate',
        onset: '2 days ago',
        status: 'active',
        source: {
          sourceType: 'patient_report',
          sourceId: 'msg-1',
        },
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
      value: 'Right frontal/retro-orbital',
      source: { sourceType: 'patient_report' },
    },
    associatedSymptoms: [
      { name: 'Photophobia' },
      { name: 'Nausea' },
    ],
    relevantMedicalHistory: [
      {
        condition: 'Migraine with aura',
        diagnosedApprox: '2022-05-10',
        status: 'active',
        source: { sourceType: 'patient_report' },
      },
    ],
    medications: [
      {
        name: 'Sumatriptan',
        dosage: '50mg',
        frequency: 'as needed',
        status: 'current',
        source: { sourceType: 'patient_report' },
      },
    ],
    allergies: [
      {
        substance: 'Penicillin',
        reaction: 'Hives and itching',
        severity: 'moderate',
        source: { sourceType: 'patient_report' },
      },
    ],
    vitals: [
      {
        bloodPressure: '120/80',
        heartRate: '76',
        temperature: '98.6 F',
        recordedAt: new Date('2026-10-03T09:00:00Z'),
        source: { sourceType: 'clinician' },
      },
    ],
    timeline: [
      {
        event: 'Initial visual aura noted',
        occurredAt: '2026-10-01T08:00:00Z',
        source: { sourceType: 'patient_report' },
      },
    ],
    discrepancies: [
      {
        field: 'onset',
        previousValue: 'Started yesterday',
        previousSource: {
          sourceType: 'patient_report',
          sourceId: 'msg-prev',
        },
        newValue: 'Started 3 days ago',
        source: {
          sourceType: 'patient_report',
          sourceId: 'msg-curr',
        },
        recordedAt: new Date('2026-10-02T15:00:00Z'),
      },
    ],
    followUpQuestions: [
      {
        questionKey: 'symptom.headache.location',
        targetField: 'symptomLocation',
        category: 'required',
        questionText: 'Where specifically is the headache located?',
        status: 'answered',
        answerText: 'Right side behind my eye',
        askedAt: new Date('2026-10-01T10:05:00Z'),
        answeredAt: new Date('2026-10-01T10:07:00Z'),
      },
    ],
  });

  // Attach a processed document to Conv A
  const docA = await Document.create({
    conversationId: convA._id,
    userId: patientA._id,
    originalName: 'Brain_MRI_Report.pdf',
    storageKey: 'mri_123.pdf',
    storagePath: '/uploads/mri_123.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    pageCount: 2,
    status: 'processed',
    extractedText: 'Normal brain MRI without acute intracranial abnormality.',
  });

  // Add report finding referencing docA
  caseA.reportFindings = [
    {
      title: 'MRI Brain Without Contrast',
      finding: 'Normal brain MRI without acute intracranial abnormality.',
      documentId: docA._id,
      source: {
        sourceType: 'document',
        sourceId: docA._id.toString(),
      },
    },
  ];
  await caseA.save();

  // Create Patient B (with incomplete case)
  patientB = await User.create({
    name: 'Bob Patient',
    email: 'bob.report@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenB = generateToken(patientB);

  convB = await Conversation.create({
    userId: patientB._id,
    title: 'Bob Consultation',
  });

  // Case B has chief complaint but NO symptoms or timing (incomplete consultation)
  caseB = await Case.create({
    patientId: patientB._id,
    conversationId: convB._id,
    status: 'in_progress',
    chiefComplaint: {
      text: 'Mild fatigue',
    },
    symptoms: [],
  });

  // Create Clinician User
  doctor = await User.create({
    name: 'Dr. Gregory House',
    email: 'dr.house.report@example.com',
    passwordHash: 'hashed_pw',
    role: 'PROFESSIONAL',
    isActive: true,
  });
  tokenDoctor = generateToken(doctor);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  await new Promise((resolve) => server.close(resolve));
});

test('1. Generates complete Medical Intake Report with all 12 sections and ready status', async () => {
  const res = await fetch(`${baseUrl}/cases/conversation/${convA._id}/report/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.report);

  const report = data.report;
  assert.equal(report.status, 'ready');
  assert.equal(report.version, 1);
  assert.equal(report.isLatest, true);

  // Check 12 Sections
  const { sections } = report;
  assert.ok(sections);

  // 1. Consultation Overview
  assert.equal(sections.consultationOverview.status, 'ready');
  assert.equal(sections.consultationOverview.version, 1);
  assert.ok(sections.consultationOverview.summaryText.includes('Severe throbbing right-sided headache'));

  // 2. Chief Complaint
  assert.equal(sections.chiefComplaint.text, 'Severe throbbing right-sided headache with nausea');
  assert.equal(sections.chiefComplaint.source.sourceType, 'patient_report');

  // 3. Symptoms
  assert.equal(sections.symptoms.length, 2);
  assert.equal(sections.symptoms[0].name, 'Right-sided headache');
  assert.equal(sections.symptoms[0].severity, 'severe');

  // 4. Relevant Medical History
  assert.equal(sections.relevantMedicalHistory.length, 1);
  assert.equal(sections.relevantMedicalHistory[0].condition, 'Migraine with aura');

  // 5. Medications
  assert.equal(sections.medications.status, 'recorded');
  assert.equal(sections.medications.items.length, 1);
  assert.equal(sections.medications.items[0].name, 'Sumatriptan');

  // 6. Allergies
  assert.equal(sections.allergies.status, 'recorded');
  assert.equal(sections.allergies.items.length, 1);
  assert.equal(sections.allergies.items[0].substance, 'Penicillin');

  // 7. Vitals
  assert.equal(sections.vitals.length, 1);
  assert.equal(sections.vitals[0].bloodPressure, '120/80');

  // 8. Documents and Findings
  assert.equal(sections.medicalDocumentsAndFindings.documents.length, 1);
  assert.equal(sections.medicalDocumentsAndFindings.documents[0].originalName, 'Brain_MRI_Report.pdf');
  assert.equal(sections.medicalDocumentsAndFindings.findings.length, 1);
  assert.equal(sections.medicalDocumentsAndFindings.findings[0].title, 'MRI Brain Without Contrast');

  // 9. Timeline
  assert.ok(sections.medicalTimeline.length > 0);
  assert.ok(sections.medicalTimeline.some((t) => t.event.includes('Initial visual aura noted')));

  // 10. Discrepancies
  assert.equal(sections.discrepancies.length, 1);
  assert.equal(sections.discrepancies[0].field, 'onset');
  assert.equal(sections.discrepancies[0].previousValue, 'Started yesterday');
  assert.equal(sections.discrepancies[0].previousSource.sourceType, 'patient_report');
  assert.equal(sections.discrepancies[0].newValue, 'Started 3 days ago');

  // 11. Missing and Incomplete Information
  assert.ok(sections.missingAndIncompleteInformation);
  assert.equal(sections.missingAndIncompleteInformation.followUpQuestions.length, 1);
  assert.equal(sections.missingAndIncompleteInformation.followUpQuestions[0].status, 'answered');

  // 12. Source References
  assert.ok(sections.sourceReferences.messages.length > 0);
  assert.equal(sections.sourceReferences.documents.length, 1);
});

test('2. Incomplete consultation generates a clearly labeled draft report without rejection', async () => {
  const res = await fetch(`${baseUrl}/cases/conversation/${convB._id}/report/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.report.status, 'draft');
  assert.equal(data.report.completenessSnapshot.canSubmitForReview, false);
  assert.ok(data.report.sections.missingAndIncompleteInformation.missingRequired.length > 0);
});

test('3. Timeline builder correctly orders known dates and preserves relative dates without inventing timestamps', () => {
  const mockCase = {
    timeline: [
      { event: 'Visit to urgent care', occurredAt: '2026-10-02T14:30:00Z' },
      { event: 'Symptom started', occurredAt: '3 days ago' },
      { event: 'Childhood measles', occurredAt: 'in childhood' },
      { event: 'First documented aura', occurredAt: '2026-09-30T10:00:00Z' },
    ],
    symptoms: [
      { name: 'Headache', onset: 'yesterday' },
      { name: 'Fever', onset: '2026-10-01' },
    ],
  };

  const timeline = caseReportService.buildMedicalTimeline(mockCase);

  // Check that dated events come before approximate ones and are ascending
  const firstDated = timeline[0];
  const secondDated = timeline[1];
  assert.ok(new Date(firstDated.sortDate) <= new Date(secondDated.sortDate));

  // Check approximate events
  const approx = timeline.filter((e) => e.isApproximate);
  assert.ok(approx.some((e) => e.occurredAt === '3 days ago'));
  assert.ok(approx.some((e) => e.occurredAt === 'in childhood'));
  assert.ok(approx.every((e) => e.sortDate === null)); // Never fabricated timestamp
});

test('4. Retrieve latest report via GET /api/cases/conversation/:conversationId/report', async () => {
  const res = await fetch(`${baseUrl}/cases/conversation/${convA._id}/report`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.report.conversationId, convA._id.toString());
  assert.equal(data.report.status, 'ready');
});

test('5. Retrieve latest report via GET /api/cases/:id/report', async () => {
  const res = await fetch(`${baseUrl}/cases/${caseA._id}/report`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.report.caseId, caseA._id.toString());
});

test('6. Regeneration increments version number and archives previous latest', async () => {
  const res = await fetch(`${baseUrl}/cases/conversation/${convA._id}/report/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.report.version, 2);
  assert.equal(data.report.isLatest, true);

  // Check that version 1 is no longer marked isLatest
  const v1 = await MedicalReport.findOne({ conversationId: convA._id, version: 1 });
  assert.equal(v1.isLatest, false);
});

test('7. Cross-patient authorization isolation: Patient B cannot access Patient A report', async () => {
  const res = await fetch(`${baseUrl}/cases/conversation/${convA._id}/report`, {
    headers: {
      Authorization: `Bearer ${tokenB}`,
    },
  });

  assert.equal(res.status, 404);
});

test('8. Cross-patient authorization isolation: Patient B cannot regenerate Patient A report', async () => {
  const res = await fetch(`${baseUrl}/cases/conversation/${convA._id}/report/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
    },
  });

  assert.equal(res.status, 404);
});

test('9. Professional user can access Patient A report', async () => {
  const res = await fetch(`${baseUrl}/cases/${caseA._id}/report`, {
    headers: {
      Authorization: `Bearer ${tokenDoctor}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.report.caseId, caseA._id.toString());
});

test('10. Conversation alias routes (GET/POST /api/conversations/:id/case/report) function identically', async () => {
  const res = await fetch(`${baseUrl}/conversations/${convA._id}/case/report`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.report.conversationId, convA._id.toString());
});
