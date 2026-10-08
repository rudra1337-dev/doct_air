import fs from 'node:fs/promises';
import { extractText } from 'unpdf';

/**
 * Dedicated PDF text extraction processor.
 *
 * Boundary:
 * - Operates purely on binary PDF buffers and local file paths.
 * - Decoupled from HTTP requests, authentication, database persistence, and AI/Gemini.
 * - Does not perform OCR or image parsing.
 * - Never prints or logs extracted document content or internal paths.
 */

/**
 * Extract textual content from a binary PDF buffer or Uint8Array.
 *
 * @param {Buffer | Uint8Array} buffer
 * @returns {Promise<{
 *   success: boolean,
 *   text?: string,
 *   totalPages?: number,
 *   characterCount?: number,
 *   reason?: string,
 *   message?: string
 * }>}
 */
export const extractTextFromBuffer = async (buffer) => {
  if (!buffer || (buffer.length === 0 && buffer.byteLength === 0)) {
    return {
      success: false,
      reason: 'EMPTY_BUFFER',
      message: 'PDF file is empty (0 bytes).',
      totalPages: 0,
    };
  }

  try {
    const uint8Data = Buffer.isBuffer(buffer)
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : buffer instanceof Uint8Array
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer);

    const result = await extractText(uint8Data, { mergePages: true });

    const totalPages = typeof result?.totalPages === 'number' ? result.totalPages : 1;
    const rawText = typeof result?.text === 'string' ? result.text : '';
    const trimmedText = rawText.trim();

    // Distinguish between valid text PDF and textless / scanned PDF
    if (!trimmedText) {
      return {
        success: false,
        reason: 'NO_EXTRACTABLE_TEXT',
        message:
          'No extractable text found in PDF (document may be scanned or image-only).',
        totalPages,
        characterCount: 0,
      };
    }

    return {
      success: true,
      text: trimmedText,
      totalPages,
      characterCount: trimmedText.length,
    };
  } catch (err) {
    return {
      success: false,
      reason: 'PARSE_ERROR',
      message: 'Failed to extract text from PDF document.',
      error: err.message,
      totalPages: 0,
    };
  }
};

/**
 * Extract textual content from a local PDF file path.
 *
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<{
 *   success: boolean,
 *   text?: string,
 *   totalPages?: number,
 *   characterCount?: number,
 *   reason?: string,
 *   message?: string
 * }>}
 */
export const extractTextFromFile = async (filePath) => {
  if (!filePath) {
    return {
      success: false,
      reason: 'INVALID_PATH',
      message: 'Document file path is required.',
    };
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size === 0) {
      return {
        success: false,
        reason: 'EMPTY_FILE',
        message: 'Document file on disk is empty or invalid.',
        totalPages: 0,
      };
    }

    const fileBuffer = await fs.readFile(filePath);
    return await extractTextFromBuffer(fileBuffer);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        success: false,
        reason: 'FILE_NOT_FOUND',
        message: 'Document file could not be located on disk.',
      };
    }

    return {
      success: false,
      reason: 'READ_ERROR',
      message: 'Failed to read document file from disk.',
      error: err.message,
    };
  }
};

export default {
  extractTextFromBuffer,
  extractTextFromFile,
};
