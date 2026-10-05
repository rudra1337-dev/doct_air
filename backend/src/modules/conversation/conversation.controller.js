import asyncHandler from '../../utils/asyncHandler.js';
import * as conversationService from './conversation.service.js';

/**
 * @route   POST /api/conversations
 * @desc    Create a new conversation for the authenticated user
 * @access  Private
 */
export const createConversationHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { title } = req.body;

  const conversation = await conversationService.createConversation(userId, { title });

  res.status(201).json({
    success: true,
    conversation,
  });
});

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations belonging to the authenticated user
 * @access  Private
 */
export const getUserConversationsHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const conversations = await conversationService.getUserConversations(userId);

  res.status(200).json({
    success: true,
    conversations,
  });
});

/**
 * @route   GET /api/conversations/:conversationId/messages
 * @desc    Get all messages for a specific conversation owned by the authenticated user
 * @access  Private
 */
export const getConversationMessagesHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId } = req.params;

  const messages = await conversationService.getConversationMessages(conversationId, userId);

  res.status(200).json({
    success: true,
    messages,
  });
});

/**
 * @route   POST /api/conversations/:conversationId/messages
 * @desc    Add a user message to the specified conversation
 * @access  Private
 */
export const addMessageHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId } = req.params;
  const { content, inputMode } = req.body;

  const message = await conversationService.addUserMessage(conversationId, userId, {
    content,
    inputMode,
  });

  res.status(201).json({
    success: true,
    message,
  });
});
