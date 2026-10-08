import Conversation from './models/Conversation.js';
import Message from './models/Message.js';

/**
 * Data access layer for conversations and messages
 */

export const createConversation = async ({ userId, title, status = 'active' }) => {
  const payload = { userId, status };
  if (title) {
    payload.title = title;
  }
  return Conversation.create(payload);
};

export const findConversationsByUserId = async (userId) => {
  return Conversation.find({ userId }).sort({ lastMessageAt: -1 });
};

export const findConversationById = async (id) => {
  return Conversation.findById(id);
};

export const findConversationByIdAndUserId = async (id, userId) => {
  return Conversation.findOne({ _id: id, userId });
};

export const updateConversationLastMessage = async (id, timestamp = new Date()) => {
  return Conversation.findByIdAndUpdate(
    id,
    { lastMessageAt: timestamp },
    { returnDocument: 'after' }
  );
};

export const createMessage = async ({
  _id,
  conversationId,
  role = 'user',
  content,
  attachments = [],
  inputMode = 'text',
  status = 'completed',
}) => {
  const payload = {
    conversationId,
    role,
    content,
    attachments,
    inputMode,
    status,
  };
  if (_id) {
    payload._id = _id;
  }
  return Message.create(payload);
};

export const findMessagesByConversationId = async (conversationId) => {
  return Message.find({ conversationId }).sort({ createdAt: 1 });
};

export const findRecentCompletedMessages = async (conversationId, limit = 20) => {
  const messages = await Message.find({
    conversationId,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  // Return in chronological order
  return messages.reverse();
};

