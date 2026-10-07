import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Conversation from '../src/modules/conversation/models/Conversation.js';
import Document from '../src/modules/document/models/Document.js';
import { generateToken } from '../src/utils/token.js';
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from '../src/config/env.js';

let mongod;
let server;
let baseUrl;

let userA;
let tokenA;
let convA;

let userB;
let tokenB;

test.before(async () => {
  // 1. Start MongoMemoryServer
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // 2. Start HTTP server on ephemeral port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;

  // 3. Seed users
  userA = await User.create({
    name: 'Patient Alice',
    email: 'alice@example.com',
    passwordHash: 'hashed_password',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(userA);

  userB = await User.create({
    name: 'Patient Bob',
    email: 'bob@example.com',
    passwordHash: 'hashed_password',
    role: 'PATIENT',
    isActive: true,
  });
  tokenB = generateToken(userB);

  // 4. Seed conversation belonging to userA
  convA = await Conversation.create({
    userId: userA._id,
    title: 'Alice Checkup',
  });
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('Document Module Test Suite', async (t) => {
  let createdDocId = null;
  let createdDiskPath = null;

  await t.test('1. Unauthenticated upload is rejected with 401', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'report.pdf');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /authentication required/i);
  });

  await t.test('2. Upload to another user conversation is rejected with 404', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'report.pdf');

    // User B attempting to upload to User A's conversation
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
      body: formData,
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /conversation not found/i);
  });

  await t.test('3. Non-PDF file upload is rejected with 400', async () => {
    const formData = new FormData();
    const txtBlob = new Blob(['plain text'], { type: 'text/plain' });
    formData.append('file', txtBlob, 'notes.txt');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: formData,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /only pdf documents are supported/i);
  });

  await t.test('4. Missing file in request is rejected with 400', async () => {
    const formData = new FormData();
    formData.append('title', 'missing file');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: formData,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /no pdf file was uploaded/i);
  });

  await t.test('5. Empty file (0 bytes) is rejected with 400', async () => {
    const formData = new FormData();
    const emptyBlob = new Blob([], { type: 'application/pdf' });
    formData.append('file', emptyBlob, 'empty.pdf');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: formData,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /empty/i);
  });

  await t.test('6. Valid PDF is accepted and persisted with sanitized metadata', async () => {
    const formData = new FormData();
    const content = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
    const pdfBlob = new Blob([content], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'Blood_Test_Results.pdf');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.document);
    assert.equal(body.document.originalName, 'Blood_Test_Results.pdf');
    assert.equal(body.document.mimeType, 'application/pdf');
    assert.equal(body.document.conversationId, convA.id);
    assert.equal(body.document.userId, userA.id);
    assert.equal(body.document.status, 'uploaded');

    // Security assertions: internal storage paths must NOT be leaked
    assert.equal(body.document.storagePath, undefined);
    assert.equal(body.document.storageKey, undefined);

    createdDocId = body.document.id;

    // Verify database record
    const dbDoc = await Document.findById(createdDocId);
    assert.ok(dbDoc);
    assert.equal(dbDoc.originalName, 'Blood_Test_Results.pdf');
    assert.ok(dbDoc.storagePath);
    createdDiskPath = dbDoc.storagePath;

    // Verify file actually exists on disk with safe generated name
    assert.ok(fs.existsSync(createdDiskPath));
    assert.notEqual(path.basename(createdDiskPath), 'Blood_Test_Results.pdf');
  });

  await t.test('7. Listing documents for conversation (authorized owner)', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.documents));
    assert.equal(body.documents.length, 1);
    assert.equal(body.documents[0].id, createdDocId);
    assert.equal(body.documents[0].originalName, 'Blood_Test_Results.pdf');
    assert.equal(body.documents[0].storagePath, undefined);
  });

  await t.test('8. Listing documents for another user conversation is rejected with 404', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /conversation not found/i);
  });

  await t.test('9. Deleting document by unauthorized user is rejected with 404', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);

    // Verify file is still on disk
    assert.ok(fs.existsSync(createdDiskPath));
  });

  await t.test('10. Deleting document by authorized owner cleans up file and record', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /deleted successfully/i);

    // Verify metadata deleted from database
    const dbDoc = await Document.findById(createdDocId);
    assert.equal(dbDoc, null);

    // Verify file deleted from disk
    assert.equal(fs.existsSync(createdDiskPath), false);
  });

  const VALID_TEXT_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 44 >> stream
BT
/F1 24 Tf
100 700 Td
(Patient Blood Pressure: 120/80) Tj
ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000242 00000 n 
0000000315 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
408
%%EOF`;

  const TEXTLESS_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
185
%%EOF`;

  let processedDocId = null;

  await t.test('11. Uploading text-based PDF processes text and transitions to processed', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([VALID_TEXT_PDF], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'Lab_Report.pdf');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    processedDocId = body.document.id;

    // Wait briefly for asynchronous processor to complete text extraction
    let docRecord = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 50));
      docRecord = await Document.findById(processedDocId);
      if (docRecord && (docRecord.status === 'processed' || docRecord.status === 'failed')) {
        break;
      }
    }

    assert.ok(docRecord);
    assert.equal(docRecord.status, 'processed');
    assert.equal(docRecord.extractedText, 'Patient Blood Pressure: 120/80');
    assert.equal(docRecord.pageCount, 1);
    assert.equal(docRecord.extractedLength, 'Patient Blood Pressure: 120/80'.length);
    assert.equal(docRecord.processingError, null);
    assert.ok(docRecord.processingCompletedAt);
  });

  await t.test('12. Authorized owner retrieves processed document via GET endpoint', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents/${processedDocId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.document);
    assert.equal(body.document.id, processedDocId);
    assert.equal(body.document.status, 'processed');
    assert.equal(body.document.extractedText, 'Patient Blood Pressure: 120/80');
    assert.equal(body.document.pageCount, 1);

    // Security check: internal storage secrets are never exposed
    assert.equal(body.document.storagePath, undefined);
    assert.equal(body.document.storageKey, undefined);
  });

  await t.test('13. Unauthorized user cannot access document details (rejected with 404)', async () => {
    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents/${processedDocId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /conversation not found/i);
  });

  await t.test('14. Uploading textless PDF marks status as failed with descriptive explanation', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([TEXTLESS_PDF], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'Scanned_Xray.pdf');

    const res = await fetch(`${baseUrl}/conversations/${convA.id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    const textlessDocId = body.document.id;

    // Wait briefly for processor to run
    let docRecord = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 50));
      docRecord = await Document.findById(textlessDocId);
      if (docRecord && (docRecord.status === 'processed' || docRecord.status === 'failed')) {
        break;
      }
    }

    assert.ok(docRecord);
    assert.equal(docRecord.status, 'failed');
    assert.equal(docRecord.extractedText, null);
    assert.match(docRecord.processingError, /scanned or image-only/i);

    // Clean up
    if (docRecord.storagePath && fs.existsSync(docRecord.storagePath)) {
      await fs.promises.unlink(docRecord.storagePath);
    }
    await Document.findByIdAndDelete(textlessDocId);
  });

  await t.test('15. Retrying processing via POST /retry re-runs text extraction for owner', async () => {
    const res = await fetch(
      `${baseUrl}/conversations/${convA.id}/documents/${processedDocId}/retry`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      }
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.document);
    assert.equal(body.document.status, 'processed');
    assert.equal(body.document.extractedText, 'Patient Blood Pressure: 120/80');
  });

  await t.test('16. Unauthorized retry request is rejected with 404', async () => {
    const res = await fetch(
      `${baseUrl}/conversations/${convA.id}/documents/${processedDocId}/retry`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      }
    );

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // Final cleanup for processedDocId
  const finalDoc = await Document.findById(processedDocId);
  if (finalDoc?.storagePath && fs.existsSync(finalDoc.storagePath)) {
    await fs.promises.unlink(finalDoc.storagePath);
  }
  await Document.findByIdAndDelete(processedDocId);
});
