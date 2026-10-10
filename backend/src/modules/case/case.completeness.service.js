import * as caseRepo from './case.repository.js';

/**
 * Service for deterministic Case Completeness and Missing Information evaluation.
 *
 * Evaluates persisted case documents without calling external AI models or inventing data.
 * Purely structural and clinical-intake completeness; NOT a diagnostic or triage tool.
 */

/**
 * Evaluates a case document and returns a structured completeness assessment.
 *
 * @param {Object} caseDoc - Mongoose Case document or plain JS object
 * @returns {Object} Structured completeness assessment
 */
export const evaluateCaseCompleteness = (caseDoc) => {
  if (!caseDoc) {
    return {
      isComplete: false,
      canSubmitForReview: false,
      completionPercentage: 0,
      missingRequiredInformation: [
        {
          field: 'case',
          category: 'case',
          label: 'Medical Case',
          reason: 'No case record has been initialized.',
        },
      ],
      missingOptionalInformation: [],
      incompleteFields: [],
      unresolvedDiscrepancies: [],
      discrepancyCount: 0,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const missingRequired = [];
  const missingOptional = [];
  const incomplete = [];

  // Helper to normalize strings
  const hasText = (val) => typeof val === 'string' && val.trim().length > 0;

  // ── 1. Check Chief Complaint (Required for Review) ─────────────────────────
  const chiefText = caseDoc.chiefComplaint?.text;
  if (!hasText(chiefText)) {
    missingRequired.push({
      field: 'chiefComplaint',
      category: 'chief_complaint',
      label: 'Chief Complaint',
      reason: 'The primary concern or reason for consultation is required.',
    });
  } else if (chiefText.trim().length < 5) {
    incomplete.push({
      field: 'chiefComplaint',
      label: 'Chief Complaint',
      reason: 'Chief complaint is very brief. Additional clinical context may be needed.',
    });
  }

  // ── 2. Check Symptoms (Required for Review) ───────────────────────────────
  const symptoms = Array.isArray(caseDoc.symptoms) ? caseDoc.symptoms : [];
  if (symptoms.length === 0) {
    missingRequired.push({
      field: 'symptoms',
      category: 'symptoms',
      label: 'Reported Symptoms',
      reason: 'At least one specific symptom must be documented.',
    });
  } else {
    // Check for incomplete symptom attributes
    for (const sym of symptoms) {
      if (sym.severity === 'unspecified') {
        incomplete.push({
          field: `symptom.${sym.name}.severity`,
          label: `Symptom "${sym.name}" Severity`,
          reason: `Severity for "${sym.name}" is marked as unspecified.`,
        });
      }
      if (sym.status === 'unspecified') {
        incomplete.push({
          field: `symptom.${sym.name}.status`,
          label: `Symptom "${sym.name}" Status`,
          reason: `Status for "${sym.name}" is marked as unspecified.`,
        });
      }
    }
  }

  // ── 3. Check Timing: Onset or Duration (Required for Review) ──────────────
  const hasOnset = hasText(caseDoc.onset?.value);
  const hasDuration = hasText(caseDoc.duration?.value);
  const hasSymptomTiming = symptoms.some((s) => hasText(s.onset) || hasText(s.duration));

  if (!hasOnset && !hasDuration && !hasSymptomTiming) {
    missingRequired.push({
      field: 'timing',
      category: 'timing',
      label: 'Symptom Timing (Onset or Duration)',
      reason: 'When symptoms began (onset) or how long they have lasted (duration) is required.',
    });
  } else if (!hasOnset && !symptoms.some((s) => hasText(s.onset))) {
    missingOptional.push({
      field: 'onset',
      category: 'timing',
      label: 'Specific Onset',
      reason: 'Precise symptom start date/time has not been documented (optional).',
    });
  } else if (!hasDuration && !symptoms.some((s) => hasText(s.duration))) {
    missingOptional.push({
      field: 'duration',
      category: 'timing',
      label: 'Symptom Duration',
      reason: 'Overall symptom duration has not been explicitly stated (optional).',
    });
  }

  // ── 4. Check Severity (Required for Review) ───────────────────────────────
  const hasOverallSeverity = hasText(caseDoc.severity?.value);
  const hasSpecifiedSymptomSeverity = symptoms.some(
    (s) => s.severity && s.severity !== 'unspecified'
  );

  if (!hasOverallSeverity && !hasSpecifiedSymptomSeverity) {
    missingRequired.push({
      field: 'severity',
      category: 'severity',
      label: 'Symptom Severity',
      reason: 'An indication of severity (mild, moderate, or severe) is required for clinical review.',
    });
  }

  // ── 5. Check Critical Missing Items Extracted by Intake ───────────────────
  const missingInfoList = Array.isArray(caseDoc.missingInformation)
    ? caseDoc.missingInformation
    : [];

  for (const mItem of missingInfoList) {
    if (!mItem.category) continue;
    const cat = mItem.category.toLowerCase().trim();

    // If marked critical by clinical intake, verify if it is already satisfied by case data
    if (mItem.importance === 'critical') {
      const alreadySatisfied =
        (cat === 'onset' && (hasOnset || symptoms.some((s) => hasText(s.onset)))) ||
        (cat === 'duration' && (hasDuration || symptoms.some((s) => hasText(s.duration)))) ||
        (cat === 'severity' && (hasOverallSeverity || hasSpecifiedSymptomSeverity)) ||
        (cat === 'chief_complaint' && hasText(chiefText)) ||
        (cat === 'symptoms' && symptoms.length > 0);

      if (!alreadySatisfied) {
        const existingFieldReq = missingRequired.some((r) => r.category === cat);
        if (!existingFieldReq) {
          missingRequired.push({
            field: `missingInfo.${cat}`,
            category: cat,
            label: `Critical Missing: ${mItem.category}`,
            reason: mItem.description || 'Marked as critical uncollected information during intake.',
          });
        }
      }
    } else {
      // Non-critical items in missingInformation feed into optional
      missingOptional.push({
        field: `missingInfo.${cat}`,
        category: cat,
        label: `Intake Detail: ${mItem.category}`,
        reason: mItem.description,
      });
    }
  }

  // ── 6. Check Optional Clinical Context Fields ─────────────────────────────
  // Symptom location
  const hasLocation = hasText(caseDoc.symptomLocation?.value) || symptoms.some((s) => hasText(s.location));
  if (!hasLocation) {
    missingOptional.push({
      field: 'symptomLocation',
      category: 'location',
      label: 'Symptom Location',
      reason: 'Anatomical location of primary symptom has not been provided (optional).',
    });
  }

  // Current medications
  const meds = Array.isArray(caseDoc.medications) ? caseDoc.medications : [];
  if (meds.length === 0) {
    missingOptional.push({
      field: 'medications',
      category: 'medications',
      label: 'Current Medications',
      reason: 'Current medications or over-the-counter drugs have not been documented (optional).',
    });
  } else {
    for (const m of meds) {
      if (!hasText(m.dosage) || !hasText(m.frequency)) {
        incomplete.push({
          field: `medications.${m.name}`,
          label: `Medication "${m.name}" Details`,
          reason: `Dosage or administration frequency for "${m.name}" is incomplete.`,
        });
      }
    }
  }

  // Allergies
  const allergies = Array.isArray(caseDoc.allergies) ? caseDoc.allergies : [];
  if (allergies.length === 0) {
    missingOptional.push({
      field: 'allergies',
      category: 'allergies',
      label: 'Known Allergies',
      reason: 'Known drug or environmental allergies have not been documented (optional).',
    });
  } else {
    for (const a of allergies) {
      if (a.severity === 'unspecified' || !hasText(a.reaction)) {
        incomplete.push({
          field: `allergies.${a.substance}`,
          label: `Allergy "${a.substance}" Details`,
          reason: `Reaction details or severity for "${a.substance}" are unspecified.`,
        });
      }
    }
  }

  // Relevant medical history
  const history = Array.isArray(caseDoc.relevantMedicalHistory) ? caseDoc.relevantMedicalHistory : [];
  if (history.length === 0) {
    missingOptional.push({
      field: 'relevantMedicalHistory',
      category: 'medical_history',
      label: 'Past Medical History',
      reason: 'Pre-existing medical conditions or chronic illnesses have not been documented (optional).',
    });
  } else {
    for (const h of history) {
      if (h.status === 'unspecified') {
        incomplete.push({
          field: `relevantMedicalHistory.${h.condition}`,
          label: `History "${h.condition}" Status`,
          reason: `Status for pre-existing condition "${h.condition}" is unspecified.`,
        });
      }
    }
  }

  // Vitals
  const vitals = Array.isArray(caseDoc.vitals) ? caseDoc.vitals : [];
  if (vitals.length === 0) {
    missingOptional.push({
      field: 'vitals',
      category: 'vitals',
      label: 'Vital Signs',
      reason: 'Blood pressure, heart rate, or temperature readings are not recorded (optional).',
    });
  }

  // Associated Symptoms
  const assoc = Array.isArray(caseDoc.associatedSymptoms) ? caseDoc.associatedSymptoms : [];
  if (assoc.length === 0) {
    missingOptional.push({
      field: 'associatedSymptoms',
      category: 'associated_symptoms',
      label: 'Associated Symptoms',
      reason: 'Secondary or associated symptoms have not been noted (optional).',
    });
  }

  // ── 7. Check Unresolved Discrepancies ─────────────────────────────────────
  const rawDiscrepancies = Array.isArray(caseDoc.discrepancies) ? caseDoc.discrepancies : [];
  const unresolvedDiscrepancies = rawDiscrepancies.map((d) => ({
    field: d.field,
    previousValue: d.previousValue,
    previousSource: d.previousSource || null,
    newValue: d.newValue,
    source: d.source || null,
    recordedAt: d.recordedAt,
  }));

  // ── 8. Calculate Completion Percentage (0-100) ────────────────────────────
  // Weighted scoring based on presence of clinical intake information:
  // Required elements: 60 points
  let score = 0;
  if (hasText(chiefText)) score += 20;
  if (symptoms.length > 0) score += 15;
  if (hasOnset || hasDuration || hasSymptomTiming) score += 15;
  if (hasOverallSeverity || hasSpecifiedSymptomSeverity) score += 10;

  // Optional background elements: 40 points
  if (hasLocation) score += 5;
  if (history.length > 0) score += 10;
  if (meds.length > 0) score += 10;
  if (allergies.length > 0) score += 5;
  if (vitals.length > 0 || (Array.isArray(caseDoc.reportFindings) && caseDoc.reportFindings.length > 0)) {
    score += 5;
  }
  if (assoc.length > 0 || (Array.isArray(caseDoc.timeline) && caseDoc.timeline.length > 0)) {
    score += 5;
  }

  // If any required info is missing, completion score cannot exceed 85%
  if (missingRequired.length > 0 && score > 85) {
    score = 85;
  }

  const completionPercentage = Math.min(100, Math.max(0, Math.round(score)));

  // Can submit for review if ALL required fields are satisfied
  const canSubmitForReview = missingRequired.length === 0;

  // Fully complete only when no required missing, no optional missing, no discrepancies, no incomplete
  const isComplete =
    missingRequired.length === 0 &&
    missingOptional.length === 0 &&
    unresolvedDiscrepancies.length === 0 &&
    incomplete.length === 0;

  return {
    isComplete,
    canSubmitForReview,
    completionPercentage,
    missingRequiredInformation: missingRequired,
    missingOptionalInformation: missingOptional,
    incompleteFields: incomplete,
    unresolvedDiscrepancies,
    discrepancyCount: unresolvedDiscrepancies.length,
    evaluatedAt: new Date().toISOString(),
  };
};

/**
 * Retrieves the completeness evaluation for a specific case by ID,
 * enforcing patient ownership and professional access policies.
 *
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>} Completeness evaluation result
 */
export const getCaseCompleteness = async ({ caseId, userId, userRole }) => {
  const caseDoc = await caseRepo.findCaseById(caseId);
  if (!caseDoc) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  // Patient access boundary: Patients may only evaluate their own cases
  if (userRole === 'PATIENT' && caseDoc.patientId.toString() !== userId.toString()) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  const completeness = evaluateCaseCompleteness(caseDoc);

  return {
    caseId: caseDoc._id.toString(),
    completeness,
  };
};

export default {
  evaluateCaseCompleteness,
  getCaseCompleteness,
};
