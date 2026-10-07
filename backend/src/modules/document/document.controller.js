import asyncHandler from '../../utils/asyncHandler.js';
import * as documentService from './document.service.js';

/**
 * @route   POST /api/conversations/:conversationId/documents
 * @desc    Upload a PDF medical report and associate it with a conversation
 * @access  Private
 */
export const uploadDocumentHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId } = req.params;
  const file = req.file;

  const document = await documentService.uploadDocument({
    conversationId,
    userId,
    file,
  });

  res.status(201).json({
    success: true,
    document,
  });
});

/**
 * @route   GET /api/conversations/:conversationId/documents
 * @desc    List all active documents associated with a conversation
 * @access  Private
 */
export const getConversationDocumentsHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId } = req.params;

  const documents = await documentService.getConversationDocuments({
    conversationId,
    userId,
  });

  res.status(200).json({
    success: true,
    documents,
  });
});

/**
 * @route   GET /api/conversations/:conversationId/documents/:documentId
 * @desc    Get a specific document and its text processing result
 * @access  Private
 */
export const getDocumentHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId, documentId } = req.params;

  const document = await documentService.getDocumentById({
    conversationId,
    documentId,
    userId,
  });

  res.status(200).json({
    success: true,
    document,
  });
});

/**
 * @route   POST /api/conversations/:conversationId/documents/:documentId/retry
 * @desc    Retry text processing on an uploaded document
 * @access  Private
 */
export const retryDocumentProcessingHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId, documentId } = req.params;

  const document = await documentService.retryDocumentProcessing({
    conversationId,
    documentId,
    userId,
  });

  res.status(200).json({
    success: true,
    document,
  });
});

/**
 * @route   DELETE /api/conversations/:conversationId/documents/:documentId
 * @desc    Delete a document and its stored file from a conversation
 * @access  Private
 */
export const deleteDocumentHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId, documentId } = req.params;

  const result = await documentService.deleteDocument({
    conversationId,
    documentId,
    userId,
  });

  res.status(200).json(result);
});

export default {
  uploadDocumentHandler,
  getConversationDocumentsHandler,
  getDocumentHandler,
  retryDocumentProcessingHandler,
  deleteDocumentHandler,
};
