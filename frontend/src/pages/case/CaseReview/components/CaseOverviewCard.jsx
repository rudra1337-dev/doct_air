import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import SourceAttributionBadge from './SourceAttributionBadge';

export default function CaseOverviewCard({
  caseData,
  userRole = 'PATIENT',
  onStatusChange,
  isStatusUpdating = false,
  onOpenEdit,
}) {
  const [statusError, setStatusError] = useState(null);

  const isPatient = userRole === 'PATIENT';
  const currentStatus = caseData?.status || 'in_progress';
  const chiefComplaint = caseData?.chiefComplaint?.text || null;
  const chiefSource = caseData?.chiefComplaint?.source || null;

  const onset = caseData?.onset?.value || null;
  const onsetSource = caseData?.onset?.source || null;

  const duration = caseData?.duration?.value || null;
  const durationSource = caseData?.duration?.source || null;

  const severity = caseData?.severity?.value || null;
  const severitySource = caseData?.severity?.source || null;

  const location = caseData?.symptomLocation?.value || null;
  const locationSource = caseData?.symptomLocation?.source || null;

  const conversationId = caseData?.conversationId;
  const consultationUrl = isPatient
    ? `/patient/consultation/${conversationId}`
    : `/professional/queue`;

  const handleStatusSubmit = async (newStatus) => {
    if (newStatus === currentStatus) return;
    setStatusError(null);
    try {
      await onStatusChange(newStatus);
    } catch (err) {
      setStatusError(err.message || 'Failed to update case status');
    }
  };

  const createdDate = caseData?.createdAt
    ? new Date(caseData.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const updatedDate = caseData?.updatedAt
    ? new Date(caseData.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="case-card case-card--primary">
      <div className="case-card__header">
        <div className="case-card__title-group">
          <div className="case-card__eyebrow-row">
            <span className="case-card__eyebrow">Clinical Intake Case</span>
            <span className="case-card__id">ID: {caseData?.id || caseData?._id}</span>
          </div>
          <h2 className="case-card__title">Case Overview & Intake Summary</h2>
          <div className="case-card__meta-row">
            {createdDate && <span>Initiated: {createdDate}</span>}
            {updatedDate && <span>&bull; Last updated: {updatedDate}</span>}
          </div>
        </div>

        <div className="case-card__actions">
          {onOpenEdit && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="btn-case-edit"
              aria-label="Edit Case Information"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit Case</span>
            </button>
          )}

          {/* Medical Intake Report Link */}
          {(caseData?.id || caseData?._id) && (
            <Link
              to={
                isPatient
                  ? `/patient/cases/${caseData?.id || caseData?._id}/report`
                  : `/professional/cases/${caseData?.id || caseData?._id}/report`
              }
              className="btn-case-report"
              title="View In-App Medical Intake Report"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.5L19 7.5V19a2 2 0 0 1-2 2z" />
              </svg>
              <span>Medical Report</span>
            </Link>
          )}

          {conversationId && (
            <Link
              to={consultationUrl}
              className="btn-case-consultation"
              title="Return to Consultation Chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Consultation Chat</span>
            </Link>
          )}
        </div>
      </div>

      {/* Lifecycle Status Management Row */}
      <div className="case-status-bar">
        <div className="case-status-bar__current">
          <span className="case-status-bar__label">Lifecycle Status:</span>
          <StatusBadge status={currentStatus} />
        </div>

        <div className="case-status-bar__controls">
          <label htmlFor="case-status-select" className="sr-only">
            Change Case Status
          </label>
          <select
            id="case-status-select"
            value={currentStatus}
            disabled={isStatusUpdating}
            onChange={(e) => handleStatusSubmit(e.target.value)}
            className="case-status-select"
          >
            <option value="in_progress">In Progress (Active Intake)</option>
            <option
              value="ready_for_review"
              disabled={isPatient && caseData?.completeness && !caseData.completeness.canSubmitForReview}
            >
              {isPatient && caseData?.completeness && !caseData.completeness.canSubmitForReview
                ? 'Ready for Review (Required Info Missing)'
                : 'Ready for Review (Submitted)'}
            </option>
            {isPatient ? (
              <option value="reviewed" disabled>
                Reviewed by Clinician (Clinician Only)
              </option>
            ) : (
              <option value="reviewed">Reviewed by Clinician</option>
            )}
          </select>
          {isStatusUpdating && (
            <span className="case-status-bar__updating" aria-live="polite">
              Updating...
            </span>
          )}
        </div>
      </div>

      {isPatient && caseData?.completeness && !caseData.completeness.canSubmitForReview && (
        <div className="case-status-helper-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Please complete the required intake fields (Chief Complaint, Symptoms, Timing, Severity) before submitting for clinician review.
          </span>
        </div>
      )}

      {statusError && (
        <div className="case-alert case-alert--error" role="alert">
          {statusError}
        </div>
      )}

      {/* Chief Complaint Highlight */}
      <div className="case-chief-complaint">
        <div className="case-chief-complaint__header">
          <span className="case-field-label">Chief Complaint / Primary Concern</span>
          <SourceAttributionBadge source={chiefSource} />
        </div>
        <p className="case-chief-complaint__text">
          {chiefComplaint || (
            <span className="case-empty-text">Not provided yet in intake consultation.</span>
          )}
        </p>
      </div>

      {/* Core Intake Scalar Attributes Grid */}
      <div className="case-overview-grid">
        <div className="case-overview-item">
          <div className="case-overview-item__header">
            <span className="case-field-label">Onset</span>
            <SourceAttributionBadge source={onsetSource} />
          </div>
          <div className="case-overview-item__value">
            {onset || <span className="case-empty-text">Not yet collected</span>}
          </div>
        </div>

        <div className="case-overview-item">
          <div className="case-overview-item__header">
            <span className="case-field-label">Duration</span>
            <SourceAttributionBadge source={durationSource} />
          </div>
          <div className="case-overview-item__value">
            {duration || <span className="case-empty-text">Not yet collected</span>}
          </div>
        </div>

        <div className="case-overview-item">
          <div className="case-overview-item__header">
            <span className="case-field-label">Severity</span>
            <SourceAttributionBadge source={severitySource} />
          </div>
          <div className="case-overview-item__value">
            {severity ? (
              <span className={`case-tag case-tag--severity-${severity.toLowerCase()}`}>
                {severity}
              </span>
            ) : (
              <span className="case-empty-text">Not specified</span>
            )}
          </div>
        </div>

        <div className="case-overview-item">
          <div className="case-overview-item__header">
            <span className="case-field-label">Symptom Location</span>
            <SourceAttributionBadge source={locationSource} />
          </div>
          <div className="case-overview-item__value">
            {location || <span className="case-empty-text">Not specified</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
