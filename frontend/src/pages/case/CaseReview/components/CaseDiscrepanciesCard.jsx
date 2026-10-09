import React from 'react';
import SourceAttributionBadge from './SourceAttributionBadge';

export default function CaseDiscrepanciesCard({ caseData, onViewDocument }) {
  const discrepancies = Array.isArray(caseData?.discrepancies) ? caseData.discrepancies : [];

  if (discrepancies.length === 0) {
    return (
      <div className="case-card case-card--clean">
        <div className="case-card__header">
          <div>
            <span className="case-card__eyebrow text-emerald-400">Consistency Audit</span>
            <h3 className="case-card__title">Case Discrepancies & Competing Assertions</h3>
          </div>
          <span className="case-tag case-tag--consistent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            No Conflicting Assertions
          </span>
        </div>
        <p className="case-empty-text">
          All collected statements and extracted findings are clinically aligned. No conflicting claims have been recorded during intake.
        </p>
      </div>
    );
  }

  return (
    <div className="case-card case-card--discrepancy">
      <div className="case-card__header">
        <div>
          <span className="case-card__eyebrow text-amber-400">Clinical Audit Warning</span>
          <h3 className="case-card__title">
            Recorded Discrepancies ({discrepancies.length})
          </h3>
        </div>
        <span className="case-tag case-tag--discrepancy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Requires Clinician Review
        </span>
      </div>

      <div className="case-discrepancy-banner" role="alert">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 text-amber-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>
          <strong>Notice:</strong> Competing assertions were detected between different patient statements or uploaded documents. To preserve clinical integrity, DoctAir retains both assertions verbatim for professional evaluation. Neither claim has been automatically discarded or assumed to be clinically correct.
        </p>
      </div>

      <div className="case-discrepancies-list">
        {discrepancies.map((item, idx) => {
          const recordedDate = item.recordedAt
            ? new Date(item.recordedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return (
            <div key={item._id || idx} className="case-discrepancy-card">
              <div className="case-discrepancy-card__top">
                <span className="case-discrepancy-field">
                  Contradiction on: <code>{item.field}</code>
                </span>
                {recordedDate && (
                  <span className="case-discrepancy-timestamp">Detected: {recordedDate}</span>
                )}
              </div>

              <div className="case-discrepancy-comparison">
                {/* Prior Claim */}
                <div className="case-discrepancy-box case-discrepancy-box--prior">
                  <div className="case-discrepancy-box__header">
                    <span className="case-discrepancy-box__label">Prior Assertion</span>
                    {item.previousSource ? (
                      <SourceAttributionBadge
                        source={item.previousSource}
                        onViewDocument={onViewDocument}
                      />
                    ) : (
                      <span className="text-xs text-slate-500 font-normal italic">
                        (Earlier claim - unrecorded source)
                      </span>
                    )}
                  </div>
                  <p className="case-discrepancy-box__value">
                    {item.previousValue || <span className="case-empty-text">None / Unrecorded</span>}
                  </p>
                </div>

                <div className="case-discrepancy-vs">VS</div>

                {/* New Claim */}
                <div className="case-discrepancy-box case-discrepancy-box--new">
                  <div className="case-discrepancy-box__header">
                    <span className="case-discrepancy-box__label">Subsequent Assertion</span>
                    <SourceAttributionBadge
                      source={item.source}
                      onViewDocument={onViewDocument}
                    />
                  </div>
                  <p className="case-discrepancy-box__value">{item.newValue}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
