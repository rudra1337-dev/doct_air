import { apiGet, apiPost, apiPatch } from './api';

/**
 * Service for Structured Medical Case retrieval, management, editing, and extraction
 */
export const caseService = {
  /**
   * Retrieve a structured case by case ID
   *
   * @param {string} caseId
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  getCaseById: (caseId) => apiGet(`/cases/${caseId}`),

  /**
   * Retrieve structured case associated with a specific consultation
   *
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  getCaseByConversation: (conversationId) =>
    apiGet(`/conversations/${conversationId}/case`),

  /**
   * List structured cases accessible to the authenticated user
   *
   * @param {Object} [params]
   * @param {string} [params.status]
   * @param {number} [params.limit]
   * @returns {Promise<{ success: boolean, cases: Array }>}
   */
  listCases: ({ status, limit } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    const query = params.toString();
    return apiGet(`/cases${query ? `?${query}` : ''}`);
  },

  /**
   * Create or initialize a structured case for a conversation
   *
   * @param {string} conversationId
   * @param {Object} [initialData]
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  createOrInitCase: (conversationId, initialData = {}) =>
    apiPost(`/conversations/${conversationId}/case`, initialData),

  /**
   * Update permitted structured clinical fields of a case
   *
   * @param {string} caseId
   * @param {Object} updateData
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  updateCase: (caseId, updateData) =>
    apiPatch(`/cases/${caseId}`, updateData),

  /**
   * Update lifecycle status of a case (e.g. in_progress, ready_for_review, reviewed)
   *
   * @param {string} caseId
   * @param {string} status
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  updateCaseStatus: (caseId, status) =>
    apiPatch(`/cases/${caseId}/status`, { status }),

  /**
   * Extract clinical facts from conversation messages and merge into Case
   *
   * @param {string} conversationId
   * @param {string|null} [messageId=null]
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  extractFromConversation: (conversationId, messageId = null) =>
    apiPost(`/conversations/${conversationId}/case/extract`, { messageId }),

  /**
   * Extract clinical findings from a processed document and merge into Case
   *
   * @param {string} conversationId
   * @param {string} documentId
   * @returns {Promise<{ success: boolean, case: Object }>}
   */
  extractFromDocument: (conversationId, documentId) =>
    apiPost(`/conversations/${conversationId}/case/documents/${documentId}/extract`),

  /**
   * Retrieve case completeness and missing information assessment
   *
   * @param {string} caseId
   * @returns {Promise<{ success: boolean, caseId: string, completeness: Object }>}
   */
  getCaseCompleteness: (caseId) =>
    apiGet(`/cases/${caseId}/completeness`),

  /**
   * Retrieve follow-up question status for a conversation (Step 6.2)
   *
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, needed: boolean, activeQuestion: Object, nextQuestion: Object, completeness: Object }>}
   */
  getFollowUpStatus: (conversationId) =>
    apiGet(`/cases/conversation/${conversationId}/follow-up`),

  /**
   * Idempotently ask or retrieve the next follow-up question (Step 6.2)
   *
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, needed: boolean, question: Object, message: Object, completeness: Object }>}
   */
  askFollowUpQuestion: (conversationId) =>
    apiPost(`/cases/conversation/${conversationId}/follow-up/ask`),

  /**
   * Integrate patient answer into follow-up question and structured case (Step 6.2)
   *
   * @param {string} conversationId
   * @param {string} messageId
   * @returns {Promise<{ success: boolean, case: Object, completeness: Object, answeredQuestion: Object, nextQuestion: Object }>}
   */
  integratePatientAnswer: (conversationId, messageId) =>
    apiPost(`/cases/conversation/${conversationId}/follow-up/answer`, { messageId }),

  /**
   * Retrieve the latest Medical Intake Report for a conversation
   *
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, report: Object }>}
   */
  getReportByConversation: (conversationId) =>
    apiGet(`/cases/conversation/${conversationId}/report`),

  /**
   * Retrieve the latest Medical Intake Report by case ID
   *
   * @param {string} caseId
   * @returns {Promise<{ success: boolean, report: Object }>}
   */
  getReportByCaseId: (caseId) =>
    apiGet(`/cases/${caseId}/report`),

  /**
   * Generate or regenerate a versioned Medical Intake Report for a conversation
   *
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, report: Object }>}
   */
  generateReport: (conversationId) =>
    apiPost(`/cases/conversation/${conversationId}/report/generate`, {}),

  /**
   * Generate or regenerate a versioned Medical Intake Report by case ID
   *
   * @param {string} caseId
   * @returns {Promise<{ success: boolean, report: Object }>}
   */
  generateReportByCaseId: (caseId) =>
    apiPost(`/cases/${caseId}/report/generate`, {}),
};

export default caseService;
