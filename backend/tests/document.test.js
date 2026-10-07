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
});
