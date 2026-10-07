import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  extractTextFromBuffer,
  extractTextFromFile,
} from '../src/modules/document/document.processor.js';

const VALID_TEXT_PDF_STRING = `%PDF-1.4
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

const TEXTLESS_PDF_STRING = `%PDF-1.4
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

test('Document Processor Isolated Unit Tests', async (t) => {
  let tempDir;

  t.before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-test-'));
  });

  t.after(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('1. Extracts text from valid text-bearing PDF buffer', async () => {
    const buf = Buffer.from(VALID_TEXT_PDF_STRING, 'utf8');
    const result = await extractTextFromBuffer(buf);

    assert.equal(result.success, true);
    assert.equal(result.totalPages, 1);
    assert.equal(result.text, 'Patient Blood Pressure: 120/80');
    assert.equal(result.characterCount, 'Patient Blood Pressure: 120/80'.length);
  });

  await t.test('2. Distinguishes textless / scanned PDF and returns NO_EXTRACTABLE_TEXT', async () => {
    const buf = Buffer.from(TEXTLESS_PDF_STRING, 'utf8');
    const result = await extractTextFromBuffer(buf);

    assert.equal(result.success, false);
    assert.equal(result.reason, 'NO_EXTRACTABLE_TEXT');
    assert.match(result.message, /scanned or image-only/i);
    assert.equal(result.characterCount, 0);
  });

  await t.test('3. Returns EMPTY_BUFFER error on 0-byte buffer', async () => {
    const emptyBuf = Buffer.alloc(0);
    const result = await extractTextFromBuffer(emptyBuf);

    assert.equal(result.success, false);
    assert.equal(result.reason, 'EMPTY_BUFFER');
  });

  await t.test('4. Safely catches parse error on corrupted PDF data', async () => {
    const corruptBuf = Buffer.from('%PDF-1.4 corrupt random non-pdf garbage bytes');
    const result = await extractTextFromBuffer(corruptBuf);

    assert.equal(result.success, false);
    assert.equal(result.reason, 'PARSE_ERROR');
    assert.ok(result.error);
  });

  await t.test('5. Extracts text from valid file on disk', async () => {
    const filePath = path.join(tempDir, 'valid.pdf');
    await fs.writeFile(filePath, VALID_TEXT_PDF_STRING, 'utf8');

    const result = await extractTextFromFile(filePath);
    assert.equal(result.success, true);
    assert.equal(result.text, 'Patient Blood Pressure: 120/80');
  });

  await t.test('6. Handles missing file on disk safely with FILE_NOT_FOUND', async () => {
    const missingPath = path.join(tempDir, 'nonexistent.pdf');
    const result = await extractTextFromFile(missingPath);

    assert.equal(result.success, false);
    assert.equal(result.reason, 'FILE_NOT_FOUND');
    assert.match(result.message, /not be located/i);
  });

  await t.test('7. Handles empty file on disk safely with EMPTY_FILE', async () => {
    const emptyPath = path.join(tempDir, 'empty.pdf');
    await fs.writeFile(emptyPath, Buffer.alloc(0));

    const result = await extractTextFromFile(emptyPath);
    assert.equal(result.success, false);
    assert.equal(result.reason, 'EMPTY_FILE');
  });
});
