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
 * @route   POST /api/conversations/:conversationId/messages/stream
 * @desc    Add user message and stream Gemini assistant response via Server-Sent Events (SSE)
 * @access  Private
 */
export const streamMessageHandler = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { conversationId } = req.params;
  const { content, inputMode } = req.body;

  let sseStarted = false;

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await conversationService.streamUserMessageWithAI({
      conversationId,
      userId,
      content,
      inputMode,
      onMessageStart: (data) => {
        if (!sseStarted) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();
          sseStarted = true;
        }
        sendSSE('message_start', data);
      },
      onMessageDelta: (data) => {
        sendSSE('message_delta', data);
      },
      onMessageComplete: (data) => {
        sendSSE('message_complete', data);
        res.end();
      },
      onMessageError: (data) => {
        if (!sseStarted) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();
          sseStarted = true;
        }
        sendSSE('message_error', data);
        res.end();
      },
    });
  } catch (error) {
    if (!sseStarted && !res.headersSent) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to process conversation message',
      });
    } else if (!res.writableEnded) {
      sendSSE('message_error', {
        conversationId,
        error: error.message || 'Stream processing failed',
        partial: false,
      });
      res.end();
    }
  }
});

/**
 * @route   POST /api/conversations/:conversationId/messages
 * @desc    Add a user message to the specified conversation (with optional streaming support)
 * @access  Private
 */
export const addMessageHandler = asyncHandler(async (req, res, next) => {
  const isStreaming =
    req.headers.accept?.includes('text/event-stream') ||
    req.query.stream === 'true' ||
    req.body.stream === true;

  if (isStreaming) {
    return streamMessageHandler(req, res, next);
  }

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

