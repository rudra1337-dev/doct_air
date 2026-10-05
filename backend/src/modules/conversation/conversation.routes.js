import { Router } from 'express';
import {
  createConversationHandler,
  getUserConversationsHandler,
  getConversationMessagesHandler,
  addMessageHandler,
} from './conversation.controller.js';
import {
  validateCreateConversation,
  validateGetMessages,
  validateCreateMessage,
} from './conversation.validator.js';
import { authenticateUser } from '../../middleware/authMiddleware.js';

const router = Router();

// All conversation routes require authentication
router.use(authenticateUser);

router
  .route('/')
  .post(validateCreateConversation, createConversationHandler)
  .get(getUserConversationsHandler);

router
  .route('/:conversationId/messages')
  .get(validateGetMessages, getConversationMessagesHandler)
  .post(validateCreateMessage, addMessageHandler);

export default router;
