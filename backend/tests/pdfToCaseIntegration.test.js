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
import { generateToken } from '../src/utils/token.js';
import * as caseExtractionService from '../src/modules/case/case.extraction.service.js';
import * as caseExtractor from '../src/modules/case/case.extractor.js';
import * as documentService from '../src/modules/document/document.service.js';

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

const createMockDocAiClient = (responsePayload) => {
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
    name: 'Alice Document',
    email: 'alice.pdfcase@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(patientA);

  convA = await Conversation.create({
    userId: patientA._id,
    title: 'Alice Medical Intake',
  });

  patientB = await User.create({
    name: 'Bob Document',
    email: 'bob.pdfcase@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenB = generateToken(patientB);

  convB = await Conversation.create({
    userId: patientB._id,
    title: 'Bob Medical Intake',
  });

  doctor = await User.create({
    name: 'Dr. Gregory House',
    email: 'dr.house@example.com',
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

test('Step 4.4 & Step 4.5: PDF-to-Case Integration and End-to-End Workflow Test Suite', async (t) => {
  // ── 1. Successfully Processed PDF Contributes Findings to Case ─────────────
  await t.test('1. Successfully processed PDF extracts report findings and clinical facts with document attribution', async () => {
    const docA = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'CBC_Lab_Report.pdf',
      mimeType: 'application/pdf',
      fileSize: 45000,
      storageKey: 'storage-cbc-1',
      storagePath: '/tmp/fake-cbc-1.pdf',
      status: 'processed',
      extractedText: 'LABORATORY REPORT\nPatient: Alice\nCBC Results:\nHemoglobin: 13.8 g/dL (Normal)\nWhite Blood Cells: 6.5 x10^3/uL\nPlatelets: 250 x10^3/uL\nAllergies: Penicillin (Moderate rash)\nCurrent Meds: Lisinopril 10mg daily',
      extractedLength: 200,
      pageCount: 1,
    });

    const mockAiClient = createMockDocAiClient({
      reportFindings: [
        {
          title: 'Complete Blood Count (CBC)',
          finding: 'Hemoglobin 13.8 g/dL (Normal), WBC 6.5 x10^3/uL, Platelets 250 x10^3/uL',
        },
      ],
      allergies: [
        {
          substance: 'Penicillin',
          reaction: 'Moderate rash',
          severity: 'moderate',
        },
      ],
      medications: [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'daily',
          status: 'current',
        },
      ],
    });

    const updatedCase = await caseExtractionService.extractAndMergeCaseForDocument({
      conversationId: convA._id,
      userId: patientA._id,
      userRole: 'PATIENT',
      documentId: docA._id,
      client: mockAiClient,
    });

    assert.ok(updatedCase);
    assert.equal(updatedCase.conversationId.toString(), convA._id.toString());
    assert.equal(updatedCase.patientId.toString(), patientA._id.toString());

    // Verify report findings provenance
    assert.equal(updatedCase.reportFindings.length, 1);
    assert.equal(updatedCase.reportFindings[0].title, 'Complete Blood Count (CBC)');
    assert.equal(updatedCase.reportFindings[0].documentId.toString(), docA._id.toString());
    assert.equal(updatedCase.reportFindings[0].source.sourceType, 'document');
    assert.equal(updatedCase.reportFindings[0].source.sourceId, docA._id.toString());
    assert.equal(updatedCase.reportFindings[0].source.confidence, null);

    // Verify allergies extracted from document
    assert.equal(updatedCase.allergies.length, 1);
    assert.equal(updatedCase.allergies[0].substance, 'Penicillin');
    assert.equal(updatedCase.allergies[0].source.sourceType, 'document');
    assert.equal(updatedCase.allergies[0].source.sourceId, docA._id.toString());

    // Verify medications extracted from document
    assert.equal(updatedCase.medications.length, 1);
    assert.equal(updatedCase.medications[0].name, 'Lisinopril');
    assert.equal(updatedCase.medications[0].source.sourceType, 'document');
    assert.equal(updatedCase.medications[0].source.sourceId, docA._id.toString());

    // Verify document marked in processedDocumentIds
    assert.ok(updatedCase.processedDocumentIds.map((id) => id.toString()).includes(docA._id.toString()));
  });

  // ── 2. Unprocessed, Failed, or Empty-Text Documents are Rejected ────────────
  await t.test('2. Unprocessed, failed, or textless documents are rejected without modifying Case', async () => {
    // A: In-flight processing document
    const docProcessing = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'Processing.pdf',
      mimeType: 'application/pdf',
      fileSize: 10000,
      storageKey: 'storage-processing-1',
      storagePath: '/tmp/fake-proc-1.pdf',
      status: 'processing',
    });

    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForDocument({
          conversationId: convA._id,
          userId: patientA._id,
          documentId: docProcessing._id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('still processing'));
        return true;
      }
    );

    // B: Failed text extraction document
    const docFailed = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'ScannedImage.pdf',
      mimeType: 'application/pdf',
      fileSize: 10000,
      storageKey: 'storage-failed-1',
      storagePath: '/tmp/fake-fail-1.pdf',
      status: 'failed',
      processingError: 'NO_EXTRACTABLE_TEXT',
    });

    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForDocument({
          conversationId: convA._id,
          userId: patientA._id,
          documentId: docFailed._id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('NO_EXTRACTABLE_TEXT'));
        return true;
      }
    );

    // C: Empty extracted text document
    const docEmptyText = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'Empty.pdf',
      mimeType: 'application/pdf',
      fileSize: 10000,
      storageKey: 'storage-empty-1',
      storagePath: '/tmp/fake-empty-1.pdf',
      status: 'processed',
      extractedText: '   ',
    });

    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForDocument({
          conversationId: convA._id,
          userId: patientA._id,
          documentId: docEmptyText._id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('no extractable text'));
        return true;
      }
    );
  });

  // ── 3. Strict Idempotency for Document Processing ────────────────────────
  await t.test('3. Reprocessing the same document is strictly idempotent and does not duplicate findings', async () => {
    const existingCase = await Case.findOne({ conversationId: convA._id });
    const findingsCountBefore = existingCase.reportFindings.length;
    const processedDocId = existingCase.processedDocumentIds[0];

    const caseAfter = await caseExtractionService.extractAndMergeCaseForDocument({
      conversationId: convA._id,
      userId: patientA._id,
      documentId: processedDocId,
      client: createMockDocAiClient({
        reportFindings: [{ title: 'Duplicate Attempt', finding: 'Should not be added' }],
      }),
    });

    assert.equal(caseAfter.reportFindings.length, findingsCountBefore);
  });

  // ── 4. Cross-Patient & Cross-Conversation Document Security ───────────────
  await t.test('4. Cross-patient and cross-conversation document extraction requests are rejected with 404', async () => {
    // Document belonging to Bob in Conv B
    const docBob = await Document.create({
      userId: patientB._id,
      conversationId: convB._id,
      originalName: 'Bob_XRay.pdf',
      mimeType: 'application/pdf',
      fileSize: 20000,
      storageKey: 'storage-bob-xray',
      storagePath: '/tmp/fake-bob.pdf',
      status: 'processed',
      extractedText: 'X-Ray of Right Ankle: No fracture identified.',
      extractedLength: 45,
    });

    // 1. Patient A attempting to extract Bob's document into Alice's Case (cross-conversation document)
    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForDocument({
          conversationId: convA._id,
          userId: patientA._id,
          userRole: 'PATIENT',
          documentId: docBob._id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    // 2. Patient A attempting to extract Bob's document directly in Bob's conversation (unauthorized patient)
    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForDocument({
          conversationId: convB._id,
          userId: patientA._id,
          userRole: 'PATIENT',
          documentId: docBob._id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  // ── 5. Mixed-Source Integration: Conversation Messages + PDF Documents ──
  await t.test('5. Mixed-source integration: Patient messages and PDF findings coexist with distinct provenance', async () => {
    // Step A: Patient reports subjective symptoms in chat
    const patientMsg = await Message.create({
      conversationId: convA._id,
      role: 'user',
      content: 'I have severe fatigue and dizziness for 2 weeks. I do not have any known drug allergies.',
    });

    const msgAiClient = createMockDocAiClient({
      chiefComplaint: 'Severe fatigue and dizziness',
      symptoms: [
        {
          name: 'Fatigue',
          severity: 'severe',
          duration: '2 weeks',
          status: 'active',
        },
        {
          name: 'Dizziness',
          severity: 'moderate',
          status: 'active',
        },
      ],
      severity: 'severe',
      duration: '2 weeks',
    });

    await caseExtractionService.extractAndMergeCaseForConversation({
      conversationId: convA._id,
      userId: patientA._id,
      messageId: patientMsg._id,
      client: msgAiClient,
    });

    // Step B: Upload and process a new Lipid Panel report
    const docLipid = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'Lipid_Panel.pdf',
      mimeType: 'application/pdf',
      fileSize: 32000,
      storageKey: 'storage-lipid-1',
      storagePath: '/tmp/fake-lipid.pdf',
      status: 'processed',
      extractedText: 'Lipid Profile:\nTotal Cholesterol: 240 mg/dL (High)\nHDL: 45 mg/dL\nLDL: 160 mg/dL (High)\nTriglycerides: 175 mg/dL',
      extractedLength: 120,
    });

    const docAiClient = createMockDocAiClient({
      reportFindings: [
        {
          title: 'Lipid Panel',
          finding: 'Total Cholesterol 240 mg/dL (High), LDL 160 mg/dL (High)',
        },
      ],
      vitals: [
        {
          bloodPressure: '135/85',
          heartRate: '78',
        },
      ],
    });

    const mixedCase = await caseExtractionService.extractAndMergeCaseForDocument({
      conversationId: convA._id,
      userId: patientA._id,
      documentId: docLipid._id,
      client: docAiClient,
    });

    // 1. Patient-reported facts retain patient message source
    const fatigueSym = mixedCase.symptoms.find((s) => s.name === 'Fatigue');
    assert.ok(fatigueSym);
    assert.equal(fatigueSym.source.sourceType, 'patient_report');
    assert.equal(fatigueSym.source.sourceId, patientMsg._id.toString());

    // 2. Document findings retain document source
    const lipidFinding = mixedCase.reportFindings.find((rf) => rf.title === 'Lipid Panel');
    assert.ok(lipidFinding);
    assert.equal(lipidFinding.source.sourceType, 'document');
    assert.equal(lipidFinding.source.sourceId, docLipid._id.toString());
    assert.equal(lipidFinding.documentId.toString(), docLipid._id.toString());

    // 3. Document vitals retain document source
    assert.ok(mixedCase.vitals.length >= 1);
    const vital = mixedCase.vitals[mixedCase.vitals.length - 1];
    assert.equal(vital.bloodPressure, '135/85');
    assert.equal(vital.source.sourceType, 'document');
    assert.equal(vital.source.sourceId, docLipid._id.toString());

    // 4. Both message and document are tracked in respective processed IDs
    assert.ok(mixedCase.processedMessageIds.map((id) => id.toString()).includes(patientMsg._id.toString()));
    assert.ok(mixedCase.processedDocumentIds.map((id) => id.toString()).includes(docLipid._id.toString()));
  });

  // ── 6. Contradictions Between Report and Patient Claim Preserved in Discrepancies ──
  await t.test('6. Contradictions between patient statements and report findings are preserved without guesswork', async () => {
    // Current duration is '2 weeks' from patientMsg above.
    // An emergency discharge summary document states symptom duration was '3 months'.
    const docDischarge = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'Clinical_Summary.pdf',
      mimeType: 'application/pdf',
      fileSize: 28000,
      storageKey: 'storage-discharge-1',
      storagePath: '/tmp/fake-discharge.pdf',
      status: 'processed',
      extractedText: 'Clinical Summary: Patient reports symptoms ongoing for 3 months.',
      extractedLength: 70,
    });

    const docAiClient = createMockDocAiClient({
      duration: '3 months',
    });

    const updatedCase = await caseExtractionService.extractAndMergeCaseForDocument({
      conversationId: convA._id,
      userId: patientA._id,
      documentId: docDischarge._id,
      client: docAiClient,
    });

    // Current scalar updated to latest observation
    assert.equal(updatedCase.duration.value, '3 months');
    assert.equal(updatedCase.duration.source.sourceType, 'document');

    // Competing claim preserved in discrepancies with document attribution
    const discrepancy = updatedCase.discrepancies.find((d) => d.field === 'duration');
    assert.ok(discrepancy);
    assert.equal(discrepancy.previousValue, '2 weeks');
    assert.ok(discrepancy.previousSource);
    assert.equal(discrepancy.previousSource.sourceType, 'patient_report');
    assert.equal(discrepancy.newValue, '3 months');
    assert.equal(discrepancy.source.sourceType, 'document');
    assert.equal(discrepancy.source.sourceId, docDischarge._id.toString());
  });

  // ── 7. Model Malformation or Failure During Document Extraction Handled Safely ──
  await t.test('7. Malformed Gemini output or service failure during doc extraction preserves Case and allows retry', async () => {
    const docRetry = await Document.create({
      userId: patientA._id,
      conversationId: convA._id,
      originalName: 'RetryDoc.pdf',
      mimeType: 'application/pdf',
      fileSize: 15000,
      storageKey: 'storage-retry-doc',
      storagePath: '/tmp/fake-retry.pdf',
      status: 'processed',
      extractedText: 'Test Report for Retry Handling',
      extractedLength: 30,
    });

    // Attempt 1: Gemini returns malformed output
    const malformedClient = createMockDocAiClient('NOT JSON AT ALL {{{');

    await assert.rejects(
      async () => {
        await caseExtractionService.extractAndMergeCaseForDocument({
          conversationId: convA._id,
          userId: patientA._id,
          documentId: docRetry._id,
          client: malformedClient,
        });
      },
      (err) => {
        assert.equal(err.code, 'MALFORMED_EXTRACTION_OUTPUT');
        return true;
      }
    );

    // Verify document was NOT marked as processed in processedDocumentIds
    const caseAfterFailure = await Case.findOne({ conversationId: convA._id });
    assert.ok(!caseAfterFailure.processedDocumentIds.map((id) => id.toString()).includes(docRetry._id.toString()));

    // Attempt 2: Retry with valid client succeeds cleanly
    const successClient = createMockDocAiClient({
      reportFindings: [
        {
          title: 'Retry Finding',
          finding: 'Extracted successfully upon retry',
        },
      ],
    });

    const retriedCase = await caseExtractionService.extractAndMergeCaseForDocument({
      conversationId: convA._id,
      userId: patientA._id,
      documentId: docRetry._id,
      client: successClient,
    });

    assert.ok(retriedCase.processedDocumentIds.map((id) => id.toString()).includes(docRetry._id.toString()));
    const finding = retriedCase.reportFindings.find((rf) => rf.title === 'Retry Finding');
    assert.ok(finding);
  });

  // ── 8. HTTP API Endpoint for Document Extraction ─────────────────────────
  await t.test('8. HTTP endpoint POST /api/conversations/:id/case/documents/:docId/extract triggers extraction with auth', async () => {
    const docBobHttp = await Document.create({
      userId: patientB._id,
      conversationId: convB._id,
      originalName: 'Bob_Blood_Test.pdf',
      mimeType: 'application/pdf',
      fileSize: 22000,
      storageKey: 'storage-bob-http',
      storagePath: '/tmp/fake-bob-http.pdf',
      status: 'processed',
      extractedText: 'Blood Test Results for Bob: Fasting Glucose 95 mg/dL (Normal).',
      extractedLength: 60,
    });

    // 1. Unauthenticated request is rejected with 401
    const unauthRes = await fetch(
      `${baseUrl}/conversations/${convB._id}/case/documents/${docBobHttp._id}/extract`,
      {
        method: 'POST',
      }
    );
    assert.equal(unauthRes.status, 401);

    // 2. Cross-patient request (Alice on Bob's document) rejected with 404
    const forbiddenRes = await fetch(
      `${baseUrl}/conversations/${convB._id}/case/documents/${docBobHttp._id}/extract`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      }
    );
    assert.equal(forbiddenRes.status, 404);

    // 3. Authorized request by Bob succeeds (skips live AI in test env without API key)
    const authRes = await fetch(
      `${baseUrl}/conversations/${convB._id}/case/documents/${docBobHttp._id}/extract`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      }
    );
    assert.equal(authRes.status, 200);
    const body = await authRes.json();
    assert.equal(body.success, true);
    assert.equal(body.case.conversationId, convB._id.toString());
  });

  // ── 9. Ownership Immutability and Lifecycle Permissions ───────────────────
  await t.test('9. Extraction preserves case lifecycle status and ownership immutability', async () => {
    const caseDoc = await Case.findOne({ conversationId: convA._id });

    // Status was not altered by any of the document extractions
    assert.equal(caseDoc.status, 'in_progress');
    assert.equal(caseDoc.patientId.toString(), patientA._id.toString());
    assert.equal(caseDoc.conversationId.toString(), convA._id.toString());
  });
});
