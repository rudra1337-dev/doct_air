import * as conversationRepo from './conversation.repository.js';

/**
 * Service layer for conversation business logic and security boundaries
 */

export const createConversation = async (userId, { title }) => {
  const conversation = await conversationRepo.createConversation({
    userId,
    title: title ? title.trim() : undefined,
    status: 'active',
  });

  return conversation;
};

export const getUserConversations = async (userId) => {
  return conversationRepo.findConversationsByUserId(userId);
};

export const getConversationMessages = async (conversationId, userId) => {
  // Ensure conversation exists and strictly belongs to the authenticated user
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  return conversationRepo.findMessagesByConversationId(conversationId);
};

export const addUserMessage = async (conversationId, userId, { content, inputMode = 'text' }) => {
  // Verify ownership before persisting message
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // Create message with strictly server-enforced role and status
  const message = await conversationRepo.createMessage({
    conversationId,
    role: 'user',
    content: content.trim(),
    inputMode,
    status: 'completed',
  });

  // Update conversation's lastMessageAt timestamp
  await conversationRepo.updateConversationLastMessage(
    conversationId,
    message.createdAt || new Date()
  );

  return message;
};
