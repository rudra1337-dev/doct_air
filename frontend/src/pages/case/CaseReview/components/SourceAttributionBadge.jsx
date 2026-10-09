import React from 'react';

const SOURCE_CONFIG = {
  patient_report: {
    label: 'Patient Report',
    className: 'source-badge--patient',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  document: {
    label: 'Medical Document',
    className: 'source-badge--document',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  clinician: {
    label: 'Clinician Verified',
    className: 'source-badge--clinician',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
};

export default function SourceAttributionBadge({
  source = null,
  documentTitle = null,
  onViewDocument = null,
  className = '',
}) {
  if (!source) {
    return (
      <span className={`source-badge source-badge--unspecified ${className}`} title="Origin not explicitly attributed">
        <span className="source-badge__label">Unattributed</span>
      </span>
    );
  }

  const sourceType = source.sourceType || 'patient_report';
  const config = SOURCE_CONFIG[sourceType] || SOURCE_CONFIG.patient_report;
  const recordedDate = source.recordedAt ? new Date(source.recordedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : null;

  const tooltipParts = [
    `Source: ${config.label}`,
    source.sourceId ? `Ref ID: ${source.sourceId}` : null,
    recordedDate ? `Recorded: ${recordedDate}` : null,
    source.confidence !== null && source.confidence !== undefined
      ? `Confidence: ${(source.confidence * 100).toFixed(0)}%`
      : null,
  ].filter(Boolean);

  return (
    <span
      className={`source-badge ${config.className} ${className}`}
      title={tooltipParts.join(' • ')}
    >
      <span className="source-badge__icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="source-badge__label">
        {documentTitle ? `${config.label}: ${documentTitle}` : config.label}
      </span>
      {sourceType === 'document' && onViewDocument && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDocument(source.sourceId);
          }}
          className="source-badge__doc-link"
          aria-label="View source document"
          title="Inspect attached document details"
        >
          View Doc &rarr;
        </button>
      )}
    </span>
  );
}
