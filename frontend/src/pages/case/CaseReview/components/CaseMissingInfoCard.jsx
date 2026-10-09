import React from 'react';
import { Link } from 'react-router-dom';

const IMPORTANCE_CONFIG = {
  critical: {
    label: 'Critical',
    className: 'case-tag--importance-critical',
  },
  important: {
    label: 'Important',
    className: 'case-tag--importance-important',
  },
  routine: {
    label: 'Routine',
    className: 'case-tag--importance-routine',
  },
  unspecified: {
    label: 'Not specified',
    className: 'case-tag--importance-unspecified',
  },
};

export default function CaseMissingInfoCard({ caseData, userRole = 'PATIENT' }) {
  const missingInfo = Array.isArray(caseData?.missingInformation)
    ? caseData.missingInformation
    : [];
  const conversationId = caseData?.conversationId;
  const isPatient = userRole === 'PATIENT';

  return (
    <div className="case-card">
      <div className="case-card__header">
        <div>
          <span className="case-card__eyebrow">Data Completeness Tracking</span>
          <h3 className="case-card__title">
            Uncollected Clinical Information ({missingInfo.length})
          </h3>
        </div>

        {isPatient && conversationId && (
          <Link
            to={`/patient/consultation/${conversationId}`}
            className="btn-case-provide-info"
            title="Return to Consultation chat to answer missing information"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Provide in Consultation &rarr;</span>
          </Link>
        )}
      </div>

      {missingInfo.length === 0 ? (
        <div className="case-empty-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 mb-2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p>No critical intake information is currently marked missing.</p>
          <span className="case-empty-subtext">
            All expected core fields for this consultation stage have been provided.
          </span>
        </div>
      ) : (
        <div className="case-missing-info-list">
          <p className="case-missing-info-intro">
            The following details have not yet been collected or clarified in this consultation. They will assist the clinician during case evaluation:
          </p>

          <div className="case-missing-items-grid">
            {missingInfo.map((item, idx) => {
              const importance = IMPORTANCE_CONFIG[item.importance] || IMPORTANCE_CONFIG.unspecified;

              return (
                <div key={item._id || idx} className="case-missing-item">
                  <div className="case-missing-item__header">
                    <span className="case-missing-category">{item.category}</span>
                    <span className={`case-tag ${importance.className}`}>
                      {importance.label}
                    </span>
                  </div>
                  <p className="case-missing-description">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
