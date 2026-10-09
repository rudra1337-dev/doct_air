import React, { useEffect, useRef } from 'react';

export default function DocumentPreviewModal({
  documentData,
  isLoading = false,
  error = null,
  onClose,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!documentData && !isLoading && !error) return null;

  const fileName = documentData?.originalName || 'Attached Medical Document';
  const pageCount = documentData?.pageCount;
  const status = documentData?.status;
  const extractedText = documentData?.extractedText;
  const errorMsg = documentData?.processingError || error;

  return (
    <div
      className="case-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="case-modal-container case-modal-container--large">
        <div className="case-modal-header">
          <div className="case-modal-header__title-group">
            <span className="case-card__eyebrow">Attached Clinical Document</span>
            <h3 id="doc-modal-title" className="case-modal-title">
              {fileName}
            </h3>
            <div className="case-modal-meta">
              {pageCount ? <span>{pageCount} Page{pageCount > 1 ? 's' : ''}</span> : null}
              {status && (
                <span className={`case-tag case-tag--status-${status}`}>
                  Status: {status}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="case-modal-close"
            onClick={onClose}
            aria-label="Close document inspection dialog"
          >
            &times;
          </button>
        </div>

        <div className="case-modal-body">
          {isLoading ? (
            <div className="case-modal-loading">
              <div className="case-spinner" aria-hidden="true" />
              <p>Loading document record and extracted text...</p>
            </div>
          ) : errorMsg ? (
            <div className="case-alert case-alert--error" role="alert">
              <strong>Error inspecting document:</strong> {errorMsg}
            </div>
          ) : extractedText ? (
            <div className="case-doc-text-viewer">
              <div className="case-doc-text-viewer__header">
                <span className="case-field-label">PDF Extracted Text Content (Digital Text-bearing Documents):</span>
                <span className="text-xs text-slate-400">
                  {extractedText.length.toLocaleString()} characters extracted
                </span>
              </div>
              <pre className="case-doc-text-pre">{extractedText}</pre>
            </div>
          ) : (
            <div className="case-empty-box">
              <p>No extracted text available for this document.</p>
            </div>
          )}
        </div>

        <div className="case-modal-footer">
          <button
            type="button"
            className="btn-case-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
