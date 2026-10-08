import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import DraftAttachment from './models/DraftAttachment.js';
import Document from '../document/models/Document.js';
import { processDocument } from '../document/document.service.js';
import {
  DOCUMENT_UPLOAD_DIR,
  TEMP_ATTACHMENT_UPLOAD_DIR,
  TEMP_ATTACHMENT_TTL_MS,
} from '../../config/env.js';

// Ensure permanent and temp directories exist
const absoluteDocDir = path.resolve(process.cwd(), DOCUMENT_UPLOAD_DIR);
if (!fs.existsSync(absoluteDocDir)) {
  fs.mkdirSync(absoluteDocDir, { recursive: true });
}

const absoluteTempDir = path.resolve(process.cwd(), TEMP_ATTACHMENT_UPLOAD_DIR);
if (!fs.existsSync(absoluteTempDir)) {
  fs.mkdirSync(absoluteTempDir, { recursive: true });
}

/**
 * Creates a draft attachment record for an uploaded temporary file
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} [params.conversationId]
 * @param {Object} params.file - Multer file object
 * @returns {Promise<Object>} Created draft attachment
 */
export const createDraftAttachment = async ({ userId, conversationId, file }) => {
  if (!file) {
    const error = new Error('No file provided for draft attachment');
    error.statusCode = 400;
    throw error;
  }

  const draft = await DraftAttachment.create({
    userId,
    conversationId: conversationId || null,
    originalName: file.originalname,
    mimeType: file.mimetype || 'application/pdf',
    fileSize: file.size,
    storageKey: file.filename,
    storagePath: file.path,
    status: 'uploaded',
    expiresAt: new Date(Date.now() + TEMP_ATTACHMENT_TTL_MS),
  });

  return draft;
};

/**
 * Retrieves a draft attachment ensuring user ownership
 *
 * @param {Object} params
 * @param {string} params.attachmentId
 * @param {string} params.userId
 * @returns {Promise<Object>}
 */
export const getDraftAttachment = async ({ attachmentId, userId }) => {
  const draft = await DraftAttachment.findById(attachmentId);
  if (!draft || draft.userId.toString() !== userId.toString()) {
    const error = new Error('Draft attachment not found');
    error.statusCode = 404;
    throw error;
  }

  return draft;
};

/**
 * Deletes a draft attachment and unlinks its temporary file from disk
 *
 * @param {Object} params
 * @param {string} params.attachmentId
 * @param {string} params.userId
 * @returns {Promise<{ success: boolean }>}
 */
export const deleteDraftAttachment = async ({ attachmentId, userId }) => {
  const draft = await DraftAttachment.findById(attachmentId);
  if (!draft || draft.userId.toString() !== userId.toString()) {
    const error = new Error('Draft attachment not found');
    error.statusCode = 404;
    throw error;
  }

  if (draft.status === 'committed') {
    const error = new Error('Cannot delete an already committed attachment');
    error.statusCode = 400;
    throw error;
  }

  // Remove physical temporary file from disk
  if (draft.storagePath && fs.existsSync(draft.storagePath)) {
    try {
      fs.unlinkSync(draft.storagePath);
    } catch {
      // ignore
    }
  }

  await DraftAttachment.findByIdAndDelete(attachmentId);

  return { success: true };
};

/**
 * Validates an array of attachment IDs against draft attachments.
 * Strictly verifies ownership, status, expiration, and filesystem existence.
 *
 * @param {Object} params
 * @param {Array<string>} params.attachmentIds
 * @param {string} params.userId
 * @param {string} [params.conversationId]
 * @returns {Promise<Array<Object>>} Array of validated DraftAttachment models
 */
export const validateDraftAttachments = async ({ attachmentIds, userId, conversationId }) => {
  if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
    return [];
  }

  const validatedDrafts = [];

  for (const id of attachmentIds) {
    if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      const error = new Error(`Invalid attachment ID format: ${id}`);
      error.statusCode = 400;
      throw error;
    }

    const draft = await DraftAttachment.findById(id);
    if (!draft) {
      const error = new Error(`Draft attachment not found: ${id}`);
      error.statusCode = 404;
      throw error;
    }

    if (draft.userId.toString() !== userId.toString()) {
      const error = new Error(`Unauthorized access to draft attachment: ${id}`);
      error.statusCode = 403;
      throw error;
    }

    if (draft.status !== 'uploaded') {
      const error = new Error(
        `Draft attachment ${id} is not in uploaded state (current status: ${draft.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > draft.expiresAt) {
      const error = new Error(`Draft attachment ${id} has expired`);
      error.statusCode = 400;
      throw error;
    }

    if (!draft.storagePath || !fs.existsSync(draft.storagePath)) {
      const error = new Error(`Draft attachment file missing on server for id: ${id}`);
      error.statusCode = 400;
      throw error;
    }

    // If draft was uploaded with a specific conversationId, verify it matches
    if (
      draft.conversationId &&
      conversationId &&
      draft.conversationId.toString() !== conversationId.toString()
    ) {
      const error = new Error(
        `Draft attachment ${id} belongs to a different conversation`
      );
      error.statusCode = 400;
      throw error;
    }

    validatedDrafts.push(draft);
  }

  return validatedDrafts;
};

/**
 * Commits and finalizes draft attachments:
 * 1. Validates drafts
 * 2. Moves file from temporary storage to permanent storage
 * 3. Creates permanent Document records linked to messageId and conversationId
 * 4. Extracts text synchronously with document processor
 * 5. Marks drafts as 'committed'
 *
 * @param {Object} params
 * @param {Array<string>} params.attachmentIds
 * @param {string} params.userId
 * @param {string} params.conversationId
 * @param {string} [params.messageId]
 * @returns {Promise<Array<Object>>} Created and processed Document instances
 */
export const finalizeAndCommitAttachments = async ({
  attachmentIds,
  userId,
  conversationId,
  messageId = null,
}) => {
  const drafts = await validateDraftAttachments({
    attachmentIds,
    userId,
    conversationId,
  });

  if (drafts.length === 0) {
    return [];
  }

  const committedDocuments = [];

  for (const draft of drafts) {
    const ext = path.extname(draft.originalName).toLowerCase() || '.pdf';
    const permanentKey = `doc-${crypto.randomUUID()}${ext}`;
    const permanentPath = path.resolve(absoluteDocDir, permanentKey);

    // Atomically move file from temp to permanent storage (or copy+unlink on EXDEV)
    try {
      fs.renameSync(draft.storagePath, permanentPath);
    } catch (err) {
      if (err.code === 'EXDEV') {
        fs.copyFileSync(draft.storagePath, permanentPath);
        try {
          fs.unlinkSync(draft.storagePath);
        } catch {
          // ignore
        }
      } else {
        throw err;
      }
    }

    // Create permanent Document record
    const document = await Document.create({
      userId,
      conversationId,
      messageId: messageId || null,
      originalName: draft.originalName,
      mimeType: draft.mimeType || 'application/pdf',
      fileSize: draft.fileSize,
      storageKey: permanentKey,
      storagePath: permanentPath,
      status: 'uploaded',
    });

    // Run text extraction synchronously so extracted text is immediately ready for Gemini
    const processedDoc = await processDocument(document._id);

    // Mark draft attachment as committed
    draft.status = 'committed';
    draft.conversationId = conversationId;
    draft.committedDocumentId = document._id;
    await draft.save();

    committedDocuments.push(processedDoc || document);
  }

  return committedDocuments;
};

/**
 * Periodically cleans up expired or orphaned temporary attachment files
 */
export const cleanupExpiredTemporaryAttachments = async () => {
  try {
    const expiredDrafts = await DraftAttachment.find({
      status: 'uploaded',
      expiresAt: { $lt: new Date() },
    });

    for (const draft of expiredDrafts) {
      if (draft.storagePath && fs.existsSync(draft.storagePath)) {
        try {
          fs.unlinkSync(draft.storagePath);
        } catch {
          // ignore
        }
      }
      draft.status = 'expired';
      await draft.save();
    }
  } catch (err) {
    console.warn('[AttachmentService] Periodic cleanup error:', err.message);
  }
};
