import mongoose from 'mongoose';
import MedicalReport from './models/MedicalReport.js';
import * as caseRepo from './case.repository.js';
import * as conversationRepo from '../conversation/conversation.repository.js';
import * as documentRepo from '../document/document.repository.js';
import { evaluateCaseCompleteness } from './case.completeness.service.js';

/**
 * Service for Conversation-Based Medical Intake Report generation,
 * reconciliation, timeline construction, and versioned persistence.
 *
 * Strict non-diagnostic guidelines:
 * - Does not invent clinical facts, dates, or citations.
 * - Incomplete consultations produce a clearly labeled draft.
 * - AI is not the sole authority and cannot overwrite clinical intake records.
 */

/**
 * Helper to test if a string can be parsed as a valid, non-epoch calendar date.
 * Avoids converting relative text strings like "3 days ago" into invented dates.
 */
const parseKnownCalendarDate = (val) => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();

  // Guard against relative text expressions
  const relativePatterns = [
    /\bago\b/i,
    /\byesterday\b/i,
    /\btoday\b/i,
    /\btomorrow\b/i,
    /\blast\b/i,
    /\bnext\b/i,
    /\bthis morning\b/i,
    /\bchildhood\b/i,
    /\bsince\b/i,
    /\bweeks?\b/i,
    /\bmonths?\b/i,
    /\bdays?\b/i,
    /\byears?\b/i,
    /\bhours?\b/i,
  ];
  if (relativePatterns.some((pattern) => pattern.test(trimmed))) {
    return null;
  }

  // Check for ISO or YYYY-MM-DD or standard recognizable date format
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    return parsed;
  }
  return null;
};

/**
 * Timeline builder that organizes chronological events with known dates
 * while preserving relative/approximate events without fabricating timestamps.
 */
export const buildMedicalTimeline = (caseDoc, messages = [], documents = []) => {
  const events = [];
  let eventCounter = 1;

  // 1. Existing Case timeline items
  if (Array.isArray(caseDoc.timeline)) {
    for (const item of caseDoc.timeline) {
      if (item && item.event) {
        const parsedDate = parseKnownCalendarDate(item.occurredAt);
        events.push({
          id: item._id ? item._id.toString() : `tl-${eventCounter++}`,
          event: item.event,
          occurredAt: item.occurredAt || null,
          isApproximate: !parsedDate,
          sortDate: parsedDate,
          source: item.source || null,
        });
      }
    }
  }

  // 2. Symptom onsets
  if (Array.isArray(caseDoc.symptoms)) {
    for (const sym of caseDoc.symptoms) {
      if (sym && sym.name && sym.onset) {
        const parsedDate = parseKnownCalendarDate(sym.onset);
        events.push({
          id: `sym-onset-${sym._id ? sym._id.toString() : eventCounter++}`,
          event: `Onset of ${sym.name} reported (${sym.severity || 'unspecified'} severity)`,
          occurredAt: sym.onset,
          isApproximate: !parsedDate,
          sortDate: parsedDate,
          source: sym.source || null,
        });
      }
    }
  }

  // 3. Relevant Medical History
  if (Array.isArray(caseDoc.relevantMedicalHistory)) {
    for (const hist of caseDoc.relevantMedicalHistory) {
      if (hist && hist.condition && hist.diagnosedApprox) {
        const parsedDate = parseKnownCalendarDate(hist.diagnosedApprox);
        events.push({
          id: `hist-${hist._id ? hist._id.toString() : eventCounter++}`,
          event: `Diagnosis of ${hist.condition}`,
          occurredAt: hist.diagnosedApprox,
          isApproximate: !parsedDate,
          sortDate: parsedDate,
          source: hist.source || null,
        });
      }
    }
  }

  // 4. Vitals recordings
  if (Array.isArray(caseDoc.vitals)) {
    for (const v of caseDoc.vitals) {
      if (v && v.recordedAt) {
        const date = new Date(v.recordedAt);
        const details = [];
        if (v.bloodPressure) details.push(`BP ${v.bloodPressure}`);
        if (v.heartRate) details.push(`HR ${v.heartRate} bpm`);
        if (v.temperature) details.push(`Temp ${v.temperature}`);
        if (v.oxygenSaturation) details.push(`SpO2 ${v.oxygenSaturation}%`);
        events.push({
          id: `vital-${v._id ? v._id.toString() : eventCounter++}`,
          event: `Vitals recorded: ${details.join(', ') || 'Reading taken'}`,
          occurredAt: date.toISOString(),
          isApproximate: false,
          sortDate: date,
          source: v.source || null,
        });
      }
    }
  }

  // 5. Medical Document uploads/findings
  if (Array.isArray(documents)) {
    for (const doc of documents) {
      if (doc && doc.createdAt) {
        const date = new Date(doc.createdAt);
        events.push({
          id: `doc-${doc._id ? doc._id.toString() : eventCounter++}`,
          event: `Medical document uploaded: "${doc.originalName || 'Medical Report'}" (${doc.status})`,
          occurredAt: date.toISOString(),
          isApproximate: false,
          sortDate: date,
          source: {
            sourceType: 'document',
            sourceId: doc._id.toString(),
            recordedAt: date,
          },
        });
      }
    }
  }

  // Deduplicate events with identical descriptions and timing
  const seen = new Set();
  const dedupedEvents = events.filter((e) => {
    const key = `${e.event}|${e.occurredAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort chronological events with known dates ascending;
  // Preserve relative/approximate events at the end (or interspersed deterministically)
  const knownDated = dedupedEvents
    .filter((e) => e.sortDate !== null)
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  const approximate = dedupedEvents.filter((e) => e.sortDate === null);

  return [...knownDated, ...approximate];
};

/**
 * Deterministic report synthesis engine.
 * Assembles all 12 clinical intake report sections from verified records.
 */
export const synthesizeMedicalReportData = ({
  conversation,
  caseDoc,
  messages = [],
  documents = [],
  patientUser = null,
}) => {
  // 1. Evaluate completeness
  const completeness = evaluateCaseCompleteness(caseDoc);

  // Status: 'ready' if case meets minimum clinical review criteria; 'draft' otherwise
  const reportStatus = completeness.canSubmitForReview ? 'ready' : 'draft';

  // 2. Build Timeline
  const medicalTimeline = buildMedicalTimeline(caseDoc, messages, documents);

  // 3. Document Findings map
  const docMap = new Map();
  for (const d of documents) {
    docMap.set(d._id.toString(), d.originalName);
  }

  const findings = (caseDoc.reportFindings || []).map((rf) => ({
    id: rf._id ? rf._id.toString() : null,
    title: rf.title,
    finding: rf.finding,
    documentId: rf.documentId ? rf.documentId.toString() : null,
    documentName: rf.documentId ? docMap.get(rf.documentId.toString()) || 'Uploaded Document' : 'Document Finding',
    source: rf.source || null,
  }));

  const documentList = (documents || []).map((d) => ({
    documentId: d._id.toString(),
    originalName: d.originalName,
    status: d.status,
    pageCount: d.pageCount || 1,
    uploadedAt: d.createdAt,
  }));

  // 4. Medications synthesis (preserving unknown vs none)
  const medItems = (caseDoc.medications || []).map((m) => {
    const missing = [];
    if (!m.dosage) missing.push('dosage');
    if (!m.frequency) missing.push('frequency');
    return {
      id: m._id ? m._id.toString() : null,
      name: m.name,
      dosage: m.dosage || null,
      frequency: m.frequency || null,
      status: m.status || 'unspecified',
      source: m.source || null,
      missingDetails: missing,
    };
  });

  let medicationStatus = 'unrecorded_or_unknown';
  if (medItems.length > 0) {
    medicationStatus = 'recorded';
  }

  // 5. Allergies synthesis (preserving unknown vs none)
  const allergyItems = (caseDoc.allergies || []).map((a) => ({
    id: a._id ? a._id.toString() : null,
    substance: a.substance,
    reaction: a.reaction || null,
    severity: a.severity || 'unspecified',
    source: a.source || null,
  }));

  let allergyStatus = 'unrecorded_or_unknown';
  if (allergyItems.length > 0) {
    allergyStatus = 'recorded';
  }

  // 6. Symptoms synthesis
  const symptomsList = (caseDoc.symptoms || []).map((s) => ({
    id: s._id ? s._id.toString() : null,
    name: s.name,
    severity: s.severity || 'unspecified',
    location: s.location || null,
    onset: s.onset || null,
    duration: s.duration || null,
    status: s.status || 'unspecified',
    associatedSymptoms: (caseDoc.associatedSymptoms || []).map((as) => as.name || as),
    source: s.source || null,
  }));

  // 7. Medical History synthesis
  const historyList = (caseDoc.relevantMedicalHistory || []).map((h) => ({
    id: h._id ? h._id.toString() : null,
    condition: h.condition,
    diagnosedApprox: h.diagnosedApprox || null,
    status: h.status || 'unspecified',
    source: h.source || null,
  }));

  // 8. Vitals synthesis
  const vitalsList = (caseDoc.vitals || []).map((v) => ({
    id: v._id ? v._id.toString() : null,
    bloodPressure: v.bloodPressure || null,
    heartRate: v.heartRate || null,
    temperature: v.temperature || null,
    oxygenSaturation: v.oxygenSaturation || null,
    respiratoryRate: v.respiratoryRate || null,
    recordedAt: v.recordedAt || null,
    source: v.source || null,
  }));

  // 9. Discrepancies synthesis (preserving dual provenance)
  const discrepanciesList = (caseDoc.discrepancies || []).map((d) => ({
    id: d._id ? d._id.toString() : null,
    field: d.field,
    previousValue: d.previousValue || null,
    previousSource: d.previousSource || null,
    newValue: d.newValue,
    source: d.source || null,
    recordedAt: d.recordedAt || null,
  }));

  // 10. Missing and incomplete information
  const followUpSummaries = (caseDoc.followUpQuestions || []).map((fq) => ({
    questionKey: fq.questionKey,
    targetField: fq.targetField,
    category: fq.category || 'required',
    questionText: fq.questionText,
    status: fq.status || 'asked',
    answerText: fq.answerText || null,
    askedAt: fq.askedAt || null,
    answeredAt: fq.answeredAt || null,
  }));

  // 11. Source References collection
  const messageRefs = (messages || [])
    .filter((m) => m && m.content)
    .map((m) => ({
      messageId: m._id.toString(),
      role: m.role || 'user',
      snippet: m.content.length > 120 ? `${m.content.slice(0, 117)}...` : m.content,
      createdAt: m.createdAt,
      inputMode: m.inputMode || 'text',
    }));

  const docRefs = (documents || []).map((d) => ({
    documentId: d._id.toString(),
    filename: d.originalName,
    uploadedAt: d.createdAt,
    pageCount: d.pageCount || 1,
  }));

  // Summary overview text (deterministic clinical summary)
  const chief = caseDoc.chiefComplaint?.text;
  let summaryText = chief
    ? `Clinical intake report for chief complaint: "${chief}".`
    : 'Clinical intake consultation report.';
  if (symptomsList.length > 0) {
    summaryText += ` Documented symptoms: ${symptomsList.map((s) => s.name).join(', ')}.`;
  }
  if (reportStatus === 'draft') {
    summaryText += ` Intake is currently in DRAFT status (${completeness.completionPercentage}% completeness). Further clinical clarification is recommended.`;
  } else {
    summaryText += ` Intake meets initial review criteria (${completeness.completionPercentage}% completeness). Ready for clinician evaluation.`;
  }

  return {
    reportStatus,
    completenessSnapshot: {
      isComplete: completeness.isComplete,
      canSubmitForReview: completeness.canSubmitForReview,
      completionPercentage: completeness.completionPercentage,
      missingRequiredCount: (completeness.missingRequiredInformation || []).length,
      missingOptionalCount: (completeness.missingOptionalInformation || []).length,
      incompleteFieldsCount: (completeness.incompleteFields || []).length,
      discrepancyCount: completeness.discrepancyCount || 0,
      evaluatedAt: new Date(),
    },
    sections: {
      consultationOverview: {
        status: reportStatus,
        caseStatus: caseDoc.status || 'in_progress',
        consultationReference: conversation._id.toString(),
        patientId: caseDoc.patientId.toString(),
        patientName: patientUser?.name || null,
        generatedAt: new Date(),
        summaryText,
      },
      chiefComplaint: {
        text: caseDoc.chiefComplaint?.text || null,
        source: caseDoc.chiefComplaint?.source || null,
        recordedAt: caseDoc.chiefComplaint?.source?.recordedAt || caseDoc.createdAt,
      },
      symptoms: symptomsList,
      relevantMedicalHistory: historyList,
      medications: {
        status: medicationStatus,
        items: medItems,
      },
      allergies: {
        status: allergyStatus,
        items: allergyItems,
      },
      vitals: vitalsList,
      medicalDocumentsAndFindings: {
        documents: documentList,
        findings,
      },
      medicalTimeline,
      discrepancies: discrepanciesList,
      missingAndIncompleteInformation: {
        missingRequired: (completeness.missingRequiredInformation || []).map((mr) => ({
          field: mr.field,
          label: mr.label,
          reason: mr.reason,
        })),
        missingOptional: (completeness.missingOptionalInformation || []).map((mo) => ({
          field: mo.field,
          label: mo.label,
          reason: mo.reason,
        })),
        incompleteFields: (completeness.incompleteFields || []).map((inc) => ({
          field: inc.field,
          label: inc.label,
          reason: inc.reason,
        })),
        followUpQuestions: followUpSummaries,
      },
      sourceReferences: {
        messages: messageRefs,
        documents: docRefs,
      },
    },
  };
};

/**
 * Generate or regenerate a versioned Medical Report for an authorized consultation.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>} Created MedicalReport document
 */
export const generateOrRegenerateReport = async ({ conversationId, userId, userRole }) => {
  // 1. Verify conversation exists and enforce authorization
  const conversation = await conversationRepo.findConversationById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT' && conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify associated Case exists
  const caseDoc = await caseRepo.findCaseByConversationId(conversationId);
  if (!caseDoc) {
    const error = new Error('Structured medical case not found for this consultation');
    error.statusCode = 404;
    throw error;
  }

  // 3. Fetch conversation messages
  const messages = await conversationRepo.findMessagesByConversationId(conversationId);

  // 4. Fetch committed documents for this conversation
  const documents = await documentRepo.findDocumentsByConversationId(conversationId);

  // 5. Synthesize report data (throws on error; preserves existing report if failure occurs)
  const reportPayload = synthesizeMedicalReportData({
    conversation,
    caseDoc,
    messages,
    documents,
  });

  // 6. Calculate version number atomically
  const latestReport = await MedicalReport.findOne({ conversationId, isLatest: true }).sort({ version: -1 });
  const newVersion = latestReport ? latestReport.version + 1 : 1;

  // Set version in consultationOverview section
  reportPayload.sections.consultationOverview.version = newVersion;

  // 7. Atomic update: Mark any previous reports for this conversation as isLatest = false
  if (latestReport) {
    await MedicalReport.updateMany(
      { conversationId, isLatest: true },
      { $set: { isLatest: false } }
    );
  }

  // 8. Create new report version
  const newReport = await MedicalReport.create({
    conversationId: conversation._id,
    caseId: caseDoc._id,
    patientId: conversation.userId,
    version: newVersion,
    status: reportPayload.reportStatus,
    isLatest: true,
    generatedAt: new Date(),
    sourceLastUpdatedAt: caseDoc.updatedAt || new Date(),
    completenessSnapshot: reportPayload.completenessSnapshot,
    sections: reportPayload.sections,
  });

  return newReport;
};

/**
 * Retrieve the latest Medical Report for a conversation.
 * If no report exists yet, initializes and generates version 1.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>}
 */
export const getLatestReportByConversation = async ({ conversationId, userId, userRole }) => {
  // 1. Verify conversation authorization
  const conversation = await conversationRepo.findConversationById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT' && conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Find latest report
  const report = await MedicalReport.findOne({ conversationId, isLatest: true });
  if (report) {
    return report;
  }

  // 3. If no report has been generated yet, auto-generate version 1 if Case exists
  const caseDoc = await caseRepo.findCaseByConversationId(conversationId);
  if (!caseDoc) {
    const error = new Error('Medical report not found');
    error.statusCode = 404;
    throw error;
  }

  return generateOrRegenerateReport({ conversationId, userId, userRole });
};

/**
 * Retrieve the latest Medical Report for a Case ID.
 *
 * @param {Object} params
 * @param {string} params.caseId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>}
 */
export const getLatestReportByCaseId = async ({ caseId, userId, userRole }) => {
  const caseDoc = await caseRepo.findCaseById(caseId);
  if (!caseDoc) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT' && caseDoc.patientId.toString() !== userId.toString()) {
    const error = new Error('Case not found');
    error.statusCode = 404;
    throw error;
  }

  const report = await MedicalReport.findOne({ caseId: caseDoc._id, isLatest: true });
  if (report) {
    return report;
  }

  // If no report exists yet, generate from the case's conversation
  return generateOrRegenerateReport({
    conversationId: caseDoc.conversationId.toString(),
    userId,
    userRole,
  });
};

/**
 * Retrieve a specific version of a Medical Report.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {number} params.version
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {Promise<Object>}
 */
export const getReportByVersion = async ({ conversationId, version, userId, userRole }) => {
  const conversation = await conversationRepo.findConversationById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'PATIENT' && conversation.userId.toString() !== userId.toString()) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const report = await MedicalReport.findOne({ conversationId, version: Number(version) });
  if (!report) {
    const error = new Error(`Medical report version ${version} not found`);
    error.statusCode = 404;
    throw error;
  }

  return report;
};
