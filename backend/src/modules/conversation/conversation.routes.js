import { Router } from 'express';
import {
  createConversationHandler,
  getUserConversationsHandler,
  getConversationMessagesHandler,
  addMessageHandler,
  streamMessageHandler,
} from './conversation.controller.js';
import {
  validateCreateConversation,
  validateGetMessages,
  validateCreateMessage,
} from './conversation.validator.js';
import { authenticateUser } from '../../middleware/authMiddleware.js';
import documentRoutes from '../document/document.routes.js';
import {
  createCaseHandler,
  getCaseByConversationHandler,
  extractCaseHandler,
  extractDocumentCaseHandler,
  getFollowUpStatusHandler,
  askFollowUpQuestionHandler,
  answerFollowUpQuestionHandler,
  generateReportHandler,
  getReportByConversationHandler,
  getReportByVersionHandler,
} from '../case/case.controller.js';
import {
  validateConversationIdParam,
  validateDocumentAndConversationParams,
} from '../case/case.validator.js';

const router = Router();

// All conversation routes require authentication
router.use(authenticateUser);

// Mount document sub-resource router
router.use('/:conversationId/documents', documentRoutes);

// Mount conversation structured case endpoints
router
  .route('/:conversationId/case')
  .get(validateConversationIdParam, getCaseByConversationHandler)
  .post(validateConversationIdParam, createCaseHandler);

router
  .route('/:conversationId/case/follow-up')
  .get(validateConversationIdParam, getFollowUpStatusHandler);

router
  .route('/:conversationId/case/follow-up/ask')
  .post(validateConversationIdParam, askFollowUpQuestionHandler);

router
  .route('/:conversationId/case/follow-up/answer')
  .post(validateConversationIdParam, answerFollowUpQuestionHandler);

router
  .route('/:conversationId/case/extract')
  .post(validateConversationIdParam, extractCaseHandler);

router
  .route('/:conversationId/case/documents/:documentId/extract')
  .post(validateDocumentAndConversationParams, extractDocumentCaseHandler);

// ── Conversation Medical Intake Report Endpoints ───────────────────────────
router
  .route('/:conversationId/case/report')
  .get(validateConversationIdParam, getReportByConversationHandler);

router
  .route('/:conversationId/case/report/generate')
  .post(validateConversationIdParam, generateReportHandler);

router
  .route('/:conversationId/case/report/version/:version')
  .get(validateConversationIdParam, getReportByVersionHandler);

router
  .route('/')
  .post(validateCreateConversation, createConversationHandler)
  .get(getUserConversationsHandler);

router
  .route('/:conversationId/messages')
  .get(validateGetMessages, getConversationMessagesHandler)
  .post(validateCreateMessage, addMessageHandler);

router
  .route('/:conversationId/messages/stream')
  .post(validateCreateMessage, streamMessageHandler);

export default router;
