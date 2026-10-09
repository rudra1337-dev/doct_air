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
};

export default caseService;
