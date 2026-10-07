import fs from 'fs';
import * as documentRepo from './document.repository.js';
import * as conversationRepo from '../conversation/conversation.repository.js';

/**
 * Service layer for Document management and security boundaries
 */

/**
 * Upload and associate a PDF document with a conversation
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {Object} params.file - Multer file object
 * @returns {Promise<Object>} Created document metadata
 */
export const uploadDocument = async ({ conversationId, userId, file }) => {
  // Ensure conversation exists and strictly belongs to the authenticated user
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    // Clean up uploaded file if conversation authorization fails
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
    }
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  try {
    const document = await documentRepo.createDocument({
      userId,
      conversationId,
      originalName: file.originalname,
      mimeType: file.mimetype || 'application/pdf',
      fileSize: file.size,
      storageKey: file.filename,
      storagePath: file.path,
      status: 'uploaded',
    });

    return document;
  } catch (dbError) {
    // If database persistence fails, purge the uploaded file to avoid orphans
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
    }
    throw dbError;
  }
};

/**
 * Get all active documents associated with a conversation
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @returns {Promise<Array>} List of document records
 */
export const getConversationDocuments = async ({ conversationId, userId }) => {
  // Verify conversation ownership before listing documents
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  return documentRepo.findDocumentsByConversationId(conversationId);
};

/**
 * Delete a document and its stored file
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.documentId
 * @param {string} params.userId
 * @returns {Promise<Object>}
 */
export const deleteDocument = async ({ conversationId, documentId, userId }) => {
  // Verify conversation ownership
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // Find document and verify association
  const document = await documentRepo.findDocumentByIdAndConversationId(
    documentId,
    conversationId
  );

  if (!document || document.userId.toString() !== userId.toString()) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  // Remove file from disk
  if (document.storagePath && fs.existsSync(document.storagePath)) {
    try {
      await fs.promises.unlink(document.storagePath);
    } catch (err) {
      console.warn('Failed to delete document file from disk:', err.message);
    }
  }

  // Remove database record
  await documentRepo.deleteDocumentById(documentId);

  return { success: true, message: 'Document deleted successfully' };
};
