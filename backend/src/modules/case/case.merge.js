import Case from './models/Case.js';

/**
 * Normalizes text for conservative equality comparison
 * @param {string} str
 * @returns {string}
 */
const normalizeText = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().toLowerCase();
};

/**
 * Merges newly extracted clinical candidate data into an existing Case document
 * following non-destructive, conservative healthcare merge rules.
 *
 * @param {Object} caseDoc - Mongoose Case document instance
 * @param {Object} candidateData - Validated candidate data from extractor
 * @param {string|Object} messageId - Originating message ID for source tracking & idempotency
 * @returns {{ modified: boolean, caseDoc: Object }} Result with updated document
 */
export const mergeExtractedDataIntoCase = (
  caseDoc,
  candidateData = {},
  identifier,
  { sourceType = 'patient_report' } = {}
) => {
  if (!caseDoc) {
    throw new Error('Case document is required for merge');
  }

  const strIdentifier = identifier ? identifier.toString() : null;

  // 1. Strict Idempotency Check
  if (sourceType === 'document') {
    if (
      strIdentifier &&
      Array.isArray(caseDoc.processedDocumentIds) &&
      caseDoc.processedDocumentIds.some((id) => (id ? id.toString() === strIdentifier : false))
    ) {
      return { modified: false, caseDoc };
    }
  } else {
    // Default: patient_report message tracking
    if (
      strIdentifier &&
      Array.isArray(caseDoc.processedMessageIds) &&
      caseDoc.processedMessageIds.some((id) => (id ? id.toString() === strIdentifier : false))
    ) {
      return { modified: false, caseDoc };
    }
  }

  let hasModifications = false;

  // 2. Merge Single-value Scalar Fields (chiefComplaint, onset, duration, severity, symptomLocation)
  const scalarFields = ['chiefComplaint', 'onset', 'duration', 'severity', 'symptomLocation'];

  for (const field of scalarFields) {
    const candidateFieldObj = candidateData[field];
    if (!candidateFieldObj) continue;

    const candidateVal =
      field === 'chiefComplaint' ? candidateFieldObj.text : candidateFieldObj.value;

    if (!candidateVal || typeof candidateVal !== 'string' || !candidateVal.trim()) {
      continue;
    }

    const existingFieldObj = caseDoc[field];
    const existingVal =
      field === 'chiefComplaint' ? existingFieldObj?.text : existingFieldObj?.value;

    if (!existingVal || !existingVal.trim()) {
      // Field was previously empty: set initial value with source attribution
      caseDoc[field] = {
        ...(field === 'chiefComplaint'
          ? { text: candidateVal.trim() }
          : { value: candidateVal.trim() }),
        source: candidateFieldObj.source || null,
      };
      hasModifications = true;
    } else if (normalizeText(existingVal) !== normalizeText(candidateVal)) {
      // Conflicting or updated claim: preserve historical discrepancy without guessing which is correct
      caseDoc.discrepancies.push({
        field,
        previousValue: existingVal.trim(),
        newValue: candidateVal.trim(),
        source: candidateFieldObj.source || null,
        recordedAt: new Date(),
      });

      // Update current field to latest reported value
      caseDoc[field] = {
        ...(field === 'chiefComplaint'
          ? { text: candidateVal.trim() }
          : { value: candidateVal.trim() }),
        source: candidateFieldObj.source || null,
      };
      hasModifications = true;
    }
  }

  // 3. Merge Symptoms Array
  if (Array.isArray(candidateData.symptoms) && candidateData.symptoms.length > 0) {
    for (const candSym of candidateData.symptoms) {
      if (!candSym.name || !candSym.name.trim()) continue;
      const normCandName = normalizeText(candSym.name);

      const existingIndex = caseDoc.symptoms.findIndex(
        (s) => normalizeText(s.name) === normCandName
      );

      if (existingIndex === -1) {
        // New symptom: append
        caseDoc.symptoms.push(candSym);
        hasModifications = true;
      } else {
        // Existing symptom: merge non-destructively
        const existing = caseDoc.symptoms[existingIndex];
        let symUpdated = false;

        if (candSym.severity && candSym.severity !== 'unspecified' && existing.severity === 'unspecified') {
          existing.severity = candSym.severity;
          symUpdated = true;
        } else if (
          candSym.severity &&
          candSym.severity !== 'unspecified' &&
          existing.severity !== candSym.severity
        ) {
          // Record severity discrepancy if different
          caseDoc.discrepancies.push({
            field: `symptom.${existing.name}.severity`,
            previousValue: existing.severity,
            newValue: candSym.severity,
            source: candSym.source || null,
            recordedAt: new Date(),
          });
          existing.severity = candSym.severity;
          symUpdated = true;
        }

        if (candSym.location && candSym.location !== existing.location) {
          existing.location = candSym.location;
          symUpdated = true;
        }
        if (candSym.onset && candSym.onset !== existing.onset) {
          existing.onset = candSym.onset;
          symUpdated = true;
        }
        if (candSym.duration && candSym.duration !== existing.duration) {
          existing.duration = candSym.duration;
          symUpdated = true;
        }
        if (candSym.status && candSym.status !== 'unspecified' && existing.status !== candSym.status) {
          existing.status = candSym.status;
          symUpdated = true;
        }

        if (symUpdated) {
          existing.source = candSym.source || existing.source;
          hasModifications = true;
        }
      }
    }
  }

  // 4. Merge Associated Symptoms
  if (Array.isArray(candidateData.associatedSymptoms) && candidateData.associatedSymptoms.length > 0) {
    for (const candAssoc of candidateData.associatedSymptoms) {
      if (!candAssoc.name || !candAssoc.name.trim()) continue;
      const normName = normalizeText(candAssoc.name);

      const exists = caseDoc.associatedSymptoms.some(
        (a) => normalizeText(a.name) === normName
      );

      if (!exists) {
        caseDoc.associatedSymptoms.push(candAssoc);
        hasModifications = true;
      }
    }
  }

  // 5. Merge Relevant Medical History
  if (Array.isArray(candidateData.relevantMedicalHistory) && candidateData.relevantMedicalHistory.length > 0) {
    for (const candHist of candidateData.relevantMedicalHistory) {
      if (!candHist.condition || !candHist.condition.trim()) continue;
      const normCond = normalizeText(candHist.condition);

      const existingIndex = caseDoc.relevantMedicalHistory.findIndex(
        (h) => normalizeText(h.condition) === normCond
      );

      if (existingIndex === -1) {
        caseDoc.relevantMedicalHistory.push(candHist);
        hasModifications = true;
      } else {
        const existing = caseDoc.relevantMedicalHistory[existingIndex];
        let histUpdated = false;

        if (candHist.diagnosedApprox && candHist.diagnosedApprox !== existing.diagnosedApprox) {
          existing.diagnosedApprox = candHist.diagnosedApprox;
          histUpdated = true;
        }
        if (candHist.status && candHist.status !== 'unspecified' && existing.status !== candHist.status) {
          existing.status = candHist.status;
          histUpdated = true;
        }

        if (histUpdated) {
          existing.source = candHist.source || existing.source;
          hasModifications = true;
        }
      }
    }
  }

  // 6. Merge Medications
  if (Array.isArray(candidateData.medications) && candidateData.medications.length > 0) {
    for (const candMed of candidateData.medications) {
      if (!candMed.name || !candMed.name.trim()) continue;
      const normMedName = normalizeText(candMed.name);

      const existingIndex = caseDoc.medications.findIndex(
        (m) => normalizeText(m.name) === normMedName
      );

      if (existingIndex === -1) {
        caseDoc.medications.push(candMed);
        hasModifications = true;
      } else {
        const existing = caseDoc.medications[existingIndex];
        let medUpdated = false;

        if (candMed.dosage && candMed.dosage !== existing.dosage) {
          existing.dosage = candMed.dosage;
          medUpdated = true;
        }
        if (candMed.frequency && candMed.frequency !== existing.frequency) {
          existing.frequency = candMed.frequency;
          medUpdated = true;
        }
        if (candMed.status && candMed.status !== 'unspecified' && existing.status !== candMed.status) {
          existing.status = candMed.status;
          medUpdated = true;
        }

        if (medUpdated) {
          existing.source = candMed.source || existing.source;
          hasModifications = true;
        }
      }
    }
  }

  // 7. Merge Allergies
  if (Array.isArray(candidateData.allergies) && candidateData.allergies.length > 0) {
    for (const candAllg of candidateData.allergies) {
      if (!candAllg.substance || !candAllg.substance.trim()) continue;
      const normSub = normalizeText(candAllg.substance);

      const existingIndex = caseDoc.allergies.findIndex(
        (a) => normalizeText(a.substance) === normSub
      );

      if (existingIndex === -1) {
        caseDoc.allergies.push(candAllg);
        hasModifications = true;
      } else {
        const existing = caseDoc.allergies[existingIndex];
        let allgUpdated = false;

        if (candAllg.reaction && candAllg.reaction !== existing.reaction) {
          existing.reaction = candAllg.reaction;
          allgUpdated = true;
        }
        if (candAllg.severity && candAllg.severity !== 'unspecified' && existing.severity !== candAllg.severity) {
          existing.severity = candAllg.severity;
          allgUpdated = true;
        }

        if (allgUpdated) {
          existing.source = candAllg.source || existing.source;
          hasModifications = true;
        }
      }
    }
  }

  // 8. Merge Vitals
  if (Array.isArray(candidateData.vitals) && candidateData.vitals.length > 0) {
    for (const candVital of candidateData.vitals) {
      caseDoc.vitals.push(candVital);
      hasModifications = true;
    }
  }

  // 9. Merge Timeline
  if (Array.isArray(candidateData.timeline) && candidateData.timeline.length > 0) {
    for (const candTime of candidateData.timeline) {
      if (!candTime.event || !candTime.event.trim()) continue;
      const normEvent = normalizeText(candTime.event);
      const normOccurred = normalizeText(candTime.occurredAt || '');

      const exists = caseDoc.timeline.some(
        (t) => normalizeText(t.event) === normEvent && normalizeText(t.occurredAt || '') === normOccurred
      );

      if (!exists) {
        caseDoc.timeline.push(candTime);
        hasModifications = true;
      }
    }
  }

  // 10. Merge Report Findings (Step 4.4 - derived from medical documents)
  if (Array.isArray(candidateData.reportFindings) && candidateData.reportFindings.length > 0) {
    for (const candFinding of candidateData.reportFindings) {
      if (!candFinding.title || !candFinding.finding) continue;
      const normTitle = normalizeText(candFinding.title);
      const normFinding = normalizeText(candFinding.finding);

      const exists = caseDoc.reportFindings.some(
        (rf) =>
          normalizeText(rf.title) === normTitle &&
          normalizeText(rf.finding) === normFinding &&
          (rf.documentId ? rf.documentId.toString() : null) ===
            (candFinding.documentId ? candFinding.documentId.toString() : null)
      );

      if (!exists) {
        caseDoc.reportFindings.push(candFinding);
        hasModifications = true;
      }
    }
  }

  // 11. Merge Missing Information (and clear newly satisfied missing items)
  if (Array.isArray(caseDoc.missingInformation) && caseDoc.missingInformation.length > 0) {
    if (caseDoc.onset?.value) {
      caseDoc.missingInformation = caseDoc.missingInformation.filter(
        (m) => normalizeText(m.category) !== 'onset'
      );
    }
    if (caseDoc.duration?.value) {
      caseDoc.missingInformation = caseDoc.missingInformation.filter(
        (m) => normalizeText(m.category) !== 'duration'
      );
    }
    if (caseDoc.severity?.value) {
      caseDoc.missingInformation = caseDoc.missingInformation.filter(
        (m) => normalizeText(m.category) !== 'severity'
      );
    }
  }

  if (Array.isArray(candidateData.missingInformation) && candidateData.missingInformation.length > 0) {
    for (const candMissing of candidateData.missingInformation) {
      if (!candMissing.category || !candMissing.description) continue;
      const normCat = normalizeText(candMissing.category);

      if (normCat === 'onset' && caseDoc.onset?.value) continue;
      if (normCat === 'duration' && caseDoc.duration?.value) continue;
      if (normCat === 'severity' && caseDoc.severity?.value) continue;

      const exists = caseDoc.missingInformation.some(
        (m) => normalizeText(m.category) === normCat
      );

      if (!exists) {
        caseDoc.missingInformation.push(candMissing);
        hasModifications = true;
      }
    }
  }

  // 12. Record processed ID for strict idempotency
  if (strIdentifier) {
    if (sourceType === 'document') {
      caseDoc.processedDocumentIds.push(identifier);
    } else {
      caseDoc.processedMessageIds.push(identifier);
    }
    hasModifications = true;
  }

  return { modified: hasModifications, caseDoc };
};

/**
 * Saves a Case document with optimistic concurrency retry handling.
 * If another update modified the document version in parallel, reloads the latest document,
 * re-applies the merge, and retries.
 *
 * @param {Object} caseDoc - Initial Mongoose Case document
 * @param {Object} candidateData - Validated candidate data
 * @param {string|Object} identifier - Originating message ID or document ID
 * @param {Object|number} [options=3] - Options object or maxRetries number
 * @returns {Promise<Object>} Persisted Case document
 */
export const saveCaseWithRetry = async (
  caseDoc,
  candidateData,
  identifier,
  options = {}
) => {
  const maxRetries = typeof options === 'number' ? options : options.maxRetries || 3;
  const sourceType = typeof options === 'object' && options.sourceType ? options.sourceType : 'patient_report';

  let currentDoc = caseDoc;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { modified } = mergeExtractedDataIntoCase(currentDoc, candidateData, identifier, {
        sourceType,
      });
      if (!modified) {
        return currentDoc;
      }
      return await currentDoc.save();
    } catch (error) {
      if (error.name === 'VersionError' && attempt < maxRetries) {
        console.warn(`[CaseMerge] Concurrency VersionError on attempt ${attempt}. Reloading latest case and retrying...`);
        const freshDoc = await Case.findById(currentDoc._id);
        if (!freshDoc) {
          throw error;
        }
        currentDoc = freshDoc;
        continue;
      }
      throw error;
    }
  }
};

export default {
  mergeExtractedDataIntoCase,
  saveCaseWithRetry,
};
