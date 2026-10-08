import { useState, useCallback, useRef, useEffect } from 'react';
import attachmentService from '../../../../services/attachmentService';
import { validatePdfFile } from '../utils/documentUtils';

/**
 * Custom hook to manage the full client-side draft attachment lifecycle:
 * - Mount draft cards on file selection
 * - Upload to temporary backend storage
 * - Track progress, ready, failed, and removing states
 * - Support cancellation, deletion, retry, and clean conversation isolation
 *
 * @param {Object} [options]
 * @param {string} [options.conversationId]
 * @param {Function} [options.onError]
 * @returns {Object} Draft attachment state and handler functions
 */
export default function useDraftAttachments({ conversationId = null, onError = null } = {}) {
  const [drafts, setDrafts] = useState([]);
  const draftsRef = useRef([]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // Track conversationId to abort in-flight uploads if the user switches conversations
  const currentConvIdRef = useRef(conversationId);
  useEffect(() => {
    if (currentConvIdRef.current !== conversationId) {
      // Abort active in-flight uploads on conversation change
      draftsRef.current.forEach((d) => {
        if (d.status === 'uploading' && d.controller) {
          d.controller.abort();
        }
      });
      // Clear draft state for isolated conversation experience
      setDrafts([]);
      currentConvIdRef.current = conversationId;
    }
  }, [conversationId]);

  // Clean up any remaining uploads on unmount
  useEffect(() => {
    return () => {
      draftsRef.current.forEach((d) => {
        if (d.status === 'uploading' && d.controller) {
          d.controller.abort();
        }
      });
    };
  }, []);

  /**
   * Upload single draft file helper
   */
  const executeUpload = useCallback(
    async (clientId, file, convId, controller) => {
      try {
        const res = await attachmentService.uploadDraft(file, convId, {
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const percent = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 50;
            setDrafts((prev) =>
              prev.map((d) =>
                d.clientId === clientId ? { ...d, progress: percent } : d
              )
            );
          },
        });

        if (res?.success && res.attachment?.id) {
          setDrafts((prev) =>
            prev.map((d) =>
              d.clientId === clientId
                ? {
                    ...d,
                    status: 'ready',
                    attachmentId: res.attachment.id,
                    progress: 100,
                    error: null,
                  }
                : d
            )
          );
        } else {
          throw new Error('Upload completed without an attachment ID');
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return;
        }

        const errorMsg =
          err.response?.data?.message || err.message || 'Attachment upload failed';

        setDrafts((prev) =>
          prev.map((d) =>
            d.clientId === clientId
              ? {
                  ...d,
                  status: 'failed',
                  error: errorMsg,
                }
              : d
          )
        );

        if (onError) {
          onError(errorMsg);
        }
      }
    },
    [onError]
  );

  /**
   * Add new PDF files to drafts and initiate temporary uploads
   */
  const addDrafts = useCallback(
    (files, targetConvId = conversationId) => {
      const fileList = Array.isArray(files) ? files : [files];
      if (fileList.length === 0) return;

      const newDraftItems = [];

      for (const file of fileList) {
        const validation = validatePdfFile(file, 10);
        const clientId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const controller = new AbortController();

        if (!validation.valid) {
          newDraftItems.push({
            clientId,
            attachmentId: null,
            file,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/pdf',
            status: 'failed',
            progress: 0,
            error: validation.error,
            controller,
          });
          if (onError) {
            onError(validation.error);
          }
        } else {
          newDraftItems.push({
            clientId,
            attachmentId: null,
            file,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/pdf',
            status: 'uploading',
            progress: 0,
            error: null,
            controller,
          });
        }
      }

      setDrafts((prev) => [...prev, ...newDraftItems]);

      // Fire uploads for valid items
      for (const item of newDraftItems) {
        if (item.status === 'uploading') {
          executeUpload(item.clientId, item.file, targetConvId, item.controller);
        }
      }
    },
    [conversationId, executeUpload, onError]
  );

  /**
   * Remove a draft attachment:
   * - Abort upload if currently running
   * - Call DELETE /api/attachments/draft/:id if server ID exists
   * - Immediately remove from local UI state
   */
  const removeDraft = useCallback((clientId) => {
    const existing = draftsRef.current.find((d) => d.clientId === clientId);
    if (!existing) return;

    // 1. Abort network request if uploading
    if (existing.controller) {
      existing.controller.abort();
    }

    // 2. Delete temporary record and file on server if already uploaded
    if (existing.attachmentId) {
      attachmentService.deleteDraft(existing.attachmentId).catch((err) => {
        console.warn('Failed to delete temporary attachment on server:', err.message);
      });
    }

    // 3. Immediately remove from drafts list
    setDrafts((prev) => prev.filter((d) => d.clientId !== clientId));
  }, []);

  /**
   * Retry an individual failed draft
   */
  const retryDraft = useCallback(
    (clientId, targetConvId = conversationId) => {
      const existing = draftsRef.current.find((d) => d.clientId === clientId);
      if (!existing || !existing.file) return;

      const newController = new AbortController();

      setDrafts((prev) =>
        prev.map((d) =>
          d.clientId === clientId
            ? {
                ...d,
                status: 'uploading',
                progress: 0,
                error: null,
                controller: newController,
              }
            : d
        )
      );

      executeUpload(clientId, existing.file, targetConvId, newController);
    },
    [conversationId, executeUpload]
  );

  /**
   * Clear all drafts (used after send or navigation)
   */
  const clearDrafts = useCallback(() => {
    draftsRef.current.forEach((d) => {
      if (d.controller) {
        d.controller.abort();
      }
    });
    setDrafts([]);
  }, []);

  // Derived state calculations
  const hasUploading = drafts.some((d) => d.status === 'uploading');
  const hasFailed = drafts.some((d) => d.status === 'failed');
  const readyAttachmentIds = drafts
    .filter((d) => d.status === 'ready' && Boolean(d.attachmentId))
    .map((d) => d.attachmentId);
  const readyCount = readyAttachmentIds.length;
  const totalCount = drafts.length;

  return {
    drafts,
    addDrafts,
    removeDraft,
    retryDraft,
    clearDrafts,
    hasUploading,
    hasFailed,
    readyAttachmentIds,
    readyCount,
    totalCount,
  };
}
