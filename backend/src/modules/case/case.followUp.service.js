import mongoose from 'mongoose';
import Case from './models/Case.js';
import * as caseRepo from './case.repository.js';
import * as conversationRepo from '../conversation/conversation.repository.js';
import { evaluateCaseCompleteness } from './case.completeness.service.js';
import { extractAndMergeCaseForConversation } from './case.extraction.service.js';
import { geminiService } from '../ai/index.js';
import { isGeminiConfigured } from '../ai/gemini/gemini.config.js';

const isTestEnv = () =>
  process.env.NODE_ENV === 'test' ||
  (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
  (Array.isArray(process.argv) &&
    process.argv.some((a) => typeof a === 'string' && (a.includes('test') || a.endsWith('.test.js'))));

/**
 * Service for Context-Aware Follow-up Question Selection and Answer Integration (Step 6.2).
 *
 * Utilizes the Step 6.1 Completeness Engine to deterministically prioritize missing information,
 * ask appropriate questions through the patient conversation, and integrate answers safely.
 */

/**
 * Helper to check whether a target field is satisfied in a Case document
 *
 * @param {Object} caseDoc
 * @param {string} targetField
 * @returns {boolean}
 */
export const isFieldSatisfied = (caseDoc, targetField) => {
  if (!caseDoc || !targetField) return false;
  const hasText = (val) => typeof val === 'string' && val.trim().length > 0;

  switch (targetField) {
    case 'chiefComplaint':
      return hasText(caseDoc.chiefComplaint?.text);
    case 'symptoms':
      return Array.isArray(caseDoc.symptoms) && caseDoc.symptoms.length > 0;
    case 'timing':
    case 'onset':
    case 'duration': {
      const hasOnset = hasText(caseDoc.onset?.value);
      const hasDuration = hasText(caseDoc.duration?.value);
      const hasSymptomTiming =
        Array.isArray(caseDoc.symptoms) &&
        caseDoc.symptoms.some((s) => hasText(s.onset) || hasText(s.duration));
      if (targetField === 'timing') return hasOnset || hasDuration || hasSymptomTiming;
      if (targetField === 'onset') return hasOnset || (Array.isArray(caseDoc.symptoms) && caseDoc.symptoms.some((s) => hasText(s.onset)));
      if (targetField === 'duration') return hasDuration || (Array.isArray(caseDoc.symptoms) && caseDoc.symptoms.some((s) => hasText(s.duration)));
      return false;
    }
    case 'severity': {
      const hasOverall = hasText(caseDoc.severity?.value);
      const hasSymSeverity =
        Array.isArray(caseDoc.symptoms) &&
        caseDoc.symptoms.some((s) => s.severity && s.severity !== 'unspecified');
      return hasOverall || hasSymSeverity;
    }
    case 'symptomLocation':
      return hasText(caseDoc.symptomLocation?.value) || (Array.isArray(caseDoc.symptoms) && caseDoc.symptoms.some((s) => hasText(s.location)));
    case 'medications':
      return Array.isArray(caseDoc.medications) && caseDoc.medications.length > 0;
    case 'allergies':
      return Array.isArray(caseDoc.allergies) && caseDoc.allergies.length > 0;
    case 'relevantMedicalHistory':
      return Array.isArray(caseDoc.relevantMedicalHistory) && caseDoc.relevantMedicalHistory.length > 0;
    default:
      return false;
  }
};

/**
 * Evaluates whether a specific patient message genuinely addressed and resolved
 * a follow-up question for targetField.
 *
 * @param {Object|null} beforeCase - State of Case prior to message extraction
 * @param {Object|null} updatedCase - State of Case after message extraction and merge
 * @param {string} targetField - Target field of the question
 * @param {string|Object} messageId - ID of the patient message
 * @returns {boolean} True if the message contributed genuine information resolving targetField
 */
export const didMessageResolveQuestion = (beforeCase, updatedCase, targetField, messageId) => {
  if (!updatedCase || !targetField || !messageId) return false;

  const strMsgId = messageId.toString();

  const isMsgSource = (source) => {
    if (!source) return false;
    const srcId = source.messageId || source.sourceId || source.id;
    return srcId ? srcId.toString() === strMsgId : false;
  };

  // 1. Check if the message triggered a recorded discrepancy for targetField
  if (Array.isArray(updatedCase.discrepancies)) {
    const hasDiscrepancyFromMsg = updatedCase.discrepancies.some((d) => {
      if (!isMsgSource(d.source)) return false;
      if (d.field === targetField) return true;
      if (targetField === 'timing' && (d.field === 'onset' || d.field === 'duration')) return true;
      return false;
    });
    if (hasDiscrepancyFromMsg) return true;
  }

  // 2. Check if scalar field in updatedCase was sourced from this message
  if (['chiefComplaint', 'onset', 'duration', 'severity', 'symptomLocation'].includes(targetField)) {
    if (isMsgSource(updatedCase[targetField]?.source)) {
      return true;
    }
  }

  // 3. For 'timing', check both onset and duration sources as well as symptom timing
  if (targetField === 'timing') {
    if (isMsgSource(updatedCase.onset?.source) || isMsgSource(updatedCase.duration?.source)) {
      return true;
    }
    if (Array.isArray(updatedCase.symptoms)) {
      const symTimingFromMsg = updatedCase.symptoms.some(
        (s) => isMsgSource(s.source) && (s.onset || s.duration)
      );
      if (symTimingFromMsg) return true;
    }
  }

  // 4. For array fields, check if any item is sourced from this message
  if (targetField === 'symptoms' && Array.isArray(updatedCase.symptoms)) {
    if (updatedCase.symptoms.some((s) => isMsgSource(s.source))) return true;
  }
  if (targetField === 'medications' && Array.isArray(updatedCase.medications)) {
    if (updatedCase.medications.some((m) => isMsgSource(m.source))) return true;
  }
  if (targetField === 'allergies' && Array.isArray(updatedCase.allergies)) {
    if (updatedCase.allergies.some((a) => isMsgSource(a.source))) return true;
  }
  if (targetField === 'relevantMedicalHistory' && Array.isArray(updatedCase.relevantMedicalHistory)) {
    if (updatedCase.relevantMedicalHistory.some((h) => isMsgSource(h.source))) return true;
  }

  // 5. If field was previously unsatisfied and is NOW satisfied:
  const wasSatisfiedBefore = beforeCase ? isFieldSatisfied(beforeCase, targetField) : false;
  const isSatisfiedAfter = isFieldSatisfied(updatedCase, targetField);

  if (!wasSatisfiedBefore && isSatisfiedAfter) {
    return true;
  }

  return false;
};

/**
 * Deterministically determines whether a follow-up question is needed
 * and selects the highest-priority question according to clinical intake rules.
 *
 * Priority order:
 * 1. Missing Required Information (chiefComplaint -> symptoms -> timing -> severity -> critical intake flags)
 * 2. Incomplete Fields (unspecified severity, missing dosages, brief complaint)
 * 3. Unresolved Discrepancies (competing statements needing patient clarification)
 * 4. Missing Optional Information (used sparingly; max 2 optional questions per case)
 *
 * @param {Object} caseDoc
 * @returns {Object} Structured question selection result
 */
export const selectNextFollowUpQuestion = (caseDoc) => {
  if (!caseDoc) {
    return {
      needed: false,
      questionKey: null,
      targetField: null,
      category: null,
      questionText: null,
      rationale: 'No case record provided.',
      completenessItem: null,
    };
  }

  const completeness = evaluateCaseCompleteness(caseDoc);
  const existingQuestions = Array.isArray(caseDoc.followUpQuestions)
    ? caseDoc.followUpQuestions
    : [];

  // 1. Check if there is already an active question awaiting answer
  const activeQuestion = existingQuestions.find((q) => q.status === 'asked');
  if (activeQuestion) {
    // Check if the target field was satisfied in the meantime (e.g. via document extraction or edit)
    const satisfied = isFieldSatisfied(caseDoc, activeQuestion.targetField);
    if (!satisfied) {
      return {
        needed: true,
        active: true,
        questionKey: activeQuestion.questionKey,
        targetField: activeQuestion.targetField,
        category: activeQuestion.category,
        questionText: activeQuestion.questionText,
        rationale: activeQuestion.rationale,
        completenessItem: null,
      };
    }
  }

  // Set of questionKeys that have been asked (whether answered, ambiguous, or no longer relevant)
  const askedKeys = new Set(existingQuestions.map((q) => q.questionKey));

  // ── PRIORITY 1: Missing Required Information ──────────────────────────────
  const requiredMissing = completeness.missingRequiredInformation || [];
  for (const item of requiredMissing) {
    const field = item.field;

    if (field === 'chiefComplaint' && !askedKeys.has('chiefComplaint')) {
      return {
        needed: true,
        questionKey: 'chiefComplaint',
        targetField: 'chiefComplaint',
        category: 'required',
        questionText: 'What is the primary medical concern or reason for your consultation today?',
        rationale: 'A chief complaint is required for clinical review.',
        completenessItem: item,
      };
    }

    if (field === 'symptoms' && !askedKeys.has('symptoms')) {
      return {
        needed: true,
        questionKey: 'symptoms',
        targetField: 'symptoms',
        category: 'required',
        questionText: 'What specific symptoms are you experiencing?',
        rationale: 'At least one reported symptom is required for clinical review.',
        completenessItem: item,
      };
    }

    if (field === 'timing' && !askedKeys.has('timing')) {
      return {
        needed: true,
        questionKey: 'timing',
        targetField: 'timing',
        category: 'required',
        questionText: 'When did your symptoms begin, or how long have they been going on?',
        rationale: 'Symptom timing (onset or duration) is required for clinical review.',
        completenessItem: item,
      };
    }

    if (field === 'severity' && !askedKeys.has('severity')) {
      return {
        needed: true,
        questionKey: 'severity',
        targetField: 'severity',
        category: 'required',
        questionText: 'How would you describe the severity of your symptoms right now (mild, moderate, or severe)?',
        rationale: 'Symptom severity is required for clinical review.',
        completenessItem: item,
      };
    }

    if (field.startsWith('missingInfo.') && !askedKeys.has(field)) {
      const categoryName = item.category || 'details';
      return {
        needed: true,
        questionKey: field,
        targetField: categoryName,
        category: 'required',
        questionText: `Could you share more information about your ${categoryName.replace(/_/g, ' ')}?`,
        rationale: item.reason || 'Critical uncollected clinical information.',
        completenessItem: item,
      };
    }
  }

  // ── PRIORITY 2: Incomplete Fields (Clarifications) ────────────────────────
  const incomplete = completeness.incompleteFields || [];
  for (const item of incomplete) {
    const key = `clarify_${item.field}`;
    if (askedKeys.has(key)) continue;

    if (item.field === 'chiefComplaint') {
      return {
        needed: true,
        questionKey: key,
        targetField: 'chiefComplaint',
        category: 'incomplete',
        questionText: 'Could you provide a little more detail about your primary concern?',
        rationale: item.reason,
        completenessItem: item,
      };
    }

    if (item.field.endsWith('.severity')) {
      return {
        needed: true,
        questionKey: key,
        targetField: 'symptoms',
        category: 'incomplete',
        questionText: `Could you clarify the severity of ${item.label.replace(' Severity', '')} (mild, moderate, or severe)?`,
        rationale: item.reason,
        completenessItem: item,
      };
    }

    if (item.field.startsWith('medications.')) {
      return {
        needed: true,
        questionKey: key,
        targetField: 'medications',
        category: 'incomplete',
        questionText: `Could you tell us what dosage or how often you take ${item.label.replace(' Details', '')}?`,
        rationale: item.reason,
        completenessItem: item,
      };
    }

    if (item.field.startsWith('allergies.')) {
      return {
        needed: true,
        questionKey: key,
        targetField: 'allergies',
        category: 'incomplete',
        questionText: `What type of reaction do you experience with ${item.label.replace(' Details', '')}?`,
        rationale: item.reason,
        completenessItem: item,
      };
    }
  }

  // ── PRIORITY 3: Unresolved Discrepancies ──────────────────────────────────
  const discrepancies = completeness.unresolvedDiscrepancies || [];
  for (const disc of discrepancies) {
    const key = `discrepancy_${disc.field}`;
    if (askedKeys.has(key)) continue;

    return {
      needed: true,
      questionKey: key,
      targetField: disc.field,
      category: 'discrepancy',
      questionText: `We noticed different details mentioned for your ${disc.field} (previously "${disc.previousValue}" and now "${disc.newValue}"). Could you please clarify which one is accurate?`,
      rationale: `Clarification needed between competing statements for ${disc.field}.`,
      completenessItem: disc,
    };
  }

  // ── PRIORITY 4: Optional Information (Used Sparingly; Max 2 per Case) ─────
  const optionalAskedCount = existingQuestions.filter((q) => q.category === 'optional').length;

  if (optionalAskedCount < 2) {
    const optionalMissing = completeness.missingOptionalInformation || [];

    for (const item of optionalMissing) {
      const field = item.field;
      const key = `optional_${field}`;
      if (askedKeys.has(key)) continue;

      if (field === 'symptomLocation') {
        return {
          needed: true,
          questionKey: key,
          targetField: 'symptomLocation',
          category: 'optional',
          questionText: 'Where specifically on your body are you experiencing these symptoms?',
          rationale: 'Symptom location provides helpful clinical context.',
          completenessItem: item,
        };
      }

      if (field === 'medications') {
        return {
          needed: true,
          questionKey: key,
          targetField: 'medications',
          category: 'optional',
          questionText: 'Are you currently taking any prescription medications or over-the-counter drugs?',
          rationale: 'Current medications provide helpful context for clinicians.',
          completenessItem: item,
        };
      }

      if (field === 'allergies') {
        return {
          needed: true,
          questionKey: key,
          targetField: 'allergies',
          category: 'optional',
          questionText: 'Do you have any known allergies to medications, foods, or environmental substances?',
          rationale: 'Known allergies help avoid adverse interactions.',
          completenessItem: item,
        };
      }

      if (field === 'relevantMedicalHistory') {
        return {
          needed: true,
          questionKey: key,
          targetField: 'relevantMedicalHistory',
          category: 'optional',
          questionText: 'Do you have any relevant past medical conditions or chronic illnesses?',
          rationale: 'Past medical history provides background context for the healthcare provider.',
          completenessItem: item,
        };
      }
    }
  }

  // ── STOPPING RULE: No further required or relevant clarification identified
  return {
    needed: false,
    questionKey: null,
    targetField: null,
    category: null,
    questionText: null,
    rationale: 'All core intake requirements are satisfied and no further questions are necessary.',
    completenessItem: null,
  };
};

/**
 * Rephrases a base question naturally using Gemini if configured,
 * with deterministic fallback on any error or missing client.
 *
 * @param {Object} params
 * @param {Object} params.baseQuestion
 * @param {Array} [params.contextMessages]
 * @param {Object|null} [params.client=null]
 * @param {string|null} [params.apiKey=null]
 * @returns {Promise<string>} Natural question text
 */
export const phraseQuestionNaturally = async ({
  baseQuestion,
  contextMessages = [],
  client = null,
  apiKey = null,
}) => {
  if (!baseQuestion?.questionText) return '';

  // If Gemini is not configured or in test env without mock client, return deterministic question
  if (!client && (!isGeminiConfigured(apiKey) || isTestEnv())) {
    return baseQuestion.questionText;
  }

  try {
    const prompt = `You are DoctAir's healthcare conversational assistant.
Your task is to rephrase the following single intake follow-up question so it sounds natural, compassionate, and patient-friendly.
CRITICAL RULES:
- Ask ONLY this single question. Do not ask multiple questions.
- Do NOT provide medical advice, diagnosis, or triage scores.
- Return ONLY the rephrased question text. No preambles or quotes.

Original question: "${baseQuestion.questionText}"`;

    const response = await geminiService.generateResponse({
      messages: [{ role: 'user', content: prompt }],
      client,
      apiKey,
      config: { temperature: 0.2, maxOutputTokens: 150 },
    });

    const phrased = (response.text || '').trim();
    if (phrased && phrased.length > 5 && !phrased.includes('{') && !phrased.includes('```')) {
      return phrased.replace(/^["']|["']$/g, '');
    }
    return baseQuestion.questionText;
  } catch (_err) {
    // Graceful fallback to deterministic text
    return baseQuestion.questionText;
  }
};

/**
 * Retrieves the current follow-up question status for a conversation,
 * ensuring patient ownership boundaries.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} [params.userRole='PATIENT']
 * @returns {Promise<Object>} Status object
 */
export const getFollowUpStatus = async ({ conversationId, userId, userRole = 'PATIENT' }) => {
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

  const caseDoc = await caseRepo.findCaseByConversationId(conversationId);
  if (!caseDoc) {
    return {
      caseId: null,
      conversationId,
      needed: true,
      activeQuestion: null,
      nextQuestion: {
        questionKey: 'chiefComplaint',
        targetField: 'chiefComplaint',
        category: 'required',
        questionText: 'What is the primary medical concern or reason for your consultation today?',
        rationale: 'A chief complaint is required for clinical review.',
      },
      completeness: evaluateCaseCompleteness(null),
      questionsHistory: [],
    };
  }

  // Cross-patient boundary check
  if (userRole === 'PATIENT' && caseDoc.patientId.toString() !== userId.toString()) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  // Synchronize question statuses if fields became satisfied
  let modified = false;
  if (Array.isArray(caseDoc.followUpQuestions)) {
    for (const q of caseDoc.followUpQuestions) {
      if (q.status === 'asked' && isFieldSatisfied(caseDoc, q.targetField)) {
        if (!q.answerMessageId) {
          q.status = 'no_longer_relevant';
          q.rationale = 'Information requirement satisfied by external clinical data or document.';
        } else {
          q.status = 'answered';
          q.answeredAt = q.answeredAt || new Date();
        }
        modified = true;
      }
    }
    if (modified) {
      await caseDoc.save();
    }
  }

  const completeness = evaluateCaseCompleteness(caseDoc);
  const activeQuestion = (caseDoc.followUpQuestions || []).find((q) => q.status === 'asked') || null;
  const nextSelection = selectNextFollowUpQuestion(caseDoc);

  return {
    caseId: caseDoc._id.toString(),
    conversationId,
    needed: nextSelection.needed,
    activeQuestion,
    nextQuestion: nextSelection.needed ? nextSelection : null,
    completeness,
    questionsHistory: caseDoc.followUpQuestions || [],
  };
};

/**
 * Idempotently asks or retrieves the next follow-up question for a conversation.
 * If an active question is already awaiting an answer, returns it without creating a duplicate message.
 * If no question is active, selects the next question, creates an assistant message in the conversation,
 * and tracks the question in the Case document.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} [params.userRole='PATIENT']
 * @param {Object|null} [params.client=null]
 * @param {string|null} [params.apiKey=null]
 * @returns {Promise<Object>}
 */
export const askOrGetFollowUpQuestion = async ({
  conversationId,
  userId,
  userRole = 'PATIENT',
  client = null,
  apiKey = null,
}) => {
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

  // Load or initialize Case for this conversation
  let caseDoc = await caseRepo.findCaseByConversationId(conversationId);
  if (!caseDoc) {
    caseDoc = await caseRepo.createCase({
      patientId: userId,
      conversationId,
      status: 'in_progress',
    });
  }

  if (userRole === 'PATIENT' && caseDoc.patientId.toString() !== userId.toString()) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  // 1. Synchronize any existing questions whose target field is now satisfied
  let docModified = false;
  if (Array.isArray(caseDoc.followUpQuestions)) {
    for (const q of caseDoc.followUpQuestions) {
      if (q.status === 'asked' && isFieldSatisfied(caseDoc, q.targetField)) {
        if (!q.answerMessageId) {
          q.status = 'no_longer_relevant';
          q.rationale = 'Information requirement satisfied by external clinical data or document.';
        } else {
          q.status = 'answered';
          q.answeredAt = q.answeredAt || new Date();
        }
        docModified = true;
      }
    }
  }

  // 2. Check if there is already an active question with status 'asked'
  const existingActive = (caseDoc.followUpQuestions || []).find((q) => q.status === 'asked');
  if (existingActive) {
    if (!existingActive.messageId) {
      // Orphaned reservation from past crash/failure without a message: clean it up
      await Case.updateOne(
        { _id: caseDoc._id },
        { $pull: { followUpQuestions: { _id: existingActive._id, messageId: null } } }
      );
      caseDoc = await Case.findById(caseDoc._id);
    } else {
      if (docModified) await caseDoc.save();
      const completeness = evaluateCaseCompleteness(caseDoc);
      return {
        needed: true,
        alreadyActive: true,
        question: existingActive,
        completeness,
      };
    }
  }

  // 3. Select next question
  const nextSelection = selectNextFollowUpQuestion(caseDoc);
  if (!nextSelection.needed) {
    if (docModified) await caseDoc.save();
    const completeness = evaluateCaseCompleteness(caseDoc);
    return {
      needed: false,
      question: null,
      message: null,
      completeness,
    };
  }

  // 4. Generate natural question text
  const naturalText = await phraseQuestionNaturally({
    baseQuestion: nextSelection,
    client,
    apiKey,
  });

  // 5. Atomically reserve question on Case to eliminate concurrency races
  const questionId = new mongoose.Types.ObjectId();
  const reservedCase = await Case.findOneAndUpdate(
    {
      _id: caseDoc._id,
      'followUpQuestions.status': { $ne: 'asked' },
    },
    {
      $push: {
        followUpQuestions: {
          _id: questionId,
          questionKey: nextSelection.questionKey,
          targetField: nextSelection.targetField,
          category: nextSelection.category,
          questionText: naturalText,
          rationale: nextSelection.rationale,
          status: 'asked',
          askedAt: new Date(),
          messageId: null,
        },
      },
    },
    { returnDocument: 'after' }
  );

  if (!reservedCase) {
    // Another concurrent request already reserved an active question!
    const latestCase = await Case.findById(caseDoc._id);
    const active = (latestCase.followUpQuestions || []).find((q) => q.status === 'asked');
    return {
      needed: true,
      alreadyActive: true,
      question: active,
      completeness: evaluateCaseCompleteness(latestCase),
    };
  }

  // 6. Only the single winning reservation creates the assistant message
  let message;
  try {
    message = await conversationRepo.createMessage({
      conversationId,
      role: 'assistant',
      content: naturalText,
      inputMode: 'text',
      status: 'completed',
    });

    // Update conversation timestamp
    await conversationRepo.updateConversationLastMessage(
      conversationId,
      message.createdAt || new Date()
    );

    // Link messageId onto the reserved question in Case
    await Case.updateOne(
      { _id: caseDoc._id, 'followUpQuestions._id': questionId },
      { $set: { 'followUpQuestions.$.messageId': message._id } }
    );
  } catch (err) {
    // Roll back uncommitted reservation so failed message creation cannot leave a permanently stuck reservation
    await Case.updateOne(
      { _id: caseDoc._id },
      { $pull: { followUpQuestions: { _id: questionId, messageId: null } } }
    );
    throw err;
  }

  const updatedCase = await Case.findById(caseDoc._id);
  const newQuestion = (updatedCase.followUpQuestions || []).find(
    (q) => q._id.toString() === questionId.toString()
  );
  const completeness = evaluateCaseCompleteness(updatedCase);

  return {
    needed: true,
    alreadyActive: false,
    question: newQuestion,
    message,
    completeness,
  };
};

/**
 * Integrates a patient answer message into the active follow-up question and structured case.
 * Runs extraction, associates the answer message with the active question, updates question status
 * (answered, ambiguous, or no longer relevant), and recalculates completeness.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} [params.userRole='PATIENT']
 * @param {string} params.messageId
 * @param {Object|null} [params.client=null]
 * @param {string|null} [params.apiKey=null]
 * @returns {Promise<Object>}
 */
export const integratePatientAnswer = async ({
  conversationId,
  userId,
  userRole = 'PATIENT',
  messageId,
  client = null,
  apiKey = null,
}) => {
  // 1. Enforce ownership and existence
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

  const userMessage = await conversationRepo.findMessageById(messageId);
  if (!userMessage || userMessage.conversationId.toString() !== conversationId.toString()) {
    const error = new Error('Message not found in this conversation');
    error.statusCode = 404;
    throw error;
  }

  if (userMessage.role !== 'user') {
    const error = new Error('Message must be a patient message');
    error.statusCode = 400;
    throw error;
  }

  // Capture Case state BEFORE message extraction to evaluate whether this message genuinely resolves the question
  const beforeCase = await caseRepo.findCaseByConversationId(conversationId);

  // 2. Perform clinical extraction & merge into Case
  const updatedCase = await extractAndMergeCaseForConversation({
    conversationId,
    userId,
    userRole,
    messageId,
    client,
    apiKey,
  });

  if (!updatedCase) {
    const currentCase = await caseRepo.findCaseByConversationId(conversationId);
    return {
      case: currentCase,
      completeness: evaluateCaseCompleteness(currentCase),
      answeredQuestion: null,
      nextQuestion: selectNextFollowUpQuestion(currentCase),
    };
  }

  // 3. Match and retrieve active or answered follow-up question
  let answeredQuestion = null;
  if (Array.isArray(updatedCase.followUpQuestions)) {
    answeredQuestion =
      updatedCase.followUpQuestions.find(
        (q) => q.answerMessageId && q.answerMessageId.toString() === userMessage._id.toString()
      ) ||
      updatedCase.followUpQuestions.find((q) => q.status === 'asked') ||
      null;

    if (answeredQuestion && answeredQuestion.status === 'asked') {
      const isResolved = didMessageResolveQuestion(
        beforeCase,
        updatedCase,
        answeredQuestion.targetField,
        userMessage._id
      );

      if (isResolved) {
        answeredQuestion.status = 'answered';
        answeredQuestion.answeredAt = new Date();
        answeredQuestion.answerMessageId = userMessage._id;
        answeredQuestion.answerText = userMessage.content;
      } else {
        // Patient answered, but did not provide unambiguous/definitive data for the target field
        answeredQuestion.status = 'ambiguous';
        answeredQuestion.answerMessageId = userMessage._id;
        answeredQuestion.answerText = userMessage.content;
        answeredQuestion.answeredAt = null;
      }

      await updatedCase.save();
    }
  }

  const completeness = evaluateCaseCompleteness(updatedCase);
  const nextQuestion = selectNextFollowUpQuestion(updatedCase);

  return {
    case: updatedCase,
    completeness,
    answeredQuestion,
    nextQuestion: nextQuestion.needed ? nextQuestion : null,
  };
};

export default {
  isFieldSatisfied,
  didMessageResolveQuestion,
  selectNextFollowUpQuestion,
  phraseQuestionNaturally,
  getFollowUpStatus,
  askOrGetFollowUpQuestion,
  integratePatientAnswer,
};
