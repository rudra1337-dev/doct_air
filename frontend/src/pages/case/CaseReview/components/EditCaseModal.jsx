import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function EditCaseModal({
  caseData,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  error = null,
}) {
  const modalRef = useRef(null);

  // Form state initialized from caseData
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    onset: '',
    duration: '',
    severity: '',
    symptomLocation: '',
    symptoms: [],
    medications: [],
    allergies: [],
    relevantMedicalHistory: [],
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [clientErrors, setClientErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Sync initial state when modal opens or caseData updates
  useEffect(() => {
    if (!caseData || !isOpen) return;

    setFormData({
      chiefComplaint: caseData.chiefComplaint?.text || '',
      onset: caseData.onset?.value || '',
      duration: caseData.duration?.value || '',
      severity: caseData.severity?.value || '',
      symptomLocation: caseData.symptomLocation?.value || '',
      symptoms: Array.isArray(caseData.symptoms)
        ? caseData.symptoms.map((s) => ({
            name: s.name || '',
            severity: s.severity || 'unspecified',
            location: s.location || '',
            onset: s.onset || '',
            duration: s.duration || '',
            status: s.status || 'active',
            source: s.source || null,
          }))
        : [],
      medications: Array.isArray(caseData.medications)
        ? caseData.medications.map((m) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            status: m.status || 'current',
            source: m.source || null,
          }))
        : [],
      allergies: Array.isArray(caseData.allergies)
        ? caseData.allergies.map((a) => ({
            substance: a.substance || '',
            reaction: a.reaction || '',
            severity: a.severity || 'unspecified',
            source: a.source || null,
          }))
        : [],
      relevantMedicalHistory: Array.isArray(caseData.relevantMedicalHistory)
        ? caseData.relevantMedicalHistory.map((h) => ({
            condition: h.condition || '',
            diagnosedApprox: h.diagnosedApprox || '',
            status: h.status || 'active',
            source: h.source || null,
          }))
        : [],
    });
    setClientErrors({});
    setIsDirty(false);
  }, [caseData, isOpen]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in this medical case. Discard and close?'
      );
      if (!confirmDiscard) return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Trap Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (clientErrors[field]) {
      setClientErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Symptoms helpers
  const handleAddSymptom = () => {
    setFormData((prev) => ({
      ...prev,
      symptoms: [
        ...prev.symptoms,
        {
          name: '',
          severity: 'moderate',
          location: '',
          onset: '',
          duration: '',
          status: 'active',
          source: { sourceType: 'patient_report' },
        },
      ],
    }));
    setIsDirty(true);
  };

  const handleUpdateSymptom = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.symptoms];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, symptoms: updated };
    });
    setIsDirty(true);
  };

  const handleRemoveSymptom = (index) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // Medications helpers
  const handleAddMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: '',
          dosage: '',
          frequency: '',
          status: 'current',
          source: { sourceType: 'patient_report' },
        },
      ],
    }));
    setIsDirty(true);
  };

  const handleUpdateMedication = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.medications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, medications: updated };
    });
    setIsDirty(true);
  };

  const handleRemoveMedication = (index) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // Allergies helpers
  const handleAddAllergy = () => {
    setFormData((prev) => ({
      ...prev,
      allergies: [
        ...prev.allergies,
        {
          substance: '',
          reaction: '',
          severity: 'mild',
          source: { sourceType: 'patient_report' },
        },
      ],
    }));
    setIsDirty(true);
  };

  const handleUpdateAllergy = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.allergies];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, allergies: updated };
    });
    setIsDirty(true);
  };

  const handleRemoveAllergy = (index) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // Medical History helpers
  const handleAddHistory = () => {
    setFormData((prev) => ({
      ...prev,
      relevantMedicalHistory: [
        ...prev.relevantMedicalHistory,
        {
          condition: '',
          diagnosedApprox: '',
          status: 'active',
          source: { sourceType: 'patient_report' },
        },
      ],
    }));
    setIsDirty(true);
  };

  const handleUpdateHistory = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.relevantMedicalHistory];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, relevantMedicalHistory: updated };
    });
    setIsDirty(true);
  };

  const handleRemoveHistory = (index) => {
    setFormData((prev) => ({
      ...prev,
      relevantMedicalHistory: prev.relevantMedicalHistory.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // Validation
  const validateForm = () => {
    const errs = {};

    if (formData.chiefComplaint && formData.chiefComplaint.length > 500) {
      errs.chiefComplaint = 'Chief complaint cannot exceed 500 characters';
    }
    if (formData.onset && formData.onset.length > 200) {
      errs.onset = 'Onset cannot exceed 200 characters';
    }
    if (formData.duration && formData.duration.length > 200) {
      errs.duration = 'Duration cannot exceed 200 characters';
    }
    if (formData.severity && formData.severity.length > 100) {
      errs.severity = 'Severity cannot exceed 100 characters';
    }
    if (formData.symptomLocation && formData.symptomLocation.length > 200) {
      errs.symptomLocation = 'Symptom location cannot exceed 200 characters';
    }

    // Check array items
    formData.symptoms.forEach((s, idx) => {
      if (!s.name || !s.name.trim()) {
        errs[`symptom_${idx}_name`] = 'Symptom name is required';
      } else if (s.name.length > 200) {
        errs[`symptom_${idx}_name`] = 'Symptom name cannot exceed 200 characters';
      }
    });

    formData.medications.forEach((m, idx) => {
      if (!m.name || !m.name.trim()) {
        errs[`medication_${idx}_name`] = 'Medication name is required';
      } else if (m.name.length > 200) {
        errs[`medication_${idx}_name`] = 'Medication name cannot exceed 200 characters';
      }
    });

    formData.allergies.forEach((a, idx) => {
      if (!a.substance || !a.substance.trim()) {
        errs[`allergy_${idx}_substance`] = 'Allergen substance is required';
      } else if (a.substance.length > 200) {
        errs[`allergy_${idx}_substance`] = 'Allergen substance cannot exceed 200 characters';
      }
    });

    formData.relevantMedicalHistory.forEach((h, idx) => {
      if (!h.condition || !h.condition.trim()) {
        errs[`history_${idx}_condition`] = 'Condition name is required';
      } else if (h.condition.length > 255) {
        errs[`history_${idx}_condition`] = 'Condition cannot exceed 255 characters';
      }
    });

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Build payload preserving structure expected by backend updateCase
    const payload = {};

    if (formData.chiefComplaint.trim()) {
      payload.chiefComplaint = {
        text: formData.chiefComplaint.trim(),
        source: caseData.chiefComplaint?.source || { sourceType: 'patient_report' },
      };
    }

    if (formData.onset.trim()) {
      payload.onset = {
        value: formData.onset.trim(),
        source: caseData.onset?.source || { sourceType: 'patient_report' },
      };
    }

    if (formData.duration.trim()) {
      payload.duration = {
        value: formData.duration.trim(),
        source: caseData.duration?.source || { sourceType: 'patient_report' },
      };
    }

    if (formData.severity.trim()) {
      payload.severity = {
        value: formData.severity.trim(),
        source: caseData.severity?.source || { sourceType: 'patient_report' },
      };
    }

    if (formData.symptomLocation.trim()) {
      payload.symptomLocation = {
        value: formData.symptomLocation.trim(),
        source: caseData.symptomLocation?.source || { sourceType: 'patient_report' },
      };
    }

    // Pass arrays directly if non-empty
    if (formData.symptoms.length > 0) {
      payload.symptoms = formData.symptoms.map((s) => ({
        ...s,
        name: s.name.trim(),
        location: s.location.trim() || null,
        onset: s.onset.trim() || null,
        duration: s.duration.trim() || null,
        source: s.source || { sourceType: 'patient_report' },
      }));
    }

    if (formData.medications.length > 0) {
      payload.medications = formData.medications.map((m) => ({
        ...m,
        name: m.name.trim(),
        dosage: m.dosage.trim() || null,
        frequency: m.frequency.trim() || null,
        source: m.source || { sourceType: 'patient_report' },
      }));
    }

    if (formData.allergies.length > 0) {
      payload.allergies = formData.allergies.map((a) => ({
        ...a,
        substance: a.substance.trim(),
        reaction: a.reaction.trim() || null,
        source: a.source || { sourceType: 'patient_report' },
      }));
    }

    if (formData.relevantMedicalHistory.length > 0) {
      payload.relevantMedicalHistory = formData.relevantMedicalHistory.map((h) => ({
        ...h,
        condition: h.condition.trim(),
        diagnosedApprox: h.diagnosedApprox.trim() || null,
        source: h.source || { sourceType: 'patient_report' },
      }));
    }

    await onSave(payload);
  };

  return (
    <div
      className="case-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-case-title"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div className="case-modal-container case-modal-container--large">
        <div className="case-modal-header">
          <div>
            <span className="case-card__eyebrow">Medical Intake Correction</span>
            <h3 id="edit-case-title" className="case-modal-title">
              Edit Structured Case Details
            </h3>
          </div>
          <button
            type="button"
            className="case-modal-close"
            onClick={handleCancel}
            aria-label="Close edit dialog"
            disabled={isSaving}
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="case-modal-alert case-alert case-alert--error" role="alert">
            {error}
          </div>
        )}

        {isDirty && (
          <div className="case-unsaved-badge" role="status">
            &bull; Unsaved changes in progress
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="case-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`case-modal-tab ${activeTab === 'overview' ? 'case-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview & Onset
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'symptoms'}
            className={`case-modal-tab ${activeTab === 'symptoms' ? 'case-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('symptoms')}
          >
            Symptoms ({formData.symptoms.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'medications'}
            className={`case-modal-tab ${activeTab === 'medications' ? 'case-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('medications')}
          >
            Medications & Allergies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`case-modal-tab ${activeTab === 'history' ? 'case-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Medical History
          </button>
        </div>

        <form onSubmit={handleSubmit} className="case-modal-form">
          <div className="case-modal-body">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="case-form-section">
                <div className="case-form-group">
                  <label htmlFor="chiefComplaint" className="case-form-label">
                    Chief Complaint / Primary Concern
                  </label>
                  <textarea
                    id="chiefComplaint"
                    rows="3"
                    className="case-form-textarea"
                    value={formData.chiefComplaint}
                    onChange={(e) => handleFieldChange('chiefComplaint', e.target.value)}
                    placeholder="e.g. Severe shortness of breath and chest pressure for 2 days"
                    disabled={isSaving}
                  />
                  {clientErrors.chiefComplaint && (
                    <span className="case-form-error">{clientErrors.chiefComplaint}</span>
                  )}
                </div>

                <div className="case-form-grid-2">
                  <div className="case-form-group">
                    <label htmlFor="onset" className="case-form-label">
                      Onset
                    </label>
                    <input
                      id="onset"
                      type="text"
                      className="case-form-input"
                      value={formData.onset}
                      onChange={(e) => handleFieldChange('onset', e.target.value)}
                      placeholder="e.g. 3 days ago during morning exercise"
                      disabled={isSaving}
                    />
                    {clientErrors.onset && (
                      <span className="case-form-error">{clientErrors.onset}</span>
                    )}
                  </div>

                  <div className="case-form-group">
                    <label htmlFor="duration" className="case-form-label">
                      Duration
                    </label>
                    <input
                      id="duration"
                      type="text"
                      className="case-form-input"
                      value={formData.duration}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      placeholder="e.g. Constant for 48 hours"
                      disabled={isSaving}
                    />
                    {clientErrors.duration && (
                      <span className="case-form-error">{clientErrors.duration}</span>
                    )}
                  </div>

                  <div className="case-form-group">
                    <label htmlFor="severity" className="case-form-label">
                      Severity
                    </label>
                    <select
                      id="severity"
                      className="case-form-select"
                      value={formData.severity}
                      onChange={(e) => handleFieldChange('severity', e.target.value)}
                      disabled={isSaving}
                    >
                      <option value="">Select severity...</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    {clientErrors.severity && (
                      <span className="case-form-error">{clientErrors.severity}</span>
                    )}
                  </div>

                  <div className="case-form-group">
                    <label htmlFor="symptomLocation" className="case-form-label">
                      Symptom Location
                    </label>
                    <input
                      id="symptomLocation"
                      type="text"
                      className="case-form-input"
                      value={formData.symptomLocation}
                      onChange={(e) => handleFieldChange('symptomLocation', e.target.value)}
                      placeholder="e.g. Mid-chest radiating to left shoulder"
                      disabled={isSaving}
                    />
                    {clientErrors.symptomLocation && (
                      <span className="case-form-error">{clientErrors.symptomLocation}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SYMPTOMS */}
            {activeTab === 'symptoms' && (
              <div className="case-form-section">
                <div className="case-form-section__header">
                  <h4 className="case-section-subtitle">Manage Symptoms</h4>
                  <button
                    type="button"
                    onClick={handleAddSymptom}
                    className="btn-case-add"
                    disabled={isSaving}
                  >
                    + Add Symptom
                  </button>
                </div>

                {formData.symptoms.length === 0 ? (
                  <p className="case-empty-text">No symptoms added yet. Click &quot;Add Symptom&quot; above.</p>
                ) : (
                  <div className="case-edit-items-list">
                    {formData.symptoms.map((sym, idx) => (
                      <div key={idx} className="case-edit-item-card">
                        <div className="case-edit-item-card__header">
                          <span className="case-edit-item-num">Symptom #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSymptom(idx)}
                            className="btn-case-remove"
                            aria-label={`Remove symptom ${idx + 1}`}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="case-form-grid-2">
                          <div className="case-form-group">
                            <label className="case-form-label">Symptom Name *</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={sym.name}
                              onChange={(e) => handleUpdateSymptom(idx, 'name', e.target.value)}
                              placeholder="e.g. Dyspnea, Fatigue"
                              disabled={isSaving}
                            />
                            {clientErrors[`symptom_${idx}_name`] && (
                              <span className="case-form-error">
                                {clientErrors[`symptom_${idx}_name`]}
                              </span>
                            )}
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Severity</label>
                            <select
                              className="case-form-select"
                              value={sym.severity}
                              onChange={(e) => handleUpdateSymptom(idx, 'severity', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="unspecified">Unspecified</option>
                              <option value="mild">Mild</option>
                              <option value="moderate">Moderate</option>
                              <option value="severe">Severe</option>
                            </select>
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Status</label>
                            <select
                              className="case-form-select"
                              value={sym.status}
                              onChange={(e) => handleUpdateSymptom(idx, 'status', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="active">Active</option>
                              <option value="improving">Improving</option>
                              <option value="worsening">Worsening</option>
                              <option value="resolved">Resolved</option>
                              <option value="unspecified">Unspecified</option>
                            </select>
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Location</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={sym.location}
                              onChange={(e) => handleUpdateSymptom(idx, 'location', e.target.value)}
                              placeholder="e.g. Chest, Lower back"
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MEDICATIONS & ALLERGIES */}
            {activeTab === 'medications' && (
              <div className="case-form-section">
                {/* Medications Subsection */}
                <div className="case-form-section__header">
                  <h4 className="case-section-subtitle">Medications ({formData.medications.length})</h4>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="btn-case-add"
                    disabled={isSaving}
                  >
                    + Add Medication
                  </button>
                </div>

                {formData.medications.length === 0 ? (
                  <p className="case-empty-text">No medications listed.</p>
                ) : (
                  <div className="case-edit-items-list mb-6">
                    {formData.medications.map((med, idx) => (
                      <div key={idx} className="case-edit-item-card">
                        <div className="case-edit-item-card__header">
                          <span className="case-edit-item-num">Medication #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="btn-case-remove"
                            aria-label={`Remove medication ${idx + 1}`}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="case-form-grid-2">
                          <div className="case-form-group">
                            <label className="case-form-label">Name *</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={med.name}
                              onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                              placeholder="e.g. Lisinopril, Metformin"
                              disabled={isSaving}
                            />
                            {clientErrors[`medication_${idx}_name`] && (
                              <span className="case-form-error">
                                {clientErrors[`medication_${idx}_name`]}
                              </span>
                            )}
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Dosage</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={med.dosage}
                              onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                              placeholder="e.g. 10mg, 500mg"
                              disabled={isSaving}
                            />
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Frequency</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={med.frequency}
                              onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                              placeholder="e.g. once daily, as needed"
                              disabled={isSaving}
                            />
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Status</label>
                            <select
                              className="case-form-select"
                              value={med.status}
                              onChange={(e) => handleUpdateMedication(idx, 'status', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="current">Current</option>
                              <option value="discontinued">Discontinued</option>
                              <option value="as_needed">As Needed</option>
                              <option value="unspecified">Unspecified</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Allergies Subsection */}
                <div className="case-form-section__header mt-6">
                  <h4 className="case-section-subtitle">Allergies ({formData.allergies.length})</h4>
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="btn-case-add"
                    disabled={isSaving}
                  >
                    + Add Allergy
                  </button>
                </div>

                {formData.allergies.length === 0 ? (
                  <p className="case-empty-text">No allergies documented.</p>
                ) : (
                  <div className="case-edit-items-list">
                    {formData.allergies.map((all, idx) => (
                      <div key={idx} className="case-edit-item-card">
                        <div className="case-edit-item-card__header">
                          <span className="case-edit-item-num">Allergy #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAllergy(idx)}
                            className="btn-case-remove"
                            aria-label={`Remove allergy ${idx + 1}`}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="case-form-grid-2">
                          <div className="case-form-group">
                            <label className="case-form-label">Substance *</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={all.substance}
                              onChange={(e) => handleUpdateAllergy(idx, 'substance', e.target.value)}
                              placeholder="e.g. Penicillin, Sulfa"
                              disabled={isSaving}
                            />
                            {clientErrors[`allergy_${idx}_substance`] && (
                              <span className="case-form-error">
                                {clientErrors[`allergy_${idx}_substance`]}
                              </span>
                            )}
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Reaction</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={all.reaction}
                              onChange={(e) => handleUpdateAllergy(idx, 'reaction', e.target.value)}
                              placeholder="e.g. Hives, Anaphylaxis"
                              disabled={isSaving}
                            />
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Severity</label>
                            <select
                              className="case-form-select"
                              value={all.severity}
                              onChange={(e) => handleUpdateAllergy(idx, 'severity', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="mild">Mild</option>
                              <option value="moderate">Moderate</option>
                              <option value="severe">Severe</option>
                              <option value="unspecified">Unspecified</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MEDICAL HISTORY */}
            {activeTab === 'history' && (
              <div className="case-form-section">
                <div className="case-form-section__header">
                  <h4 className="case-section-subtitle">Medical History Conditions</h4>
                  <button
                    type="button"
                    onClick={handleAddHistory}
                    className="btn-case-add"
                    disabled={isSaving}
                  >
                    + Add Condition
                  </button>
                </div>

                {formData.relevantMedicalHistory.length === 0 ? (
                  <p className="case-empty-text">No prior medical history listed.</p>
                ) : (
                  <div className="case-edit-items-list">
                    {formData.relevantMedicalHistory.map((hist, idx) => (
                      <div key={idx} className="case-edit-item-card">
                        <div className="case-edit-item-card__header">
                          <span className="case-edit-item-num">Condition #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHistory(idx)}
                            className="btn-case-remove"
                            aria-label={`Remove condition ${idx + 1}`}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="case-form-grid-2">
                          <div className="case-form-group">
                            <label className="case-form-label">Condition *</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={hist.condition}
                              onChange={(e) => handleUpdateHistory(idx, 'condition', e.target.value)}
                              placeholder="e.g. Hypertension, Type 2 Diabetes"
                              disabled={isSaving}
                            />
                            {clientErrors[`history_${idx}_condition`] && (
                              <span className="case-form-error">
                                {clientErrors[`history_${idx}_condition`]}
                              </span>
                            )}
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Approx Diagnosis Date/Time</label>
                            <input
                              type="text"
                              className="case-form-input"
                              value={hist.diagnosedApprox}
                              onChange={(e) => handleUpdateHistory(idx, 'diagnosedApprox', e.target.value)}
                              placeholder="e.g. 2018, 5 years ago"
                              disabled={isSaving}
                            />
                          </div>

                          <div className="case-form-group">
                            <label className="case-form-label">Status</label>
                            <select
                              className="case-form-select"
                              value={hist.status}
                              onChange={(e) => handleUpdateHistory(idx, 'status', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="active">Active</option>
                              <option value="resolved">Resolved</option>
                              <option value="historical">Historical</option>
                              <option value="unspecified">Unspecified</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="case-modal-footer">
            <button
              type="button"
              className="btn-case-secondary"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-case-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="case-spinner-sm" aria-hidden="true" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
