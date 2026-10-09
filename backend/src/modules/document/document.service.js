import fs from 'fs';
import * as documentRepo from './document.repository.js';
import * as conversationRepo from '../conversation/conversation.repository.js';
import * as documentProcessor from './document.processor.js';
import { extractAndMergeCaseForDocument } from '../case/case.extraction.service.js';

/**
 * Service layer for Document management, security boundaries, and processing lifecycle.
 */

/**
 * Process a stored PDF document to extract text and update status/metadata.
 *
 * @param {string} documentId
 * @returns {Promise<Object>} Updated document
 */
export const processDocument = async (documentId) => {
  const document = await documentRepo.findDocumentById(documentId);
  if (!document || document.status === 'deleted') {
    return null;
  }

  const startTime = Date.now();

  // Mark document as in-flight processing
  await documentRepo.updateDocument(documentId, {
    status: 'processing',
    processingStartedAt: new Date(),
    processingError: null,
  });

  try {
    const extractionResult = await documentProcessor.extractTextFromFile(document.storagePath);
    const durationMs = Date.now() - startTime;

    if (extractionResult.success) {
      const updated = await documentRepo.updateDocument(documentId, {
        status: 'processed',
        extractedText: extractionResult.text,
        extractedLength: extractionResult.characterCount,
        pageCount: extractionResult.totalPages,
        processingError: null,
        processingCompletedAt: new Date(),
      });

      // Safe metadata-only logging (never log medical report text)
      console.log(
        `[DocumentService] Document processed successfully: id=${documentId} pages=${extractionResult.totalPages} chars=${extractionResult.characterCount} duration=${durationMs}ms`
      );

      // Trigger asynchronous background structured findings extraction into Case
      // Non-blocking fire-and-forget; handles failures safely without crashing
      extractAndMergeCaseForDocument({
        conversationId: updated.conversationId,
        userId: updated.userId,
        documentId: updated._id,
      }).catch((extractErr) => {
        console.error(
          `[CaseExtraction] Background doc extraction error for doc=${documentId}:`,
          extractErr.message
        );
      });

      return updated;
    }

    // Extraction could not find extractable text or parsed with limitation
    const updated = await documentRepo.updateDocument(documentId, {
      status: 'failed',
      extractedText: null,
      extractedLength: 0,
      pageCount: extractionResult.totalPages || 0,
      processingError: extractionResult.message || 'Text extraction failed',
      processingCompletedAt: new Date(),
    });

    console.warn(
      `[DocumentService] Document extraction failed: id=${documentId} reason=${extractionResult.reason} duration=${durationMs}ms`
    );

    return updated;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const safeErrorMessage =
      err.message?.includes('ENOENT')
        ? 'Document file not found on server.'
        : 'An error occurred while processing the document.';

    const updated = await documentRepo.updateDocument(documentId, {
      status: 'failed',
      extractedText: null,
      extractedLength: 0,
      pageCount: 0,
      processingError: safeErrorMessage,
      processingCompletedAt: new Date(),
    });

    console.error(
      `[DocumentService] Document processing exception: id=${documentId} duration=${durationMs}ms:`,
      err.message
    );

    return updated;
  }
};

/**
 * Upload and associate a PDF document with a conversation, then trigger text processing.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {Object} params.file - Multer file object
 * @param {Object} [params.options]
 * @param {boolean} [params.options.awaitProcessing=false] - Whether to await processing before returning
 * @returns {Promise<Object>} Created document metadata
 */
export const uploadDocument = async ({ conversationId, userId, file, options = {} }) => {
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

    // If caller explicitly requested waiting for processing (e.g. specialized sync workflows)
    if (options.awaitProcessing) {
      const processed = await processDocument(document._id);
      return processed || document;
    }

    // Otherwise initiate text extraction asynchronously without blocking HTTP upload response
    setImmediate(() => {
      processDocument(document._id).catch((err) => {
        console.error(
          `[DocumentService] Async processing error for documentId=${document._id}:`,
          err.message
        );
      });
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
 * Get a specific document by ID with authorization check
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.documentId
 * @param {string} params.userId
 * @returns {Promise<Object>} Document record
 */
export const getDocumentById = async ({ conversationId, documentId, userId }) => {
  // Verify conversation ownership
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const document = await documentRepo.findDocumentByIdAndConversationId(
    documentId,
    conversationId
  );

  if (!document || document.userId.toString() !== userId.toString() || document.status === 'deleted') {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  return document;
};

/**
 * Retry processing for a document
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.documentId
 * @param {string} params.userId
 * @returns {Promise<Object>} Updated document record
 */
export const retryDocumentProcessing = async ({ conversationId, documentId, userId }) => {
  // Authorize user and verify document belongs to conversation
  const document = await getDocumentById({ conversationId, documentId, userId });

  // Re-run extraction process
  return await processDocument(document._id);
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

/**
 * Get all successfully processed documents for a conversation with strict ownership check
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @returns {Promise<Array>} List of processed document records with extracted text
 */
export const getProcessedDocumentsForConversation = async ({ conversationId, userId, documentIds }) => {
  // Verify conversation ownership before loading document data
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // If documentIds is explicitly passed as an empty array, caller requested 0 documents
  if (Array.isArray(documentIds) && documentIds.length === 0) {
    return [];
  }

  // Query MongoDB with conversationId, userId, and optional documentIds strictly enforced
  const documents = await documentRepo.findProcessedDocumentsByConversationId(
    conversationId,
    userId,
    documentIds
  );

  // If documentIds is explicitly passed as an array, filter by those IDs
  const idFilterSet = Array.isArray(documentIds)
    ? new Set(documentIds.map((id) => id.toString()))
    : null;

  // Defense-in-depth: ensure all documents strictly match conversationId, userId, and are processed
  return documents.filter(
    (doc) =>
      doc.conversationId.toString() === conversationId.toString() &&
      doc.userId.toString() === userId.toString() &&
      doc.status === 'processed' &&
      typeof doc.extractedText === 'string' &&
      doc.extractedText.trim().length > 0 &&
      (!idFilterSet || idFilterSet.has(doc._id.toString()))
  );
};

export default {
  processDocument,
  uploadDocument,
  getConversationDocuments,
  getProcessedDocumentsForConversation,
  getDocumentById,
  retryDocumentProcessing,
  deleteDocument,
};

