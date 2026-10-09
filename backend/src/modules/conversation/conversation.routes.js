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
} from '../case/case.controller.js';
import { validateConversationIdParam } from '../case/case.validator.js';

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
