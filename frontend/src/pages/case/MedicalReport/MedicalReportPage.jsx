import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import caseService from '../../../services/caseService';
import './MedicalReportPage.css';

/**
 * Medical Intake Report View
 *
 * In-app structured view of clinical intake information collected during
 * one specific patient consultation conversation.
 *
 * Non-diagnostic intake summary. Does NOT provide medical clearance,
 * diagnosis, treatment, triage priority scoring, or downloadable files.
 */
export default function MedicalReportPage({ role = 'patient' }) {
  const { caseId, conversationId } = useParams();
  const { user } = useAuth();
  const isPatient = role === 'patient' || user?.role === 'PATIENT';

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Load latest report
  const loadReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let res;
      if (caseId) {
        res = await caseService.getReportByCaseId(caseId);
      } else if (conversationId) {
        res = await caseService.getReportByConversation(conversationId);
      } else {
        throw new Error('No Case ID or Conversation ID provided.');
      }

      if (res?.success && res.report) {
        setReport(res.report);
      } else {
        throw new Error('Report data not returned.');
      }
    } catch (err) {
      if (err.status === 404) {
        setError('No medical intake report is available for this consultation yet.');
      } else if (err.status === 403) {
        setError('You do not have authorization to view this medical intake report.');
      } else {
        setError(err.message || 'Failed to load medical intake report.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId, conversationId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Handle Report Regeneration
  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      setNotification(null);

      let res;
      const targetConvId = conversationId || report?.conversationId;
      const targetCaseId = caseId || report?.caseId;

      if (targetConvId) {
        res = await caseService.generateReport(targetConvId);
      } else if (targetCaseId) {
        res = await caseService.generateReportByCaseId(targetCaseId);
      }

      if (res?.success && res.report) {
        setReport(res.report);
        setNotification({
          type: 'success',
          message: `Medical intake report updated to version ${res.report.version}.`,
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to regenerate report. The previous report remains active.',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const sections = report?.sections;
  const overview = sections?.consultationOverview;
  const completeness = report?.completenessSnapshot;
  const isDraft = report?.status === 'draft';

  // Back Navigation URL
  const targetConvId = conversationId || report?.conversationId;
  const targetCaseId = caseId || report?.caseId;

  const consultationBackUrl = isPatient
    ? (targetConvId ? `/patient/consultation/${targetConvId}` : '/patient/dashboard')
    : '/professional/queue';

  const caseReviewUrl = isPatient
    ? (targetCaseId ? `/patient/cases/${targetCaseId}` : (targetConvId ? `/patient/cases/conversation/${targetConvId}` : null))
    : (targetCaseId ? `/professional/cases/${targetCaseId}` : null);

  if (isLoading) {
    return (
      <div className="medical-report-page">
        <div className="report-loading-container">
          <div className="report-spinner" />
          <p className="report-loading-text">Loading Medical Intake Report...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="medical-report-page">
        <div className="report-top-bar">
          <Link to={consultationBackUrl} className="btn-report-back">
            &larr; Return to Consultation
          </Link>
        </div>
        <div className="report-error-card">
          <div className="report-error-icon">&excl;</div>
          <h2>Medical Report Unavailable</h2>
          <p>{error}</p>
          {conversationId && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="btn-report-primary"
            >
              {isRegenerating ? 'Generating Intake Report...' : 'Generate Medical Intake Report'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="medical-report-page">
      {/* Navigation Top Bar */}
      <div className="report-top-bar">
        <div className="report-top-bar__left">
          <Link to={consultationBackUrl} className="btn-report-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Consultation</span>
          </Link>

          {caseReviewUrl && (
            <Link to={caseReviewUrl} className="btn-report-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Structured Case</span>
            </Link>
          )}
        </div>

        <div className="report-top-bar__right">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="btn-report-refresh"
            title="Regenerate an updated version of this medical intake report"
          >
            <svg
              className={isRegenerating ? 'report-spin-icon' : ''}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isRegenerating ? 'Regenerating...' : 'Refresh Report'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`report-notification report-notification--${notification.type}`}>
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="report-notification__close"
          >
            &times;
          </button>
        </div>
      )}

      {/* Non-Diagnostic Clinical Safety Disclaimer Banner */}
      <div className="report-safety-banner">
        <div className="report-safety-banner__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="report-safety-banner__body">
          <span className="report-safety-banner__title">Non-Diagnostic Clinical Intake Summary</span>
          <p className="report-safety-banner__text">
            This document organizes patient-reported statements and uploaded medical report findings for clinician review.
            It does not constitute a medical diagnosis, triage score, or treatment recommendation. Information must be clinically evaluated.
          </p>
        </div>
      </div>

      {/* ── Section 1: Consultation Overview ──────────────────────────────── */}
      <section className="report-section report-section--overview">
        <div className="report-overview-header">
          <div className="report-overview-header__title-block">
            <div className="report-overview-badges">
              <span className={`report-status-badge report-status-badge--${report.status}`}>
                {isDraft ? 'DRAFT REPORT' : 'READY FOR REVIEW'}
              </span>
              <span className="report-version-badge">Version {report.version}</span>
              <span className="report-meta-pill">Case Status: {overview?.caseStatus || 'in_progress'}</span>
            </div>
            <h1 className="report-title">Medical Intake Report</h1>
            <p className="report-subtitle">
              Generated: {new Date(report.generatedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {overview?.patientName && ` • Patient: ${overview.patientName}`}
            </p>
          </div>

          {/* Completeness Meter */}
          {completeness && (
            <div className="report-completeness-gauge">
              <div className="report-completeness-gauge__score">
                {completeness.completionPercentage}%
              </div>
              <div className="report-completeness-gauge__label">
                Intake Completeness
              </div>
              <div className="report-progress-bar">
                <div
                  className="report-progress-bar__fill"
                  style={{ width: `${completeness.completionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {overview?.summaryText && (
          <div className="report-overview-summary">
            <p>{overview.summaryText}</p>
          </div>
        )}
      </section>

      {/* ── Section 2: Chief Complaint ───────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">1</span>
          Chief Complaint
        </h2>
        {sections?.chiefComplaint?.text ? (
          <div className="report-card report-card--highlight">
            <p className="report-card__text">{sections.chiefComplaint.text}</p>
            {sections.chiefComplaint.source && (
              <div className="report-source-tag">
                Source: {sections.chiefComplaint.source.sourceType === 'document' ? 'Medical Document' : 'Patient Statement'}
              </div>
            )}
          </div>
        ) : (
          <div className="report-empty-state">No chief complaint documented.</div>
        )}
      </section>

      {/* ── Section 3: Symptoms ─────────────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">2</span>
          Reported Symptoms
          <span className="report-count-badge">{(sections?.symptoms || []).length}</span>
        </h2>
        {(sections?.symptoms || []).length > 0 ? (
          <div className="report-grid">
            {sections.symptoms.map((symptom, idx) => (
              <div key={symptom.id || idx} className="report-card">
                <div className="report-card__top">
                  <h3 className="report-card__heading">{symptom.name}</h3>
                  <span className={`report-severity-tag report-severity-tag--${symptom.severity}`}>
                    {symptom.severity || 'unspecified'}
                  </span>
                </div>
                <div className="report-details-list">
                  {symptom.onset && (
                    <div className="report-detail-item">
                      <span className="report-detail-label">Onset:</span>
                      <span className="report-detail-value">{symptom.onset}</span>
                    </div>
                  )}
                  {symptom.duration && (
                    <div className="report-detail-item">
                      <span className="report-detail-label">Duration:</span>
                      <span className="report-detail-value">{symptom.duration}</span>
                    </div>
                  )}
                  {symptom.location && (
                    <div className="report-detail-item">
                      <span className="report-detail-label">Location:</span>
                      <span className="report-detail-value">{symptom.location}</span>
                    </div>
                  )}
                  {symptom.status && (
                    <div className="report-detail-item">
                      <span className="report-detail-label">Status:</span>
                      <span className="report-detail-value">{symptom.status}</span>
                    </div>
                  )}
                </div>
                {symptom.source && (
                  <div className="report-source-tag">
                    Source: {symptom.source.sourceType === 'document' ? 'Medical Document' : 'Patient Statement'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">No symptoms recorded.</div>
        )}
      </section>

      {/* ── Section 4: Relevant Medical History ─────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">3</span>
          Relevant Medical History
          <span className="report-count-badge">{(sections?.relevantMedicalHistory || []).length}</span>
        </h2>
        {(sections?.relevantMedicalHistory || []).length > 0 ? (
          <div className="report-grid">
            {sections.relevantMedicalHistory.map((item, idx) => (
              <div key={item.id || idx} className="report-card">
                <div className="report-card__top">
                  <h3 className="report-card__heading">{item.condition}</h3>
                  <span className="report-meta-tag">{item.status || 'historical'}</span>
                </div>
                {item.diagnosedApprox && (
                  <p className="report-detail-text">
                    <span className="report-detail-label">Diagnosed:</span> {item.diagnosedApprox}
                  </p>
                )}
                {item.source && (
                  <div className="report-source-tag">
                    Source: {item.source.sourceType === 'document' ? 'Document' : 'Patient History'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">No prior medical conditions documented.</div>
        )}
      </section>

      {/* ── Section 5: Medications ──────────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">4</span>
          Current & Past Medications
        </h2>
        {sections?.medications?.status === 'recorded' && (sections?.medications?.items || []).length > 0 ? (
          <div className="report-grid">
            {sections.medications.items.map((med, idx) => (
              <div key={med.id || idx} className="report-card">
                <div className="report-card__top">
                  <h3 className="report-card__heading">{med.name}</h3>
                  <span className="report-meta-tag">{med.status || 'current'}</span>
                </div>
                <div className="report-details-list">
                  <div className="report-detail-item">
                    <span className="report-detail-label">Dosage:</span>
                    <span className="report-detail-value">{med.dosage || 'Not recorded'}</span>
                  </div>
                  <div className="report-detail-item">
                    <span className="report-detail-label">Frequency:</span>
                    <span className="report-detail-value">{med.frequency || 'Not recorded'}</span>
                  </div>
                </div>
                {med.missingDetails?.length > 0 && (
                  <div className="report-warning-inline">
                    Missing detail: {med.missingDetails.join(', ')}
                  </div>
                )}
                {med.source && (
                  <div className="report-source-tag">
                    Source: {med.source.sourceType === 'document' ? 'Document' : 'Patient Statement'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">
            Medications unrecorded / unknown (not confirmed as no medications).
          </div>
        )}
      </section>

      {/* ── Section 6: Allergies ────────────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">5</span>
          Allergies & Adverse Reactions
        </h2>
        {sections?.allergies?.status === 'recorded' && (sections?.allergies?.items || []).length > 0 ? (
          <div className="report-grid">
            {sections.allergies.items.map((allergy, idx) => (
              <div key={allergy.id || idx} className="report-card">
                <div className="report-card__top">
                  <h3 className="report-card__heading">{allergy.substance}</h3>
                  <span className={`report-severity-tag report-severity-tag--${allergy.severity}`}>
                    {allergy.severity || 'unspecified'}
                  </span>
                </div>
                {allergy.reaction && (
                  <p className="report-detail-text">
                    <span className="report-detail-label">Reaction:</span> {allergy.reaction}
                  </p>
                )}
                {allergy.source && (
                  <div className="report-source-tag">
                    Source: {allergy.source.sourceType === 'document' ? 'Document' : 'Patient Statement'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">
            Allergies unrecorded / unknown (not confirmed as no allergies).
          </div>
        )}
      </section>

      {/* ── Section 7: Vitals ───────────────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">6</span>
          Vitals & Observations
          <span className="report-count-badge">{(sections?.vitals || []).length}</span>
        </h2>
        {(sections?.vitals || []).length > 0 ? (
          <div className="report-grid">
            {sections.vitals.map((v, idx) => (
              <div key={v.id || idx} className="report-card">
                <div className="report-card__top">
                  <h3 className="report-card__heading">Vital Reading</h3>
                  {v.recordedAt && (
                    <span className="report-date-tag">
                      {new Date(v.recordedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="report-vitals-grid">
                  {v.bloodPressure && (
                    <div className="report-vital-cell">
                      <span className="report-vital-label">BP</span>
                      <span className="report-vital-val">{v.bloodPressure}</span>
                    </div>
                  )}
                  {v.heartRate && (
                    <div className="report-vital-cell">
                      <span className="report-vital-label">HR</span>
                      <span className="report-vital-val">{v.heartRate} bpm</span>
                    </div>
                  )}
                  {v.temperature && (
                    <div className="report-vital-cell">
                      <span className="report-vital-label">Temp</span>
                      <span className="report-vital-val">{v.temperature}</span>
                    </div>
                  )}
                  {v.oxygenSaturation && (
                    <div className="report-vital-cell">
                      <span className="report-vital-label">SpO2</span>
                      <span className="report-vital-val">{v.oxygenSaturation}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">No vitals readings documented.</div>
        )}
      </section>

      {/* ── Section 8: Medical Documents & Findings ─────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">7</span>
          Medical Documents & Report Findings
          <span className="report-count-badge">
            {(sections?.medicalDocumentsAndFindings?.findings || []).length}
          </span>
        </h2>
        {/* Attached Documents */}
        {(sections?.medicalDocumentsAndFindings?.documents || []).length > 0 && (
          <div className="report-docs-list">
            <span className="report-docs-list__header">Attached Documents:</span>
            {sections.medicalDocumentsAndFindings.documents.map((d, idx) => (
              <div key={d.documentId || idx} className="report-doc-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{d.originalName}</span>
                <span className="report-doc-chip__status">({d.status})</span>
              </div>
            ))}
          </div>
        )}

        {/* Extracted Findings */}
        {(sections?.medicalDocumentsAndFindings?.findings || []).length > 0 ? (
          <div className="report-grid">
            {sections.medicalDocumentsAndFindings.findings.map((finding, idx) => (
              <div key={finding.id || idx} className="report-card report-card--document">
                <div className="report-card__top">
                  <h3 className="report-card__heading">{finding.title}</h3>
                  <span className="report-doc-badge">Document Finding</span>
                </div>
                <p className="report-finding-text">{finding.finding}</p>
                {finding.documentName && (
                  <div className="report-source-tag">
                    Source: {finding.documentName}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">No document findings extracted.</div>
        )}
      </section>

      {/* ── Section 9: Medical Timeline ─────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">8</span>
          Medical Timeline & Chronology
          <span className="report-count-badge">{(sections?.medicalTimeline || []).length}</span>
        </h2>
        {(sections?.medicalTimeline || []).length > 0 ? (
          <div className="report-timeline">
            {sections.medicalTimeline.map((item, idx) => (
              <div key={item.id || idx} className="report-timeline-item">
                <div className="report-timeline-point" />
                <div className="report-timeline-content">
                  <div className="report-timeline-header">
                    <span className="report-timeline-time">
                      {item.occurredAt || 'Timeline event'}
                    </span>
                    {item.isApproximate && (
                      <span className="report-approx-tag">Approximate / Relative Timing</span>
                    )}
                  </div>
                  <p className="report-timeline-desc">{item.event}</p>
                  {item.source && (
                    <div className="report-source-tag">
                      Source: {item.source.sourceType === 'document' ? 'Document' : 'Patient Statement'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state">No timeline events recorded.</div>
        )}
      </section>

      {/* ── Section 10: Discrepancies ────────────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">9</span>
          Recorded Discrepancies & Competing Statements
          <span className="report-count-badge">{(sections?.discrepancies || []).length}</span>
        </h2>
        {(sections?.discrepancies || []).length > 0 ? (
          <div className="report-grid">
            {sections.discrepancies.map((disc, idx) => (
              <div key={disc.id || idx} className="report-card report-card--discrepancy">
                <div className="report-card__top">
                  <h3 className="report-card__heading">Field: {disc.field}</h3>
                  <span className="report-discrepancy-badge">Unresolved Conflict</span>
                </div>
                <div className="report-discrepancy-split">
                  <div className="report-discrepancy-box">
                    <span className="report-discrepancy-label">Previous Statement:</span>
                    <p className="report-discrepancy-val">{disc.previousValue || 'N/A'}</p>
                    {disc.previousSource && (
                      <span className="report-source-tiny">Source: {disc.previousSource.sourceType}</span>
                    )}
                  </div>
                  <div className="report-discrepancy-box report-discrepancy-box--new">
                    <span className="report-discrepancy-label">Updated Statement:</span>
                    <p className="report-discrepancy-val">{disc.newValue}</p>
                    {disc.source && (
                      <span className="report-source-tiny">Source: {disc.source.sourceType}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="report-empty-state report-empty-state--positive">
            No conflicting statements or clinical discrepancies recorded.
          </div>
        )}
      </section>

      {/* ── Section 11: Missing and Incomplete Information ──────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">10</span>
          Missing & Incomplete Information
        </h2>
        <div className="report-missing-container">
          {/* Missing Required */}
          {(sections?.missingAndIncompleteInformation?.missingRequired || []).length > 0 ? (
            <div className="report-missing-block report-missing-block--required">
              <h3 className="report-missing-subtitle">Missing Required Information (Blocks Review):</h3>
              <ul>
                {sections.missingAndIncompleteInformation.missingRequired.map((mr, idx) => (
                  <li key={idx}>
                    <strong>{mr.label || mr.field}:</strong> {mr.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="report-empty-state report-empty-state--positive">
              All essential required fields documented.
            </div>
          )}

          {/* Missing Optional */}
          {(sections?.missingAndIncompleteInformation?.missingOptional || []).length > 0 && (
            <div className="report-missing-block">
              <h3 className="report-missing-subtitle">Optional Clinical Intake Fields Uncollected:</h3>
              <ul>
                {sections.missingAndIncompleteInformation.missingOptional.map((mo, idx) => (
                  <li key={idx}>
                    <strong>{mo.label || mo.field}:</strong> {mo.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up Questions Status */}
          {(sections?.missingAndIncompleteInformation?.followUpQuestions || []).length > 0 && (
            <div className="report-follow-ups">
              <h3 className="report-missing-subtitle">Clarification Questions Summary:</h3>
              <div className="report-follow-ups-list">
                {sections.missingAndIncompleteInformation.followUpQuestions.map((fq, idx) => (
                  <div key={idx} className="report-fq-item">
                    <div className="report-fq-top">
                      <span className="report-fq-text">{fq.questionText}</span>
                      <span className={`report-fq-badge report-fq-badge--${fq.status}`}>{fq.status}</span>
                    </div>
                    {fq.answerText && (
                      <div className="report-fq-answer">
                        <span className="report-fq-ans-label">Patient Answer:</span> {fq.answerText}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 12: Source References ───────────────────────────────── */}
      <section className="report-section">
        <h2 className="report-section-title">
          <span className="report-section-num">11</span>
          Source Evidence & Provenance
        </h2>
        <div className="report-sources-grid">
          {/* Messages */}
          <div className="report-sources-col">
            <h3 className="report-sources-header">Consultation Messages Cited</h3>
            {(sections?.sourceReferences?.messages || []).length > 0 ? (
              <div className="report-sources-list">
                {sections.sourceReferences.messages.map((m, idx) => (
                  <div key={m.messageId || idx} className="report-source-item">
                    <div className="report-source-item__top">
                      <span className="report-source-role">{m.role}</span>
                      <span className="report-source-time">
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="report-source-snippet">"{m.snippet}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="report-empty-state">No message references cited.</p>
            )}
          </div>

          {/* Documents */}
          <div className="report-sources-col">
            <h3 className="report-sources-header">Medical Documents Cited</h3>
            {(sections?.sourceReferences?.documents || []).length > 0 ? (
              <div className="report-sources-list">
                {sections.sourceReferences.documents.map((d, idx) => (
                  <div key={d.documentId || idx} className="report-source-item">
                    <div className="report-source-item__top">
                      <span className="report-source-filename">{d.filename}</span>
                      <span className="report-source-pages">{d.pageCount} page(s)</span>
                    </div>
                    <span className="report-source-time">
                      Uploaded {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="report-empty-state">No documents attached.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
