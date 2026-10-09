import React from 'react';
import SourceAttributionBadge from './SourceAttributionBadge';

export default function CaseMedicalBackgroundCard({ caseData, onOpenEdit }) {
  const history = Array.isArray(caseData?.relevantMedicalHistory)
    ? caseData.relevantMedicalHistory
    : [];
  const medications = Array.isArray(caseData?.medications) ? caseData.medications : [];
  const allergies = Array.isArray(caseData?.allergies) ? caseData.allergies : [];
  const vitals = Array.isArray(caseData?.vitals) ? caseData.vitals : [];

  return (
    <div className="case-card">
      <div className="case-card__header">
        <div>
          <span className="case-card__eyebrow">Patient Clinical Background</span>
          <h3 className="case-card__title">Medical Background & Vitals</h3>
        </div>
        {onOpenEdit && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="btn-case-edit-inline"
            aria-label="Edit Medical Background"
          >
            Edit
          </button>
        )}
      </div>

      {/* Relevant Medical History */}
      <div className="case-section-block">
        <h4 className="case-section-subtitle">Medical History ({history.length})</h4>
        {history.length === 0 ? (
          <p className="case-empty-text">No prior medical conditions recorded.</p>
        ) : (
          <div className="case-data-table-wrapper">
            <table className="case-data-table">
              <thead>
                <tr>
                  <th scope="col">Condition</th>
                  <th scope="col">Diagnosed</th>
                  <th scope="col">Status</th>
                  <th scope="col">Attribution</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={item._id || idx}>
                    <td className="font-semibold text-slate-100">{item.condition}</td>
                    <td>{item.diagnosedApprox || <span className="text-slate-500">—</span>}</td>
                    <td>
                      <span className={`case-tag case-tag--status-${(item.status || 'unspecified').toLowerCase()}`}>
                        {item.status || 'unspecified'}
                      </span>
                    </td>
                    <td>
                      <SourceAttributionBadge source={item.source} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Medications */}
      <div className="case-section-block">
        <h4 className="case-section-subtitle">Medications ({medications.length})</h4>
        {medications.length === 0 ? (
          <p className="case-empty-text">No medications reported or detected.</p>
        ) : (
          <div className="case-data-table-wrapper">
            <table className="case-data-table">
              <thead>
                <tr>
                  <th scope="col">Medication</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Status</th>
                  <th scope="col">Attribution</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((med, idx) => (
                  <tr key={med._id || idx}>
                    <td className="font-semibold text-sky-300">{med.name}</td>
                    <td>{med.dosage || <span className="text-slate-500">—</span>}</td>
                    <td>{med.frequency || <span className="text-slate-500">—</span>}</td>
                    <td>
                      <span className={`case-tag case-tag--med-${(med.status || 'unspecified').toLowerCase()}`}>
                        {med.status || 'unspecified'}
                      </span>
                    </td>
                    <td>
                      <SourceAttributionBadge source={med.source} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allergies */}
      <div className="case-section-block">
        <h4 className="case-section-subtitle">Allergies ({allergies.length})</h4>
        {allergies.length === 0 ? (
          <p className="case-empty-text">No known drug or environmental allergies reported.</p>
        ) : (
          <div className="case-allergies-grid">
            {allergies.map((allergy, idx) => (
              <div key={allergy._id || idx} className="case-allergy-card">
                <div className="case-allergy-card__top">
                  <span className="case-allergy-substance">{allergy.substance}</span>
                  {allergy.severity && allergy.severity !== 'unspecified' && (
                    <span className={`case-tag case-tag--severity-${allergy.severity.toLowerCase()}`}>
                      {allergy.severity}
                    </span>
                  )}
                </div>
                {allergy.reaction && (
                  <div className="case-allergy-reaction">
                    <strong>Reaction:</strong> {allergy.reaction}
                  </div>
                )}
                <div className="mt-2">
                  <SourceAttributionBadge source={allergy.source} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recorded Vitals */}
      <div className="case-section-block">
        <h4 className="case-section-subtitle">Vitals & Physiological Readings ({vitals.length})</h4>
        {vitals.length === 0 ? (
          <p className="case-empty-text">No clinical vitals documented in this case.</p>
        ) : (
          <div className="case-vitals-grid">
            {vitals.map((v, idx) => {
              const vitalDate = v.recordedAt
                ? new Date(v.recordedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              return (
                <div key={v._id || idx} className="case-vital-card">
                  <div className="case-vital-metrics">
                    {v.bloodPressure && (
                      <div className="case-vital-metric">
                        <span className="case-vital-label">Blood Pressure</span>
                        <span className="case-vital-val">{v.bloodPressure}</span>
                      </div>
                    )}
                    {v.heartRate && (
                      <div className="case-vital-metric">
                        <span className="case-vital-label">Heart Rate</span>
                        <span className="case-vital-val">{v.heartRate} <small>bpm</small></span>
                      </div>
                    )}
                    {v.temperature && (
                      <div className="case-vital-metric">
                        <span className="case-vital-label">Temp</span>
                        <span className="case-vital-val">{v.temperature}</span>
                      </div>
                    )}
                    {v.oxygenSaturation && (
                      <div className="case-vital-metric">
                        <span className="case-vital-label">SpO2</span>
                        <span className="case-vital-val">{v.oxygenSaturation}</span>
                      </div>
                    )}
                    {v.respiratoryRate && (
                      <div className="case-vital-metric">
                        <span className="case-vital-label">Resp. Rate</span>
                        <span className="case-vital-val">{v.respiratoryRate}</span>
                      </div>
                    )}
                  </div>
                  <div className="case-vital-footer">
                    {vitalDate && <span className="text-xs text-slate-400">{vitalDate}</span>}
                    <SourceAttributionBadge source={v.source} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
