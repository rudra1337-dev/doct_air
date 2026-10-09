import React from 'react';
import SourceAttributionBadge from './SourceAttributionBadge';

export default function CaseSymptomsCard({ caseData, onOpenEdit }) {
  const symptoms = Array.isArray(caseData?.symptoms) ? caseData.symptoms : [];
  const associatedSymptoms = Array.isArray(caseData?.associatedSymptoms)
    ? caseData.associatedSymptoms
    : [];

  return (
    <div className="case-card">
      <div className="case-card__header">
        <div>
          <span className="case-card__eyebrow">Reported Clinical Symptoms</span>
          <h3 className="case-card__title">Symptoms & Clinical Manifestations</h3>
        </div>
        {onOpenEdit && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="btn-case-edit-inline"
            aria-label="Edit Symptoms"
          >
            Edit
          </button>
        )}
      </div>

      {/* Primary Symptoms */}
      <div className="case-section-block">
        <h4 className="case-section-subtitle">
          Primary Symptoms ({symptoms.length})
        </h4>

        {symptoms.length === 0 ? (
          <div className="case-empty-box">
            <p>No primary symptoms recorded yet in this case.</p>
          </div>
        ) : (
          <div className="case-symptoms-list">
            {symptoms.map((symptom, idx) => (
              <div key={symptom._id || idx} className="case-symptom-item">
                <div className="case-symptom-item__top">
                  <div className="case-symptom-item__name-group">
                    <span className="case-symptom-name">{symptom.name}</span>
                    {symptom.severity && symptom.severity !== 'unspecified' && (
                      <span className={`case-tag case-tag--severity-${symptom.severity.toLowerCase()}`}>
                        {symptom.severity}
                      </span>
                    )}
                    {symptom.status && symptom.status !== 'unspecified' && (
                      <span className={`case-tag case-tag--status-${symptom.status.toLowerCase()}`}>
                        {symptom.status}
                      </span>
                    )}
                  </div>
                  <SourceAttributionBadge source={symptom.source} />
                </div>

                <div className="case-symptom-item__details">
                  {symptom.location && (
                    <span className="case-symptom-detail">
                      <strong>Location:</strong> {symptom.location}
                    </span>
                  )}
                  {symptom.onset && (
                    <span className="case-symptom-detail">
                      <strong>Onset:</strong> {symptom.onset}
                    </span>
                  )}
                  {symptom.duration && (
                    <span className="case-symptom-detail">
                      <strong>Duration:</strong> {symptom.duration}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Associated Symptoms */}
      <div className="case-section-block">
        <h4 className="case-section-subtitle">
          Associated Symptoms ({associatedSymptoms.length})
        </h4>

        {associatedSymptoms.length === 0 ? (
          <p className="case-empty-text">No additional associated symptoms noted.</p>
        ) : (
          <div className="case-associated-list">
            {associatedSymptoms.map((assoc, idx) => (
              <div key={assoc._id || idx} className="case-associated-chip">
                <span className="case-associated-name">{assoc.name}</span>
                <SourceAttributionBadge source={assoc.source} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
