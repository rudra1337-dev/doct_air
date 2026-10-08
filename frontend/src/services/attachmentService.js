import { apiClient } from './api';

/**
 * Service for managing temporary draft PDF attachments
 */
export const attachmentService = {
  /**
   * Uploads a draft PDF report into temporary backend storage
   *
   * @param {File} file - PDF file to upload
   * @param {string} [conversationId] - Optional current conversation ID
   * @param {Object} [options]
   * @param {Function} [options.onUploadProgress] - Axios upload progress callback
   * @param {AbortSignal} [options.signal] - Abort signal to cancel running upload
   * @returns {Promise<{ success: boolean, attachment: Object }>}
   */
  uploadDraft: (file, conversationId, { onUploadProgress, signal } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    return apiClient.post('/attachments/draft', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
      onUploadProgress,
      signal,
    });
  },

  /**
   * Retrieves metadata for a draft attachment
   *
   * @param {string} attachmentId
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ success: boolean, attachment: Object }>}
   */
  getDraft: (attachmentId, { signal } = {}) => {
    return apiClient.get(`/attachments/draft/${attachmentId}`, { signal });
  },

  /**
   * Deletes a draft attachment and unlinks its temporary file
   *
   * @param {string} attachmentId
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ success: boolean }>}
   */
  deleteDraft: (attachmentId, { signal } = {}) => {
    return apiClient.delete(`/attachments/draft/${attachmentId}`, { signal });
  },
};

export default attachmentService;
