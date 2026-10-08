import { formatFileSize } from '../utils/documentUtils.js';

/**
 * Renders attached PDF medical reports and ChatGPT-style draft attachments
 * inside the consultation composer dock.
 */
export default function ChatDocumentTray({
  draftAttachments = [],
  onRemoveDraft,
  onRetryDraft,
  documents = [],
  uploadingFiles = [],
  isUploading = false,
  uploadingFileName = '',
  onCancelUpload,
  onDeleteDocument,
  isDeletingId = null,
  onRetryDocument,
  isRetryingId = null,
}) {
  const hasDrafts = Array.isArray(draftAttachments) && draftAttachments.length > 0;

  // Normalize legacy uploading list if any
  const legacyUploadingList =
    uploadingFiles && uploadingFiles.length > 0
      ? uploadingFiles
      : isUploading
      ? [{ tempId: 'uploading-default', fileName: uploadingFileName || 'Uploading report...' }]
      : [];

  const totalCount =
    (draftAttachments?.length || 0) + (documents?.length || 0) + legacyUploadingList.length;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="chat-attached-docs" role="region" aria-label="Draft Attachments">
      <div className="chat-attached-docs__list">
        {/* Modern ChatGPT-Style Draft Attachment Cards */}
        {hasDrafts &&
          draftAttachments.map((draft) => {
            const isUploadingState = draft.status === 'uploading';
            const isReady = draft.status === 'ready';
            const isFailed = draft.status === 'failed';

          return (
            <div
              key={draft.clientId}
              className={`chat-doc-card ${isUploadingState ? 'chat-doc-card--uploading' : ''} ${
                isFailed ? 'chat-doc-card--failed' : ''
              }`}
              role="status"
              aria-label={`Attachment ${draft.fileName}`}
            >
              {isUploadingState ? (
                <div className="chat-doc-card__spinner" aria-hidden="true" />
              ) : (
                <div className="chat-doc-card__icon" aria-hidden="true">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isReady ? '#34d399' : '#f87171'}
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}

              <div className="chat-doc-card__info">
                <span className="chat-doc-card__name" title={draft.fileName}>
                  {draft.fileName}
                </span>

                {isUploadingState && (
                  <span className="chat-doc-card__meta chat-doc-card__meta--processing">
                    Uploading... {draft.progress > 0 ? `${draft.progress}%` : ''}
                  </span>
                )}

                {isReady && (
                  <span className="chat-doc-card__meta chat-doc-card__meta--ready">
                    Ready ✓ • {formatFileSize(draft.fileSize)}
                  </span>
                )}

                {isFailed && (
                  <span
                    className="chat-doc-card__meta chat-doc-card__meta--failed"
                    title={draft.error || 'Upload failed'}
                  >
                    {draft.error || 'Upload failed'}
                  </span>
                )}
              </div>

              <div className="chat-doc-card__actions">
                {isFailed && onRetryDraft && (
                  <button
                    type="button"
                    className="chat-doc-card__retry-btn"
                    onClick={() => onRetryDraft(draft.clientId)}
                    aria-label={`Retry upload of ${draft.fileName}`}
                    title="Retry upload"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                )}

                {onRemoveDraft && (
                  <button
                    type="button"
                    className="chat-doc-card__delete-btn"
                    onClick={() => onRemoveDraft(draft.clientId)}
                    aria-label={`Remove attachment ${draft.fileName}`}
                    title="Remove draft attachment"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Legacy In-Flight Cards */}
        {legacyUploadingList.map((item) => (
          <div
            key={item.tempId}
            className="chat-doc-card chat-doc-card--uploading"
            role="status"
            aria-label="Uploading document"
          >
            <div className="chat-doc-card__spinner" aria-hidden="true" />
            <div className="chat-doc-card__info">
              <span className="chat-doc-card__name" title={item.fileName}>
                {item.fileName}
              </span>
              <span className="chat-doc-card__meta">Validating & saving PDF...</span>
            </div>
            {onCancelUpload && item.tempId !== 'uploading-default' && (
              <div className="chat-doc-card__actions">
                <button
                  type="button"
                  className="chat-doc-card__delete-btn"
                  onClick={() => onCancelUpload(item.tempId)}
                  aria-label={`Cancel upload of ${item.fileName}`}
                  title="Cancel upload"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Legacy Persisted Document Cards */}
        {documents.map((doc) => {
          const isDeleting = isDeletingId === doc.id;
          const isRetrying = isRetryingId === doc.id;
          const status = doc.status || doc.uploadStatus || 'uploaded';

          return (
            <div
              key={doc.id}
              className={`chat-doc-card ${status === 'failed' ? 'chat-doc-card--failed' : ''}`}
            >
              <div className="chat-doc-card__icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="13" y2="17" />
                </svg>
              </div>

              <div className="chat-doc-card__info">
                <span className="chat-doc-card__name" title={doc.originalName}>
                  {doc.originalName}
                </span>

                {status === 'processing' && (
                  <span className="chat-doc-card__meta chat-doc-card__meta--processing">
                    <span className="chat-doc-spinner-micro" aria-hidden="true" />
                    Extracting text...
                  </span>
                )}

                {status === 'processed' && (
                  <span className="chat-doc-card__meta chat-doc-card__meta--ready">
                    Ready • {doc.pageCount ? `${doc.pageCount} pg • ` : ''}{formatFileSize(doc.fileSize)}
                  </span>
                )}

                {status === 'failed' && (
                  <span
                    className="chat-doc-card__meta chat-doc-card__meta--failed"
                    title={doc.processingError || 'Unable to extract text'}
                  >
                    Extraction failed
                  </span>
                )}

                {status === 'uploaded' && (
                  <span className="chat-doc-card__meta">
                    {formatFileSize(doc.fileSize)} • Queued
                  </span>
                )}
              </div>

              <div className="chat-doc-card__actions">
                {status === 'failed' && onRetryDocument && (
                  <button
                    type="button"
                    className="chat-doc-card__retry-btn"
                    onClick={() => onRetryDocument(doc.id)}
                    disabled={isRetrying || isDeleting}
                    aria-label={`Retry processing ${doc.originalName}`}
                    title={doc.processingError || 'Retry text extraction'}
                  >
                    {isRetrying ? (
                      <span className="chat-doc-spinner-small" aria-hidden="true" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    )}
                  </button>
                )}

                {onDeleteDocument && (
                  <button
                    type="button"
                    className="chat-doc-card__delete-btn"
                    onClick={() => onDeleteDocument(doc.id)}
                    disabled={isDeleting || isRetrying}
                    aria-label={`Remove attached report ${doc.originalName}`}
                    title="Remove document from consultation"
                  >
                    {isDeleting ? (
                      <span className="chat-doc-spinner-small" aria-hidden="true" />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
