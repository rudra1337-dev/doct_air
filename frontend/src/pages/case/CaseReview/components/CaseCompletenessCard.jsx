import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CaseCompletenessCard({
  completeness,
  caseData,
  userRole = 'PATIENT',
  onOpenEdit,
}) {
  const [showOptional, setShowOptional] = useState(false);

  if (!completeness) {
    return null;
  }

  const {
    isComplete,
    canSubmitForReview,
    completionPercentage = 0,
    missingRequiredInformation = [],
    missingOptionalInformation = [],
    incompleteFields = [],
    discrepancyCount = 0,
  } = completeness;

  const isPatient = userRole === 'PATIENT';
  const conversationId = caseData?.conversationId;

  // Color scheme based on percentage
  const getProgressColor = () => {
    if (completionPercentage >= 80) return 'case-progress-bar__fill--high';
    if (completionPercentage >= 50) return 'case-progress-bar__fill--medium';
    return 'case-progress-bar__fill--low';
  };

  return (
    <div className={`case-card ${canSubmitForReview ? 'case-card--completeness-ready' : 'case-card--completeness-pending'}`}>
      <div className="case-card__header">
        <div>
          <span className="case-card__eyebrow text-sky-400">Intake Evaluation Engine</span>
          <h3 className="case-card__title">Case Completeness & Intake Readiness</h3>
        </div>

        <div>
          {isComplete ? (
            <span className="case-tag case-tag--status-reviewed">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Fully Complete Intake
            </span>
          ) : canSubmitForReview ? (
            <span className="case-tag case-tag--status-reviewed">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Eligible for Review
            </span>
          ) : (
            <span className="case-tag case-tag--status-in_progress">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Required Info Missing
            </span>
          )}
        </div>
      </div>

      {/* ── 1. Progress Overview ─────────────────────────────────────────────── */}
      <div className="case-completeness-overview">
        <div className="case-completeness-score-row">
          <div className="case-completeness-score-group">
            <span className="case-completeness-percentage">{completionPercentage}%</span>
            <div className="case-completeness-score-meta">
              <span className="case-completeness-score-label">Information Collected</span>
              <span className="case-completeness-score-subtext">
                {canSubmitForReview
                  ? 'All mandatory intake elements are documented.'
                  : `${missingRequiredInformation.length} required intake item(s) remaining.`}
              </span>
            </div>
          </div>

          <div className="case-completeness-actions">
            {onOpenEdit && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="btn-case-secondary btn-case-sm"
              >
                Edit Case
              </button>
            )}
            {isPatient && conversationId && (
              <Link
                to={`/patient/consultation/${conversationId}`}
                className="btn-case-primary btn-case-sm"
              >
                Consultation Chat &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="case-progress-bar" role="progressbar" aria-valuenow={completionPercentage} aria-valuemin="0" aria-valuemax="100">
          <div
            className={`case-progress-bar__fill ${getProgressColor()}`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <p className="case-completeness-disclaimer">
          <strong>Notice:</strong> Completeness indicates structural information collection and does not constitute a diagnostic assessment or medical clearance.
        </p>
      </div>

      {/* ── 2. Required Information Missing (Blocks Submission) ──────────────── */}
      {missingRequiredInformation.length > 0 ? (
        <div className="case-completeness-section case-completeness-section--required">
          <div className="case-completeness-section__header">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h4 className="case-completeness-section__title">
                Required Information Missing for Review ({missingRequiredInformation.length})
              </h4>
            </div>
            <span className="case-tag case-tag--required-pill">Mandatory</span>
          </div>

          <p className="case-completeness-section__intro">
            A healthcare professional requires the following core details to safely evaluate this case:
          </p>

          <div className="case-missing-grid">
            {missingRequiredInformation.map((item, idx) => (
              <div key={item.field || idx} className="case-missing-card case-missing-card--required">
                <div className="case-missing-card__header">
                  <span className="case-missing-card__label">{item.label}</span>
                  <span className="case-tag case-tag--importance-critical">Action Needed</span>
                </div>
                <p className="case-missing-card__reason">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="case-completeness-banner case-completeness-banner--success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <strong>Core Intake Requirements Satisfied:</strong> Chief complaint, symptom details, timing (onset/duration), and severity are present. This case can be submitted for clinician review.
          </div>
        </div>
      )}

      {/* ── 3. Unresolved Discrepancies Alert ─────────────────────────────────── */}
      {discrepancyCount > 0 && (
        <div className="case-completeness-section case-completeness-section--warning">
          <div className="case-completeness-section__header">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h4 className="case-completeness-section__title">
                Competing Statements Detected ({discrepancyCount})
              </h4>
            </div>
            <span className="case-tag case-tag--discrepancy">Contradictions Recorded</span>
          </div>
          <p className="case-completeness-section__intro">
            Conflicting statements (e.g. onset or severity updates) were recorded verbatim. They do not block submission, but will be highlighted for clinician reconciliation.
          </p>
        </div>
      )}

      {/* ── 4. Incomplete Field Values ───────────────────────────────────────── */}
      {incompleteFields.length > 0 && (
        <div className="case-completeness-section case-completeness-section--incomplete">
          <h4 className="case-completeness-section__title">
            Partially Specified Fields ({incompleteFields.length})
          </h4>
          <div className="case-incomplete-list">
            {incompleteFields.map((item, idx) => (
              <div key={item.field || idx} className="case-incomplete-item">
                <span className="case-incomplete-item__label">{item.label}:</span>
                <span className="case-incomplete-item__reason">{item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Optional Clinical Information (Collapsible) ───────────────────── */}
      {missingOptionalInformation.length > 0 && (
        <div className="case-completeness-optional-wrapper">
          <button
            type="button"
            className="case-completeness-optional-toggle"
            onClick={() => setShowOptional(!showOptional)}
            aria-expanded={showOptional}
          >
            <span>
              Optional Clinical Information Not Documented ({missingOptionalInformation.length})
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transform transition-transform ${showOptional ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showOptional && (
            <div className="case-completeness-optional-body">
              <p className="case-completeness-section__intro">
                These optional categories provide additional context but are <strong>not required</strong> for professional review:
              </p>
              <div className="case-optional-tags-grid">
                {missingOptionalInformation.map((item, idx) => (
                  <div key={item.field || idx} className="case-optional-tag-item">
                    <span className="case-optional-tag-item__title">{item.label}</span>
                    <span className="case-optional-tag-item__desc">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
