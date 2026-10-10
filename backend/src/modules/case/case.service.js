import * as caseRepo from './case.repository.js';
import * as conversationRepo from '../conversation/conversation.repository.js';
import {
  evaluateCaseCompleteness,
  getCaseCompleteness,
} from './case.completeness.service.js';
import {
  selectNextFollowUpQuestion,
  getFollowUpStatus,
  askOrGetFollowUpQuestion,
  integratePatientAnswer,
  didMessageResolveQuestion,
} from './case.followUp.service.js';

export {
  evaluateCaseCompleteness,
  getCaseCompleteness,
  selectNextFollowUpQuestion,
  getFollowUpStatus,
  askOrGetFollowUpQuestion,
  integratePatientAnswer,
  didMessageResolveQuestion,
};

/**
 * Service layer for Structured Medical Case management, security boundaries, and data integrity.
 *
 * Implements clinical case intake persistence and lifecycle management.
 * Does NOT call Gemini, compute triage scores, or invent missing data.
 */

const PERMITTED_UPDATE_FIELDS = [
  'chiefComplaint',
  'symptoms',
  'onset',
  'duration',
  'severity',
  'symptomLocation',
  'associatedSymptoms',
  'relevantMedicalHistory',
  'medications',
  'allergies',
  'vitals',
  'reportFindings',
  'timeline',
  'missingInformation',
];

const VALID_STATUSES = ['in_progress', 'ready_for_review', 'reviewed'];

/**
 * Creates or initializes a structured case for an authorized conversation.
 * Enforces one primary case per conversation (idempotent; returns existing if already initialized).
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {Object} [params.initialData]
 * @returns {Promise<Object>} Created or existing case document
 */
export const createOrInitializeCase = async ({
  conversationId,
  userId,
  userRole,
  initialData = {},
}) => {
  // 1. Verify conversation exists and enforce ownership
  const conversation = await conversationRepo.findConversationById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // Patients can only initialize cases for their own conversations
  if (userRole === 'PATIENT' && conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Check if a case already exists for this conversation (prevent duplicate primary cases)
  const existingCase = await caseRepo.findCaseByConversationId(conversationId);
  if (existingCase) {
    return existingCase;
  }

  // 3. Prepare initial case payload
  const payload = {
    patientId: conversation.userId,
    conversationId: conversation._id,
    status:
      initialData.status && VALID_STATUSES.includes(initialData.status)
        ? initialData.status
        : 'in_progress',
  };

  // Safely populate any permitted structured fields provided at initialization
  for (const field of PERMITTED_UPDATE_FIELDS) {
    if (initialData[field] !== undefined) {
      payload[field] = initialData[field];
    }
  }

  return caseRepo.createCase(payload);
};

/**
 * Retrieves the case associated with a specific conversation.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>} Case document
 */
export const getCaseByConversationId = async ({ conversationId, userId, userRole }) => {
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
    const error = new Error('Case not found for this consultation');
    error.statusCode = 404;
    throw error;
  }

  return caseDoc;
};

/**
 * Retrieves a structured medical case by its unique ID.
 *
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>} Case document
 */
export const getCaseById = async ({ caseId, userId, userRole }) => {
  const caseDoc = await caseRepo.findCaseById(caseId);
  if (!caseDoc) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent cross-patient case access
  if (userRole === 'PATIENT' && caseDoc.patientId.toString() !== userId.toString()) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  return caseDoc;
};

/**
 * Updates permitted structured fields of an existing medical case.
 * Validates updates, prevents altering patientId/conversationId, and does not silently overwrite with empty values.
 *
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {Object} params.updateData
 * @returns {Promise<Object>} Updated case document
 */
export const updateCase = async ({ caseId, userId, userRole, updateData }) => {
  const existingCase = await caseRepo.findCaseById(caseId);
  if (!existingCase) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  if (userRole === 'PATIENT' && existingCase.patientId.toString() !== userId.toString()) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent changing ownership or conversation association
  if (
    updateData.patientId &&
    updateData.patientId.toString() !== existingCase.patientId.toString()
  ) {
    const error = new Error('Cannot change patient ownership of an existing case');
    error.statusCode = 400;
    throw error;
  }

  if (
    updateData.conversationId &&
    updateData.conversationId.toString() !== existingCase.conversationId.toString()
  ) {
    const error = new Error('Cannot change conversation association of an existing case');
    error.statusCode = 400;
    throw error;
  }

  const safeUpdate = {};

  // Single-value fields with text/value and source attribution:
  const textFields = ['chiefComplaint', 'onset', 'duration', 'severity', 'symptomLocation'];
  for (const field of textFields) {
    if (updateData[field] !== undefined) {
      const val = updateData[field];
      if (val === null || val === '') {
        // Do not silently overwrite existing data with empty values
        continue;
      }
      if (typeof val === 'string' && val.trim().length > 0) {
        safeUpdate[field] = {
          ...(field === 'chiefComplaint' ? { text: val.trim() } : { value: val.trim() }),
          source: existingCase[field]?.source || null,
        };
      } else if (typeof val === 'object') {
        const textVal = field === 'chiefComplaint' ? val.text : val.value;
        if (textVal && typeof textVal === 'string' && textVal.trim().length > 0) {
          safeUpdate[field] = {
            ...(field === 'chiefComplaint'
              ? { text: textVal.trim() }
              : { value: textVal.trim() }),
            source: val.source !== undefined ? val.source : existingCase[field]?.source || null,
          };
        }
      }
    }
  }

  // Array fields:
  const arrayFields = [
    'symptoms',
    'associatedSymptoms',
    'relevantMedicalHistory',
    'medications',
    'allergies',
    'vitals',
    'reportFindings',
    'timeline',
    'missingInformation',
  ];

  for (const field of arrayFields) {
    if (updateData[field] !== undefined) {
      if (Array.isArray(updateData[field])) {
        // If an empty array is provided, do not silently wipe existing data unless explicitly intended
        if (updateData[field].length > 0) {
          safeUpdate[field] = updateData[field];
        }
      }
    }
  }

  // Optional status update included in body
  if (updateData.status && VALID_STATUSES.includes(updateData.status)) {
    if (userRole === 'PATIENT') {
      if (updateData.status === 'reviewed') {
        const error = new Error('Only clinical professionals may mark a case as reviewed');
        error.statusCode = 403;
        throw error;
      }
      if (updateData.status === 'ready_for_review') {
        const simulated = { ...(existingCase.toObject ? existingCase.toObject() : existingCase), ...safeUpdate };
        const completeness = evaluateCaseCompleteness(simulated);
        if (!completeness.canSubmitForReview) {
          const missingLabels = completeness.missingRequiredInformation
            .map((m) => m.label)
            .join(', ');
          const error = new Error(
            `Cannot submit case for review: required clinical intake information is missing (${missingLabels})`
          );
          error.statusCode = 400;
          throw error;
        }
      }
    }
    safeUpdate.status = updateData.status;
  }

  return caseRepo.updateCaseById(caseId, safeUpdate);
};

/**
 * Updates the lifecycle status of a medical case.
 *
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string} params.status
 * @returns {Promise<Object>} Updated case document
 */
export const updateCaseStatus = async ({ caseId, userId, userRole, status }) => {
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const existingCase = await caseRepo.findCaseById(caseId);
  if (!existingCase) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT') {
    if (existingCase.patientId.toString() !== userId.toString()) {
      const error = new Error('Case not found');
      error.statusCode = 404;
      throw error;
    }

    if (status === 'reviewed') {
      const error = new Error('Only clinical professionals may mark a case as reviewed');
      error.statusCode = 403;
      throw error;
    }

    if (status === 'ready_for_review') {
      const completeness = evaluateCaseCompleteness(existingCase);
      if (!completeness.canSubmitForReview) {
        const missingLabels = completeness.missingRequiredInformation
          .map((m) => m.label)
          .join(', ');
        const error = new Error(
          `Cannot submit case for review: required clinical intake information is missing (${missingLabels})`
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  return caseRepo.updateCaseById(caseId, { status });
};

/**
 * Lists structured cases accessible to the authenticated user.
 * Patients only see their own cases; Clinicians/Admins see all cases (optionally filtered by status).
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string|null} [params.status=null]
 * @param {number} [params.limit=50]
 * @returns {Promise<Array>} Cases list
 */
export const listCases = async ({ userId, userRole, status = null, limit = 50 }) => {
  const query = {};
  if (status && VALID_STATUSES.includes(status)) {
    query.status = status;
  }

  if (userRole === 'PATIENT') {
    query.patientId = userId;
    return caseRepo.findCasesByPatientId(userId, { limit });
  }

  // Clinician or Admin
  return caseRepo.findAllCases(query, { limit });
};

export default {
  createOrInitializeCase,
  getCaseByConversationId,
  getCaseById,
  updateCase,
  updateCaseStatus,
  listCases,
  evaluateCaseCompleteness,
  getCaseCompleteness,
  selectNextFollowUpQuestion,
  getFollowUpStatus,
  askOrGetFollowUpQuestion,
  integratePatientAnswer,
};
