import mongoose from 'mongoose';
import * as conversationRepo from './conversation.repository.js';
import { geminiService } from '../ai/index.js';
import * as documentService from '../document/document.service.js';
import * as attachmentService from '../attachment/attachment.service.js';
import { buildDocumentContext } from './documentContext.builder.js';
import { CONVERSATION_HISTORY_LIMIT } from '../../config/env.js';
import { extractAndMergeCaseForConversation } from '../case/case.extraction.service.js';


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

export const addUserMessage = async (
  conversationId,
  userId,
  { content, inputMode = 'text', attachmentIds } = {}
) => {
  // Verify ownership before persisting message
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const messageId = new mongoose.Types.ObjectId();
  let messageAttachments = [];

  // Finalize and commit attachments if provided
  if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
    const committedDocs = await attachmentService.finalizeAndCommitAttachments({
      attachmentIds,
      userId,
      conversationId,
      messageId,
    });

    messageAttachments = committedDocs.map((doc) => ({
      documentId: doc._id,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
    }));
  }

  // Create message with strictly server-enforced role and status
  const message = await conversationRepo.createMessage({
    _id: messageId,
    conversationId,
    role: 'user',
    content: (content || '').trim(),
    attachments: messageAttachments,
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

/**
 * Builds the plain conversation context for Gemini from recent completed messages
 *
 * @param {string} conversationId
 * @param {number} [limit]
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
export const buildConversationContext = async (
  conversationId,
  limit = CONVERSATION_HISTORY_LIMIT
) => {
  const recentMessages = await conversationRepo.findRecentCompletedMessages(
    conversationId,
    limit
  );

  return recentMessages.map((msg) => ({
    role: msg.role,
    content:
      msg.content && msg.content.trim().length > 0
        ? msg.content
        : 'Please review and summarize the attached medical report(s).',
  }));
};

/**
 * Orchestrates sending a user message, invoking Gemini streaming,
 * and progressively delivering chunks while persisting state.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} params.content
 * @param {string} [params.inputMode='text']
 * @param {Array<string>} [params.documentIds]
 * @param {Array<string>} [params.attachmentIds]
 * @param {Function} [params.onMessageStart]
 * @param {Function} [params.onMessageDelta]
 * @param {Function} [params.onMessageComplete]
 * @param {Function} [params.onMessageError]
 * @param {Object} [params.client=null] - Optional injected client for testing
 * @param {string} [params.apiKey='']
 * @returns {Promise<{userMessage: Object, assistantMessage: Object}>}
 */
export const streamUserMessageWithAI = async ({
  conversationId,
  userId,
  content,
  inputMode = 'text',
  documentIds,
  attachmentIds,
  onMessageStart,
  onMessageDelta,
  onMessageComplete,
  onMessageError,
  client = null,
  apiKey = null,
} = {}) => {
  // 1. Verify conversation ownership
  const conversation = await conversationRepo.findConversationById(conversationId);

  if (!conversation || conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const messageId = new mongoose.Types.ObjectId();
  let messageAttachments = [];
  let committedDocIds = [];

  // Finalize and commit attachments if provided
  if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
    const committedDocs = await attachmentService.finalizeAndCommitAttachments({
      attachmentIds,
      userId,
      conversationId,
      messageId,
    });

    messageAttachments = committedDocs.map((doc) => ({
      documentId: doc._id,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
    }));
    committedDocIds = committedDocs.map((d) => d._id.toString());
  }

  // 2. Persist the user message with committed attachments
  const userMessage = await conversationRepo.createMessage({
    _id: messageId,
    conversationId,
    role: 'user',
    content: (content || '').trim(),
    attachments: messageAttachments,
    inputMode,
    status: 'completed',
  });

  // 3. Update conversation's lastMessageAt timestamp
  await conversationRepo.updateConversationLastMessage(
    conversationId,
    userMessage.createdAt || new Date()
  );

  // Notify message_start
  const safeUserMessage = userMessage.toJSON ? userMessage.toJSON() : userMessage;
  if (onMessageStart) {
    onMessageStart({
      conversationId,
      userMessage: safeUserMessage,
    });
  }

  // 4. Build the AI context from recent completed messages (including the newly added user message)
  const aiContext = await buildConversationContext(conversationId);

  // 4b. Load authorized processed documents and build delimited document context if available
  let documentContext = null;
  try {
    const effectiveDocIds = Array.isArray(documentIds)
      ? documentIds
      : committedDocIds.length > 0
        ? committedDocIds
        : undefined;

    const processedDocuments = await documentService.getProcessedDocumentsForConversation({
      conversationId,
      userId,
      documentIds: effectiveDocIds,
    });

    if (processedDocuments && processedDocuments.length > 0) {
      documentContext = buildDocumentContext(processedDocuments);
      if (documentContext) {
        console.log(
          `[ConversationService] Injected document context for conv=${conversationId}: ${processedDocuments.length} doc(s), ${documentContext.length} chars`
        );
      }
    }
  } catch (docErr) {
    // Graceful degradation: If document context retrieval fails, continue with normal conversation
    console.warn(
      `[ConversationService] Document context retrieval warning for conv=${conversationId}:`,
      docErr.message
    );
  }

  // 5. Pass context to isolated Gemini service and stream response
  let fullAssistantText = '';

  try {
    const stream = geminiService.generateStream({
      messages: aiContext,
      documentContext,
      client,
      apiKey,
    });

    for await (const chunk of stream) {
      if (chunk.delta) {
        fullAssistantText += chunk.delta;
        if (onMessageDelta) {
          onMessageDelta({
            conversationId,
            delta: chunk.delta,
          });
        }
      }
    }

    if (!fullAssistantText.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    // 6. Persist completed assistant message only after successful stream completion
    const assistantMessage = await conversationRepo.createMessage({
      conversationId,
      role: 'assistant',
      content: fullAssistantText.trim(),
      inputMode: 'text',
      status: 'completed',
    });

    // 7. Update conversation metadata
    await conversationRepo.updateConversationLastMessage(
      conversationId,
      assistantMessage.createdAt || new Date()
    );

    const safeAssistantMessage = assistantMessage.toJSON
      ? assistantMessage.toJSON()
      : assistantMessage;

    if (onMessageComplete) {
      onMessageComplete({
        conversationId,
        message: safeAssistantMessage,
      });
    }

    // Trigger asynchronous background structured case extraction
    // Does NOT block, delay, or append to the SSE stream or user response
    extractAndMergeCaseForConversation({
      conversationId,
      userId,
      userRole: 'PATIENT',
      messageId: userMessage._id,
      client,
      apiKey,
    }).catch((err) => {
      console.error(
        `[CaseExtraction] Background extraction error for conv=${conversationId}:`,
        err.message
      );
    });

    return {
      userMessage: safeUserMessage,
      assistantMessage: safeAssistantMessage,
    };
  } catch (error) {
    // Failure handling:
    // If partial output occurred, persist partial message marked explicitly as 'failed'
    // If failed before generating any output, do NOT persist a fake assistant message
    if (fullAssistantText.trim()) {
      try {
        await conversationRepo.createMessage({
          conversationId,
          role: 'assistant',
          content: fullAssistantText.trim(),
          inputMode: 'text',
          status: 'failed',
        });
      } catch (persistErr) {
        console.error('Failed to log failed assistant message:', persistErr.message);
      }
    }

    const sanitizedMessage = error.message || 'Error occurred while generating assistant response';

    if (onMessageError) {
      onMessageError({
        conversationId,
        error: sanitizedMessage,
        partial: Boolean(fullAssistantText.trim()),
      });
    }

    throw error;
  }
};

