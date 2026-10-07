import { formatFileSize } from '../utils/documentUtils.js';

/**
 * Renders attached PDF medical reports and in-flight upload progress cards
 * in the consultation workspace.
 */
export default function ChatDocumentTray({
  documents = [],
  isUploading = false,
  uploadingFileName = '',
  onDeleteDocument,
  isDeletingId = null,
}) {
  if (documents.length === 0 && !isUploading) {
    return null;
  }

  return (
    <div className="chat-attached-docs" role="region" aria-label="Attached Medical Reports">
      <div className="chat-attached-docs__header">
        <div className="chat-attached-docs__title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Attached Medical Reports ({documents.length + (isUploading ? 1 : 0)})</span>
        </div>
      </div>

      <div className="chat-attached-docs__list">
        {/* Uploading In-flight Card */}
        {isUploading && (
          <div className="chat-doc-card chat-doc-card--uploading" role="status" aria-label="Uploading document">
            <div className="chat-doc-card__spinner" aria-hidden="true" />
            <div className="chat-doc-card__info">
              <span className="chat-doc-card__name" title={uploadingFileName || 'Uploading report...'}>
                {uploadingFileName || 'Uploading report...'}
              </span>
              <span className="chat-doc-card__meta">Validating & saving PDF...</span>
            </div>
          </div>
        )}

        {/* Persisted Document Cards */}
        {documents.map((doc) => {
          const isDeleting = isDeletingId === doc.id;

          return (
            <div key={doc.id} className="chat-doc-card">
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
                <span className="chat-doc-card__meta">
                  {formatFileSize(doc.fileSize)} • PDF Report
                </span>
              </div>

              {onDeleteDocument && (
                <button
                  type="button"
                  className="chat-doc-card__delete-btn"
                  onClick={() => onDeleteDocument(doc.id)}
                  disabled={isDeleting}
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
          );
        })}
      </div>
    </div>
  );
}
