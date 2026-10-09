import React from 'react';
import SourceAttributionBadge from './SourceAttributionBadge';

export default function CaseFindingsCard({
  caseData,
  onViewDocument,
  conversationDocuments = [],
}) {
  const findings = Array.isArray(caseData?.reportFindings) ? caseData.reportFindings : [];

  // Map documentId to original document name if available from loaded documents
  const getDocumentName = (docId) => {
    if (!docId) return null;
    const doc = conversationDocuments.find(
      (d) => (d.id || d._id)?.toString() === docId.toString()
    );
    return doc?.originalName || null;
  };

  return (
    <div className="case-card">
      <div className="case-card__header">
        <div>
          <span className="case-card__eyebrow">Diagnostic & Laboratory Reports</span>
          <h3 className="case-card__title">Medical Report Findings ({findings.length})</h3>
        </div>
      </div>

      {findings.length === 0 ? (
        <div className="case-empty-box">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-500 mb-2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>No diagnostic report findings have been extracted for this case.</p>
          <span className="case-empty-subtext">
            Attach PDF medical reports in the consultation chat to automatically extract objective laboratory, imaging, or discharge findings.
          </span>
        </div>
      ) : (
        <div className="case-findings-grid">
          {findings.map((item, idx) => {
            const docName = getDocumentName(item.documentId);

            return (
              <div key={item._id || idx} className="case-finding-card">
                <div className="case-finding-card__header">
                  <div className="case-finding-card__title-group">
                    <span className="case-finding-card__icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <h4 className="case-finding-title">{item.title}</h4>
                  </div>
                  <SourceAttributionBadge
                    source={item.source}
                    documentTitle={docName}
                    onViewDocument={onViewDocument}
                  />
                </div>

                <div className="case-finding-content">
                  <p>{item.finding}</p>
                </div>

                {item.documentId && onViewDocument && (
                  <div className="case-finding-footer">
                    <button
                      type="button"
                      onClick={() => onViewDocument(item.documentId)}
                      className="btn-view-document"
                      title="Inspect extracted text from this attached document"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>
                        {docName ? `Inspect ${docName}` : 'Inspect Attached Document'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
