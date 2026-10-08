import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Conversation from '../src/modules/conversation/models/Conversation.js';
import Message from '../src/modules/conversation/models/Message.js';
import Document from '../src/modules/document/models/Document.js';
import DraftAttachment from '../src/modules/attachment/models/DraftAttachment.js';
import { generateToken } from '../src/utils/token.js';
import { streamUserMessageWithAI } from '../src/modules/conversation/conversation.service.js';

let mongod;
let server;
let baseUrl;

let userA;
let tokenA;
let convA;

let userB;
let tokenB;
let convB;

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

const createMockAiClient = (responseChunks = ['Based on your report, blood pressure is normal.']) => {
  let capturedRequest = null;
  return {
    getCapturedRequest: () => capturedRequest,
    models: {
      generateContentStream: async (req) => {
        capturedRequest = req;
        return (async function* () {
          for (const chunk of responseChunks) {
            yield { text: chunk, candidates: [{ finishReason: null }] };
          }
          yield { text: '', candidates: [{ finishReason: 'STOP' }] };
        })();
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

  userA = await User.create({
    name: 'Alice Patient',
    email: 'alice.attachment@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenA = generateToken(userA);

  convA = await Conversation.create({
    userId: userA._id,
    title: 'Alice Checkup',
  });

  userB = await User.create({
    name: 'Bob Patient',
    email: 'bob.attachment@example.com',
    passwordHash: 'hashed_pw',
    role: 'PATIENT',
    isActive: true,
  });
  tokenB = generateToken(userB);

  convB = await Conversation.create({
    userId: userB._id,
    title: 'Bob Checkup',
  });
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('Draft Attachment & Send Commit Test Suite', async (t) => {
  let draftIdA = null;
  let draftDiskPathA = null;

  await t.test('1. Unauthenticated draft upload is rejected with 401', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([VALID_TEXT_PDF], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'vitals.pdf');

    const res = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(res.status, 401);
  });

  await t.test('2. Non-PDF draft upload is rejected with 400', async () => {
    const formData = new FormData();
    const txtBlob = new Blob(['Not a PDF'], { type: 'text/plain' });
    formData.append('file', txtBlob, 'notes.txt');

    const res = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formData,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /only pdf/i);
  });

  await t.test('3. Valid PDF draft is uploaded into temporary storage', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob([VALID_TEXT_PDF], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'vitals.pdf');
    formData.append('conversationId', convA._id.toString());

    const res = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.attachment?.id);
    assert.equal(body.attachment.originalName, 'vitals.pdf');
    assert.equal(body.attachment.status, 'uploaded');
    assert.equal(body.attachment.storagePath, undefined); // Secure: not exposed in JSON

    draftIdA = body.attachment.id;

    // Verify record in Mongo
    const dbDraft = await DraftAttachment.findById(draftIdA);
    assert.ok(dbDraft);
    assert.equal(dbDraft.status, 'uploaded');
    assert.equal(dbDraft.userId.toString(), userA._id.toString());
    assert.ok(fs.existsSync(dbDraft.storagePath));
    draftDiskPathA = dbDraft.storagePath;
  });

  await t.test('4. User B cannot access User A draft attachment', async () => {
    const res = await fetch(`${baseUrl}/attachments/draft/${draftIdA}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert.equal(res.status, 404);
  });

  await t.test('5. User B cannot delete User A draft attachment', async () => {
    const res = await fetch(`${baseUrl}/attachments/draft/${draftIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert.equal(res.status, 404);
    assert.ok(fs.existsSync(draftDiskPathA));
  });

  await t.test('6. User A deletes a draft before sending (cancels/removes)', async () => {
    // Upload a draft to delete
    const formData = new FormData();
    const pdfBlob = new Blob([VALID_TEXT_PDF], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'removable.pdf');

    const uploadRes = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    const uploadBody = await uploadRes.json();
    const toDeleteId = uploadBody.attachment.id;

    const dbDraft = await DraftAttachment.findById(toDeleteId);
    const tempPath = dbDraft.storagePath;
    assert.ok(fs.existsSync(tempPath));

    // Delete it
    const delRes = await fetch(`${baseUrl}/attachments/draft/${toDeleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(delRes.status, 200);
    const delBody = await delRes.json();
    assert.equal(delBody.success, true);

    // Verify DB record and file on disk are gone
    assert.equal(await DraftAttachment.findById(toDeleteId), null);
    assert.equal(fs.existsSync(tempPath), false);
  });

  await t.test('7. Sending message with draft attachment commits it into permanent document', async () => {
    // We already have draftIdA from test 3
    const mockAi = createMockAiClient(['Your blood pressure reading looks good.']);

    const result = await streamUserMessageWithAI({
      conversationId: convA._id.toString(),
      userId: userA._id.toString(),
      content: 'Here are my latest vitals.',
      attachmentIds: [draftIdA],
      client: mockAi,
    });

    // 1. Verify user message has attachment details
    const userMsg = await Message.findById(result.userMessage.id || result.userMessage._id);
    assert.ok(userMsg);
    assert.equal(userMsg.attachments.length, 1);
    assert.equal(userMsg.attachments[0].originalName, 'vitals.pdf');
    const committedDocId = userMsg.attachments[0].documentId;

    // 2. Verify permanent Document was created
    const doc = await Document.findById(committedDocId);
    assert.ok(doc);
    assert.equal(doc.status, 'processed');
    assert.equal(doc.messageId.toString(), userMsg._id.toString());
    assert.equal(doc.conversationId.toString(), convA._id.toString());
    assert.equal(doc.userId.toString(), userA._id.toString());
    assert.ok(doc.extractedText.includes('Patient Blood Pressure: 120/80'));
    assert.ok(fs.existsSync(doc.storagePath));

    // 3. Verify draft was transitioned to committed
    const dbDraft = await DraftAttachment.findById(draftIdA);
    assert.ok(dbDraft);
    assert.equal(dbDraft.status, 'committed');
    assert.equal(dbDraft.committedDocumentId.toString(), doc._id.toString());

    // 4. Verify AI request contained the document context
    const req = mockAi.getCapturedRequest();
    assert.ok(req);
    const firstPrompt = req.contents[0].parts[0].text;
    assert.ok(firstPrompt.includes('MEDICAL REPORT CONTEXT'));
    assert.ok(firstPrompt.includes('vitals.pdf'));
    assert.ok(firstPrompt.includes('Patient Blood Pressure: 120/80'));
  });

  await t.test('8. PDF-only send (empty text prompt) succeeds and creates valid message + AI context', async () => {
    // Upload a new draft for PDF-only send
    const formData = new FormData();
    const pdfBlob = new Blob([VALID_TEXT_PDF], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'pdf_only_report.pdf');

    const uploadRes = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    const { attachment } = await uploadRes.json();

    const mockAi = createMockAiClient(['Summary of blood pressure report.']);

    const result = await streamUserMessageWithAI({
      conversationId: convA._id.toString(),
      userId: userA._id.toString(),
      content: '', // Empty text
      attachmentIds: [attachment.id],
      client: mockAi,
    });

    const userMsg = await Message.findById(result.userMessage.id || result.userMessage._id);
    assert.ok(userMsg);
    assert.equal(userMsg.content, '');
    assert.equal(userMsg.attachments.length, 1);
    assert.equal(userMsg.attachments[0].originalName, 'pdf_only_report.pdf');

    // Verify AI received fallback clinical prompt + document context
    const req = mockAi.getCapturedRequest();
    const userPart = req.contents[req.contents.length - 1].parts[0].text;
    assert.ok(userPart.includes('Please review and summarize the attached medical report(s).'));
  });

  await t.test('9. Text + Multiple PDF attachments commit all files and include all in AI context', async () => {
    // Upload draft 1
    const form1 = new FormData();
    form1.append('file', new Blob([VALID_TEXT_PDF], { type: 'application/pdf' }), 'report_alpha.pdf');
    const res1 = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: form1,
    });
    const { attachment: att1 } = await res1.json();

    // Upload draft 2
    const form2 = new FormData();
    form2.append('file', new Blob([VALID_TEXT_PDF], { type: 'application/pdf' }), 'report_beta.pdf');
    const res2 = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: form2,
    });
    const { attachment: att2 } = await res2.json();

    const mockAi = createMockAiClient(['Analysis of both alpha and beta reports.']);

    const result = await streamUserMessageWithAI({
      conversationId: convA._id.toString(),
      userId: userA._id.toString(),
      content: 'Comparing reports.',
      attachmentIds: [att1.id, att2.id],
      client: mockAi,
    });

    const userMsg = await Message.findById(result.userMessage.id || result.userMessage._id);
    assert.equal(userMsg.attachments.length, 2);

    const req = mockAi.getCapturedRequest();
    const promptText = req.contents[0].parts[0].text;
    assert.ok(promptText.includes('report_alpha.pdf'));
    assert.ok(promptText.includes('report_beta.pdf'));
  });

  await t.test('10. Sending with an unauthorized or already committed draft is rejected', async () => {
    // Try sending with draftIdA which is already committed
    await assert.rejects(
      async () => {
        await streamUserMessageWithAI({
          conversationId: convA._id.toString(),
          userId: userA._id.toString(),
          content: 'Retrying committed draft',
          attachmentIds: [draftIdA],
        });
      },
      (err) => {
        assert.match(err.message, /not in uploaded state/i);
        return true;
      }
    );

    // Try sending draft belonging to User A from User B
    const formB = new FormData();
    formB.append('file', new Blob([VALID_TEXT_PDF], { type: 'application/pdf' }), 'b_report.pdf');
    const resB = await fetch(`${baseUrl}/attachments/draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formB,
    });
    const { attachment: userADraft } = await resB.json();

    await assert.rejects(
      async () => {
        await streamUserMessageWithAI({
          conversationId: convB._id.toString(),
          userId: userB._id.toString(),
          content: 'Bob trying to steal Alice draft',
          attachmentIds: [userADraft.id],
        });
      },
      (err) => {
        assert.match(err.message, /unauthorized/i);
        return true;
      }
    );
  });

  await t.test('11. Follow-up message in Conv A without attachments still receives Conv A document context', async () => {
    const mockAi = createMockAiClient(['Following up on your vitals report.']);

    // Send a message with NO attachments or documentIds
    await streamUserMessageWithAI({
      conversationId: convA._id.toString(),
      userId: userA._id.toString(),
      content: 'Can you summarize what you saw earlier?',
      client: mockAi,
    });

    const req = mockAi.getCapturedRequest();
    assert.ok(req, 'AI request should be captured');
    const promptText = req.contents[0].parts[0].text;
    // Conv A had vitals.pdf and report_alpha/beta committed earlier
    assert.ok(
      promptText.includes('vitals.pdf') || promptText.includes('report_alpha.pdf'),
      'AI context should retain previously committed documents for Conv A'
    );
  });

  await t.test('12. Independent Conv C receives NO document context from Conv A', async () => {
    // Create a new separate conversation for User A
    const convC = await Conversation.create({
      userId: userA._id,
      title: 'Alice Clean Consult',
    });

    const mockAi = createMockAiClient(['Hello, how can I help you today?']);

    await streamUserMessageWithAI({
      conversationId: convC._id.toString(),
      userId: userA._id.toString(),
      content: 'Hello, I have a general headache question.',
      client: mockAi,
    });

    const req = mockAi.getCapturedRequest();
    assert.ok(req);
    const promptText = req.contents[0].parts[0].text;
    // Strict isolation: Conv C must NOT have vitals.pdf or report_alpha.pdf context
    assert.equal(
      promptText.includes('vitals.pdf'),
      false,
      'Conv C must not contain Conv A documents'
    );
    assert.equal(
      promptText.includes('report_alpha.pdf'),
      false,
      'Conv C must not contain Conv A documents'
    );
    assert.equal(
      promptText.includes('MEDICAL REPORT REFERENCE DATA'),
      false,
      'Conv C must have zero document context injected'
    );
  });

  await t.test('13. Explicitly passing Conv A document ID to Conv C is prevented by conversation scoping', async () => {
    const convD = await Conversation.create({
      userId: userA._id,
      title: 'Alice Scoping Test',
    });

    // Find committed document from Conv A
    const convADoc = await Document.findOne({ conversationId: convA._id });
    assert.ok(convADoc, 'Committed document should exist in Conv A');

    const mockAi = createMockAiClient(['General reply.']);

    // Attempt to pass Conv A docId to Conv D
    await streamUserMessageWithAI({
      conversationId: convD._id.toString(),
      userId: userA._id.toString(),
      content: 'Attempting cross-conversation document leak',
      documentIds: [convADoc._id.toString()],
      client: mockAi,
    });

    const req = mockAi.getCapturedRequest();
    assert.ok(req);
    const promptText = req.contents[0].parts[0].text;
    assert.equal(
      promptText.includes(convADoc.originalName),
      false,
      'Conv D must not inject document belonging to Conv A even if ID is passed'
    );
    assert.equal(
      promptText.includes('MEDICAL REPORT REFERENCE DATA'),
      false,
      'Zero document context should be injected for foreign document ID'
    );
  });
});
