import { apiGet, apiDelete, apiClient } from './api';

/**
 * Service for conversation PDF medical report document management and processing
 */
export const documentService = {
  /**
   * Upload a PDF document to a conversation
   *
   * @param {string} conversationId
   * @param {File} file
   * @param {Object} [options]
   * @param {Function} [options.onUploadProgress]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ success: boolean, document: Object }>}
   */
  uploadDocument: (conversationId, file, { onUploadProgress, signal } = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post(`/conversations/${conversationId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
      onUploadProgress,
      signal,
    });
  },

  /**
   * Fetch all documents attached to a conversation
   *
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, documents: Array }>}
   */
  getDocuments: (conversationId) =>
    apiGet(`/conversations/${conversationId}/documents`),

  /**
   * Fetch a single document by ID including processing status
   *
   * @param {string} conversationId
   * @param {string} documentId
   * @returns {Promise<{ success: boolean, document: Object }>}
   */
  getDocument: (conversationId, documentId) =>
    apiGet(`/conversations/${conversationId}/documents/${documentId}`),

  /**
   * Retry processing for a document whose text extraction failed
   *
   * @param {string} conversationId
   * @param {string} documentId
   * @returns {Promise<{ success: boolean, document: Object }>}
   */
  retryProcessing: (conversationId, documentId) =>
    apiClient.post(`/conversations/${conversationId}/documents/${documentId}/retry`),

  /**
   * Delete a document from a conversation
   *
   * @param {string} conversationId
   * @param {string} documentId
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  deleteDocument: (conversationId, documentId) =>
    apiDelete(`/conversations/${conversationId}/documents/${documentId}`),
};

export default documentService;
