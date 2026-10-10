import asyncHandler from '../../utils/asyncHandler.js';
import * as caseService from './case.service.js';
import * as caseExtractionService from './case.extraction.service.js';
import * as caseReportService from './case.report.service.js';

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

  const jsonCase = caseDoc?.toJSON ? caseDoc.toJSON() : { ...caseDoc };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(caseDoc);

  res.status(201).json({
    success: true,
    case: jsonCase,
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

  const jsonCase = caseDoc?.toJSON ? caseDoc.toJSON() : { ...caseDoc };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(caseDoc);

  res.status(200).json({
    success: true,
    case: jsonCase,
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

  const jsonCase = caseDoc?.toJSON ? caseDoc.toJSON() : { ...caseDoc };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(caseDoc);

  res.status(200).json({
    success: true,
    case: jsonCase,
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

  const jsonCase = updatedCase?.toJSON ? updatedCase.toJSON() : { ...updatedCase };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(updatedCase);

  res.status(200).json({
    success: true,
    case: jsonCase,
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

  const jsonCase = updatedCase?.toJSON ? updatedCase.toJSON() : { ...updatedCase };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(updatedCase);

  res.status(200).json({
    success: true,
    case: jsonCase,
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

  const jsonCase = updatedCase?.toJSON ? updatedCase.toJSON() : { ...updatedCase };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(updatedCase);

  res.status(200).json({
    success: true,
    case: jsonCase,
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

  const jsonCase = updatedCase?.toJSON ? updatedCase.toJSON() : { ...updatedCase };
  jsonCase.completeness = caseService.evaluateCaseCompleteness(updatedCase);

  res.status(200).json({
    success: true,
    case: jsonCase,
  });
});

/**
 * @route   GET /api/cases
 * @desc    List structured cases accessible to the authenticated user
 * @access  Private
 */
export const listCasesHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { status, limit } = req.query;

  const cases = await caseService.listCases({
    userId,
    userRole,
    status,
    limit: limit ? parseInt(limit, 10) : 50,
  });

  res.status(200).json({
    success: true,
    cases,
  });
});

/**
 * @route   GET /api/cases/:id/completeness
 * @desc    Get completeness and missing information evaluation for a case
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getCaseCompletenessHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { id: caseId } = req.params;

  const result = await caseService.getCaseCompleteness({
    caseId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    caseId: result.caseId,
    completeness: result.completeness,
  });
});

/**
 * @route   GET /api/cases/conversation/:conversationId/follow-up
 * @desc    Get current follow-up question status for a conversation
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getFollowUpStatusHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId } = req.params;

  const result = await caseService.getFollowUpStatus({
    conversationId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @route   POST /api/cases/conversation/:conversationId/follow-up/ask
 * @desc    Idempotently ask or retrieve the next follow-up question
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const askFollowUpQuestionHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId } = req.params;

  const result = await caseService.askOrGetFollowUpQuestion({
    conversationId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @route   POST /api/cases/conversation/:conversationId/follow-up/answer
 * @desc    Integrate a patient answer to the active follow-up question
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const answerFollowUpQuestionHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId } = req.params;
  const { messageId } = req.body;

  const result = await caseService.integratePatientAnswer({
    conversationId,
    userId,
    userRole,
    messageId,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @route   POST /api/cases/conversation/:conversationId/report/generate OR POST /api/cases/:id/report/generate
 * @desc    Generate or regenerate a versioned Medical Intake Report for a consultation or case
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const generateReportHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  let conversationId = req.params.conversationId;

  if (!conversationId && req.params.id) {
    const caseDoc = await caseService.getCaseById({
      caseId: req.params.id,
      userId,
      userRole,
    });
    conversationId = caseDoc.conversationId.toString();
  }

  const report = await caseReportService.generateOrRegenerateReport({
    conversationId,
    userId,
    userRole,
  });

  res.status(201).json({
    success: true,
    report,
  });
});

/**
 * @route   GET /api/cases/conversation/:conversationId/report OR GET /api/conversations/:conversationId/case/report
 * @desc    Get the latest Medical Intake Report for a conversation
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getReportByConversationHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId } = req.params;

  const report = await caseReportService.getLatestReportByConversation({
    conversationId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    report,
  });
});

/**
 * @route   GET /api/cases/:id/report
 * @desc    Get the latest Medical Intake Report by case ID
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getReportByCaseHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { id: caseId } = req.params;

  const report = await caseReportService.getLatestReportByCaseId({
    caseId,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    report,
  });
});

/**
 * @route   GET /api/cases/conversation/:conversationId/report/version/:version
 * @desc    Get a specific version of a Medical Intake Report
 * @access  Private (Authorized Patient owner or Clinician)
 */
export const getReportByVersionHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const { conversationId, version } = req.params;

  const report = await caseReportService.getReportByVersion({
    conversationId,
    version,
    userId,
    userRole,
  });

  res.status(200).json({
    success: true,
    report,
  });
});

export default {
  createCaseHandler,
  getCaseHandler,
  getCaseByConversationHandler,
  listCasesHandler,
  getCaseCompletenessHandler,
  getFollowUpStatusHandler,
  askFollowUpQuestionHandler,
  answerFollowUpQuestionHandler,
  updateCaseHandler,
  updateCaseStatusHandler,
  extractCaseHandler,
  extractDocumentCaseHandler,
  generateReportHandler,
  getReportByConversationHandler,
  getReportByCaseHandler,
  getReportByVersionHandler,
};
