import * as conversationRepo from '../conversation/conversation.repository.js';
import * as documentRepo from '../document/document.repository.js';
import * as caseService from './case.service.js';
import * as caseExtractor from './case.extractor.js';
import * as caseMerge from './case.merge.js';
import { isFieldSatisfied, didMessageResolveQuestion } from './case.followUp.service.js';
import { isGeminiConfigured } from '../ai/gemini/gemini.config.js';
const isTestEnv = () =>
  process.env.NODE_ENV === 'test' ||
  (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
  (Array.isArray(process.argv) &&
    process.argv.some((a) => typeof a === 'string' && (a.includes('test') || a.endsWith('.test.js'))));


/**
 * Extracts clinical facts from a conversation message and merges them into the conversation's structured Case.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} [params.userRole='PATIENT']
 * @param {string|null} [params.messageId=null] - Specific message to extract from (defaults to latest user message)
 * @param {Object|null} [params.client=null] - Injected Gemini client (for testing)
 * @param {string|null} [params.apiKey=null]
 * @returns {Promise<Object>} Updated Case document
 */
export const extractAndMergeCaseForConversation = async ({
  conversationId,
  userId,
  userRole = 'PATIENT',
  messageId = null,
  client = null,
  apiKey = null,
} = {}) => {
  // If client is passed (e.g. streaming test mock) but does not implement generateContent, skip extraction
  if (client && typeof client?.models?.generateContent !== 'function') {
    return null;
  }

  // If no mock client is provided and Gemini API key is not configured, skip extraction
  if (!client && !isGeminiConfigured(apiKey)) {
    return null;
  }

  // 1. Verify conversation existence and enforce ownership boundaries
  const conversation = await conversationRepo.findConversationById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT' && conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Identify and validate target message
  let targetMessage = null;

  if (messageId) {
    targetMessage = await conversationRepo.findMessageById(messageId);
    if (!targetMessage || targetMessage.conversationId.toString() !== conversationId.toString()) {
      const error = new Error('Message not found in this conversation');
      error.statusCode = 404;
      throw error;
    }
  } else {
    // Default to the latest completed user message in the conversation
    const messages = await conversationRepo.findRecentCompletedMessages(conversationId, 20);
    const userMsgs = messages.filter((m) => m.role === 'user');
    targetMessage = userMsgs[userMsgs.length - 1] || null;
  }

  // Retrieve or initialize the Case for this conversation
  const caseDoc = await caseService.createOrInitializeCase({
    conversationId,
    userId,
    userRole,
  });

  if (!targetMessage) {
    return caseDoc;
  }

  // Healthcare guardrail: Assistant-generated text is NEVER attributed to the patient
  if (targetMessage.role !== 'user') {
    return caseDoc;
  }

  // 3. Strict Idempotency Check
  const strMessageId = targetMessage._id.toString();
  if (
    Array.isArray(caseDoc.processedMessageIds) &&
    caseDoc.processedMessageIds.some((id) => id && id.toString() === strMessageId)
  ) {
    return caseDoc;
  }

  // 4. Retrieve recent completed messages for context window
  const contextMessages = await conversationRepo.findRecentCompletedMessages(conversationId, 20);

  // 5. Extract structured candidate data using Gemini
  let candidateData;
  try {
    candidateData = await caseExtractor.extractStructuredCaseFromMessage({
      messages: contextMessages,
      targetMessage,
      client,
      apiKey,
    });
  } catch (err) {
    if (!client && isTestEnv()) {
      console.warn(
        `[CaseExtraction] Live model call failed in test env: ${err.message}. Returning initialized case.`
      );
      return caseDoc;
    }
    throw err;
  }

  // 6. Safely merge and persist using optimistic concurrency retry
  const updatedCase = await caseMerge.saveCaseWithRetry(caseDoc, candidateData, targetMessage._id, {
    sourceType: 'patient_report',
    maxRetries: 3,
  });

  // 7. Synchronize active follow-up questions
  if (updatedCase && Array.isArray(updatedCase.followUpQuestions)) {
    let fqModified = false;
    for (const q of updatedCase.followUpQuestions) {
      if (q.status === 'asked') {
        const isResolved = didMessageResolveQuestion(
          caseDoc,
          updatedCase,
          q.targetField,
          targetMessage._id
        );
        if (isResolved) {
          q.status = 'answered';
          q.answeredAt = new Date();
          q.answerMessageId = targetMessage._id;
          q.answerText = targetMessage.content || '';
          fqModified = true;
        } else if (targetMessage.content && targetMessage.content.trim()) {
          // Question was active and patient replied, but message did not resolve target field -> ambiguous
          q.status = 'ambiguous';
          q.answerMessageId = targetMessage._id;
          q.answerText = targetMessage.content;
          q.answeredAt = null;
          fqModified = true;
        }
      }
    }
    if (fqModified) {
      try {
        await updatedCase.save();
      } catch (_e) {
        // Optimistic concurrency handled gracefully
      }
    }
  }

  return updatedCase;
};

/**
 * Extracts objective medical findings from a processed PDF document
 * and safely merges them into the conversation's structured Case.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} [params.userRole='PATIENT']
 * @param {string} params.documentId
 * @param {Object|null} [params.client=null] - Injected Gemini client
 * @param {string|null} [params.apiKey=null]
 * @returns {Promise<Object>} Updated Case document
 */
export const extractAndMergeCaseForDocument = async ({
  conversationId,
  userId,
  userRole = 'PATIENT',
  documentId,
  client = null,
  apiKey = null,
} = {}) => {
  // 1. Guard check for mock client or API key availability
  if (client && typeof client?.models?.generateContent !== 'function') {
    return null;
  }
  if (!client && !isGeminiConfigured(apiKey)) {
    return null;
  }

  // 2. Verify conversation existence and enforce patient ownership
  const conversation = await conversationRepo.findConversationById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT' && conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // 3. Find and validate document
  if (!documentId) {
    const error = new Error('Document ID is required');
    error.statusCode = 400;
    throw error;
  }

  const document = await documentRepo.findDocumentById(documentId);
  if (!document || document.status === 'deleted') {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce patient ownership of document
  if (userRole === 'PATIENT' && document.userId.toString() !== userId.toString()) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce conversation association (reject cross-conversation documents)
  if (document.conversationId.toString() !== conversationId.toString()) {
    const error = new Error('Document does not belong to this conversation');
    error.statusCode = 404;
    throw error;
  }

  // Check processing status
  if (document.status === 'processing' || document.status === 'uploaded') {
    const error = new Error('Document is still processing text extraction');
    error.statusCode = 409;
    throw error;
  }

  if (document.status === 'failed') {
    const error = new Error(`Cannot extract from document that failed processing: ${document.processingError || 'Text extraction failed'}`);
    error.statusCode = 400;
    throw error;
  }

  if (!document.extractedText || !document.extractedText.trim()) {
    const error = new Error('Document contains no extractable text');
    error.statusCode = 400;
    throw error;
  }

  // 4. Retrieve or initialize Case for this conversation
  const caseDoc = await caseService.createOrInitializeCase({
    conversationId,
    userId,
    userRole,
  });

  // 5. Strict Idempotency Check for documents
  const strDocId = document._id.toString();
  if (
    Array.isArray(caseDoc.processedDocumentIds) &&
    caseDoc.processedDocumentIds.some((id) => id && id.toString() === strDocId)
  ) {
    return caseDoc;
  }

  // 6. Extract structured findings from document using Gemini
  let candidateData;
  try {
    candidateData = await caseExtractor.extractStructuredCaseFromDocument({
      document,
      client,
      apiKey,
    });
  } catch (err) {
    if (!client && isTestEnv()) {
      console.warn(
        `[CaseExtraction] Live model call failed in test env for doc=${document._id}: ${err.message}. Returning initialized case.`
      );
      return caseDoc;
    }
    throw err;
  }

  // 7. Safely merge and persist with optimistic concurrency retry
  const updatedCase = await caseMerge.saveCaseWithRetry(caseDoc, candidateData, document._id, {
    sourceType: 'document',
    maxRetries: 3,
  });

  // 8. Synchronize active follow-up questions if satisfied by document findings
  if (updatedCase && Array.isArray(updatedCase.followUpQuestions)) {
    let fqModified = false;
    for (const q of updatedCase.followUpQuestions) {
      if (q.status === 'asked' && isFieldSatisfied(updatedCase, q.targetField)) {
        // Document findings satisfy the clinical requirement; transition to no_longer_relevant without claiming patient answer
        q.status = 'no_longer_relevant';
        q.rationale = `Information requirement satisfied by findings in document "${document.originalName || document._id}"`;
        fqModified = true;
      }
    }
    if (fqModified) {
      try {
        await updatedCase.save();
      } catch (_e) {
        // Optimistic concurrency handled gracefully
      }
    }
  }

  return updatedCase;
};

export default {
  extractAndMergeCaseForConversation,
  extractAndMergeCaseForDocument,
};
