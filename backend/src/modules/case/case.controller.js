import asyncHandler from '../../utils/asyncHandler.js';
import * as caseService from './case.service.js';
import * as caseExtractionService from './case.extraction.service.js';

/**
 * @route   POST /api/cases OR POST /api/conversations/:conversationId/case
 * @desc    Create or initialize a structured case for a conversation
 * @access  Private (Patient or Clinician)
 */
export const createCaseHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const conversationId = req.params.conversationId || req.body.conversationId;

  const caseDoc = await caseService.createOrInitializeCase({
    conversationId,
    userId,
    userRole,
    initialData: req.body,
  });

  res.status(201).json({
    success: true,
    case: caseDoc,
  });
});

/**
 * @route   GET /api/cases/:id
 * @desc    Get structured case by case ID
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getCaseHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { id: caseId } = req.params;

  const caseDoc = await caseService.getCaseById({
    caseId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    case: caseDoc,
  });
});

/**
 * @route   GET /api/conversations/:conversationId/case OR GET /api/cases/conversation/:conversationId
 * @desc    Get structured case associated with a specific conversation
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getCaseByConversationHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId } = req.params;

  const caseDoc = await caseService.getCaseByConversationId({
    conversationId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    case: caseDoc,
  });
});

/**
 * @route   PATCH /api/cases/:id
 * @desc    Update permitted structured fields of a case
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const updateCaseHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { id: caseId } = req.params;

  const updatedCase = await caseService.updateCase({
    caseId,
    userId,
    userRole,
    updateData: req.body,
  });

  res.status(200).json({
    success: true,
    case: updatedCase,
  });
});

/**
 * @route   PATCH /api/cases/:id/status
 * @desc    Update the lifecycle status of a medical case
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const updateCaseStatusHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { id: caseId } = req.params;
  const { status } = req.body;

  const updatedCase = await caseService.updateCaseStatus({
    caseId,
    userId,
    userRole,
    status,
  });

  res.status(200).json({
    success: true,
    case: updatedCase,
  });
});

/**
 * @route   POST /api/cases/conversation/:conversationId/extract OR POST /api/conversations/:conversationId/case/extract
 * @desc    Extract clinical facts from conversation messages and merge into Case
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const extractCaseHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const conversationId = req.params.conversationId || req.body.conversationId;
  const { messageId } = req.body || {};

  const updatedCase = await caseExtractionService.extractAndMergeCaseForConversation({
    conversationId,
    userId,
    userRole,
    messageId,
  });

  res.status(200).json({
    success: true,
    case: updatedCase,
  });
});

/**
 * @route   POST /api/cases/conversation/:conversationId/documents/:documentId/extract OR POST /api/conversations/:conversationId/case/documents/:documentId/extract
 * @desc    Extract clinical findings from a processed document and merge into Case
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const extractDocumentCaseHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId, documentId } = req.params;

  const updatedCase = await caseExtractionService.extractAndMergeCaseForDocument({
    conversationId,
    userId,
    userRole,
    documentId,
  });

  res.status(200).json({
    success: true,
    case: updatedCase,
  });
});

export default {
  createCaseHandler,
  getCaseHandler,
  getCaseByConversationHandler,
  updateCaseHandler,
  updateCaseStatusHandler,
  extractCaseHandler,
  extractDocumentCaseHandler,
};
