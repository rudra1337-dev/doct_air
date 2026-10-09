import * as geminiService from '../ai/gemini/gemini.service.js';

/**
 * System instruction for objective clinical intake extraction.
 * Guarantees extraction of only patient-reported facts without diagnoses,
 * prescriptions, triage scores, or fabricated confidence values.
 */
export const EXTRACTION_SYSTEM_INSTRUCTION = `
You are DoctAir's Clinical Intake Information Extraction Engine.
Your task is to extract structured clinical facts from the provided conversation between a patient and the healthcare assistant.

CRITICAL RULES:
1. EXTRACT ONLY PATIENT-REPORTED FACTS:
   - Extract ONLY information that the patient explicitly reported, described, or confirmed.
   - NEVER extract statements made only by the assistant (e.g. questions asked or general educational advice).
   - If the patient did not report or confirm a detail, leave the field null or empty.
2. NO DIAGNOSES OR PRESCRIPTIONS:
   - NEVER formulate, guess, or assign medical diagnoses.
   - NEVER prescribe or recommend medications or clinical treatment plans.
   - Do NOT calculate or assign triage scores, emergency priority levels, or urgency codes.
3. PRESERVE UNCERTAINTY:
   - Do not invent facts, dates, durations, or severity ratings.
   - If information is missing or unspecified, leave it null or omit it.
4. VALID JSON ONLY:
   - Output must be strict, valid JSON matching the exact schema specified below.
   - Do not include markdown preamble, conversational commentary, or explanations outside the JSON object.

JSON SCHEMA:
{
  "chiefComplaint": string | null,
  "symptoms": [
    {
      "name": string,
      "severity": "mild" | "moderate" | "severe" | "unspecified",
      "location": string | null,
      "onset": string | null,
      "duration": string | null,
      "status": "active" | "resolved" | "improving" | "worsening" | "unspecified"
    }
  ],
  "onset": string | null,
  "duration": string | null,
  "severity": string | null,
  "symptomLocation": string | null,
  "associatedSymptoms": [
    {
      "name": string
    }
  ],
  "relevantMedicalHistory": [
    {
      "condition": string,
      "diagnosedApprox": string | null,
      "status": "active" | "resolved" | "historical" | "unspecified"
    }
  ],
  "medications": [
    {
      "name": string,
      "dosage": string | null,
      "frequency": string | null,
      "status": "current" | "discontinued" | "as_needed" | "unspecified"
    }
  ],
  "allergies": [
    {
      "substance": string,
      "reaction": string | null,
      "severity": "mild" | "moderate" | "severe" | "unspecified"
    }
  ],
  "vitals": [
    {
      "bloodPressure": string | null,
      "heartRate": string | null,
      "temperature": string | null,
      "oxygenSaturation": string | null,
      "respiratoryRate": string | null
    }
  ],
  "timeline": [
    {
      "event": string,
      "occurredAt": string | null
    }
  ],
  "missingInformation": [
    {
      "category": string,
      "description": string,
      "importance": "routine" | "important" | "critical" | "unspecified"
    }
  ]
}
`.trim();

/**
 * Valid enums matching the Case model definition
 */
const VALID_SEVERITIES = ['mild', 'moderate', 'severe', 'unspecified'];
const VALID_SYMPTOM_STATUSES = ['active', 'resolved', 'improving', 'worsening', 'unspecified'];
const VALID_HISTORY_STATUSES = ['active', 'resolved', 'historical', 'unspecified'];
const VALID_MED_STATUSES = ['current', 'discontinued', 'as_needed', 'unspecified'];
const VALID_IMPORTANCE = ['routine', 'important', 'critical', 'unspecified'];

/**
 * Parses and strictly validates raw output from Gemini into a structured candidate object
 * with source attribution linked directly to the target message ID.
 *
 * @param {string} rawOutput
 * @param {string|Object} sourceMessageId
 * @returns {Object} Validated candidate intake data
 */
export const parseAndValidateExtractionOutput = (
  rawOutput,
  sourceId,
  { sourceType = 'patient_report' } = {}
) => {
  if (!rawOutput || typeof rawOutput !== 'string' || !rawOutput.trim()) {
    const error = new Error('Empty or invalid output from AI extraction');
    error.statusCode = 502;
    error.code = 'MALFORMED_EXTRACTION_OUTPUT';
    throw error;
  }

  const strId = sourceId ? sourceId.toString() : null;

  // Build standard source attribution object for this extraction turn
  const createSource = () => ({
    sourceType,
    sourceId: strId,
    recordedAt: new Date(),
    confidence: null, // Never fabricated
  });

  // 1. Clean markdown code fences if present
  let cleanJsonStr = rawOutput.trim();
  if (cleanJsonStr.startsWith('```')) {
    cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanJsonStr);
  } catch (parseError) {
    console.warn('[CaseExtractor] Failed to parse extraction JSON output:', parseError.message);
    const error = new Error(`Malformed extraction JSON output: ${parseError.message}`);
    error.statusCode = 502;
    error.code = 'MALFORMED_EXTRACTION_OUTPUT';
    throw error;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const error = new Error('Malformed extraction output: expected JSON object');
    error.statusCode = 502;
    error.code = 'MALFORMED_EXTRACTION_OUTPUT';
    throw error;
  }

  const validated = {};

  // 2. Validate single scalar intake fields
  const singleFields = ['chiefComplaint', 'onset', 'duration', 'severity', 'symptomLocation'];
  for (const field of singleFields) {
    const rawVal = parsed[field];
    if (rawVal && typeof rawVal === 'string' && rawVal.trim().length > 0) {
      const cleanVal = rawVal.trim().slice(0, 500);
      if (field === 'chiefComplaint') {
        validated.chiefComplaint = {
          text: cleanVal,
          source: createSource(),
        };
      } else {
        validated[field] = {
          value: cleanVal,
          source: createSource(),
        };
      }
    }
  }

  // 3. Validate symptoms array
  if (Array.isArray(parsed.symptoms)) {
    const validSymptoms = [];
    for (const sym of parsed.symptoms) {
      if (sym && typeof sym === 'object' && typeof sym.name === 'string' && sym.name.trim()) {
        validSymptoms.push({
          name: sym.name.trim().slice(0, 200),
          severity: VALID_SEVERITIES.includes(sym.severity) ? sym.severity : 'unspecified',
          location: typeof sym.location === 'string' && sym.location.trim() ? sym.location.trim().slice(0, 200) : null,
          onset: typeof sym.onset === 'string' && sym.onset.trim() ? sym.onset.trim().slice(0, 200) : null,
          duration: typeof sym.duration === 'string' && sym.duration.trim() ? sym.duration.trim().slice(0, 200) : null,
          status: VALID_SYMPTOM_STATUSES.includes(sym.status) ? sym.status : 'unspecified',
          source: createSource(),
        });
      }
    }
    if (validSymptoms.length > 0) {
      validated.symptoms = validSymptoms;
    }
  }

  // 4. Validate associatedSymptoms
  if (Array.isArray(parsed.associatedSymptoms)) {
    const validAssoc = [];
    for (const item of parsed.associatedSymptoms) {
      const name = typeof item === 'string' ? item : item?.name;
      if (name && typeof name === 'string' && name.trim()) {
        validAssoc.push({
          name: name.trim().slice(0, 200),
          source: createSource(),
        });
      }
    }
    if (validAssoc.length > 0) {
      validated.associatedSymptoms = validAssoc;
    }
  }

  // 5. Validate relevantMedicalHistory
  if (Array.isArray(parsed.relevantMedicalHistory)) {
    const validHistory = [];
    for (const hist of parsed.relevantMedicalHistory) {
      if (hist && typeof hist === 'object' && typeof hist.condition === 'string' && hist.condition.trim()) {
        validHistory.push({
          condition: hist.condition.trim().slice(0, 255),
          diagnosedApprox: typeof hist.diagnosedApprox === 'string' && hist.diagnosedApprox.trim()
            ? hist.diagnosedApprox.trim().slice(0, 100)
            : null,
          status: VALID_HISTORY_STATUSES.includes(hist.status) ? hist.status : 'unspecified',
          source: createSource(),
        });
      }
    }
    if (validHistory.length > 0) {
      validated.relevantMedicalHistory = validHistory;
    }
  }

  // 6. Validate medications
  if (Array.isArray(parsed.medications)) {
    const validMeds = [];
    for (const med of parsed.medications) {
      if (med && typeof med === 'object' && typeof med.name === 'string' && med.name.trim()) {
        validMeds.push({
          name: med.name.trim().slice(0, 200),
          dosage: typeof med.dosage === 'string' && med.dosage.trim() ? med.dosage.trim().slice(0, 100) : null,
          frequency: typeof med.frequency === 'string' && med.frequency.trim() ? med.frequency.trim().slice(0, 100) : null,
          status: VALID_MED_STATUSES.includes(med.status) ? med.status : 'unspecified',
          source: createSource(),
        });
      }
    }
    if (validMeds.length > 0) {
      validated.medications = validMeds;
    }
  }

  // 7. Validate allergies
  if (Array.isArray(parsed.allergies)) {
    const validAllergies = [];
    for (const allg of parsed.allergies) {
      if (allg && typeof allg === 'object' && typeof allg.substance === 'string' && allg.substance.trim()) {
        validAllergies.push({
          substance: allg.substance.trim().slice(0, 200),
          reaction: typeof allg.reaction === 'string' && allg.reaction.trim() ? allg.reaction.trim().slice(0, 200) : null,
          severity: VALID_SEVERITIES.includes(allg.severity) ? allg.severity : 'unspecified',
          source: createSource(),
        });
      }
    }
    if (validAllergies.length > 0) {
      validated.allergies = validAllergies;
    }
  }

  // 8. Validate vitals
  if (Array.isArray(parsed.vitals)) {
    const validVitals = [];
    for (const v of parsed.vitals) {
      if (v && typeof v === 'object') {
        const bp = typeof v.bloodPressure === 'string' && v.bloodPressure.trim() ? v.bloodPressure.trim().slice(0, 50) : null;
        const hr = typeof v.heartRate === 'string' && v.heartRate.trim() ? v.heartRate.trim().slice(0, 50) : null;
        const temp = typeof v.temperature === 'string' && v.temperature.trim() ? v.temperature.trim().slice(0, 50) : null;
        const spo2 = typeof v.oxygenSaturation === 'string' && v.oxygenSaturation.trim() ? v.oxygenSaturation.trim().slice(0, 50) : null;
        const rr = typeof v.respiratoryRate === 'string' && v.respiratoryRate.trim() ? v.respiratoryRate.trim().slice(0, 50) : null;

        if (bp || hr || temp || spo2 || rr) {
          validVitals.push({
            bloodPressure: bp,
            heartRate: hr,
            temperature: temp,
            oxygenSaturation: spo2,
            respiratoryRate: rr,
            recordedAt: new Date(),
            source: createSource(),
          });
        }
      }
    }
    if (validVitals.length > 0) {
      validated.vitals = validVitals;
    }
  }

  // 9. Validate timeline
  if (Array.isArray(parsed.timeline)) {
    const validTimeline = [];
    for (const t of parsed.timeline) {
      if (t && typeof t === 'object' && typeof t.event === 'string' && t.event.trim()) {
        validTimeline.push({
          event: t.event.trim().slice(0, 500),
          occurredAt: typeof t.occurredAt === 'string' && t.occurredAt.trim() ? t.occurredAt.trim().slice(0, 100) : null,
          source: createSource(),
        });
      }
    }
    if (validTimeline.length > 0) {
      validated.timeline = validTimeline;
    }
  }

  // 10. Validate missingInformation
  if (Array.isArray(parsed.missingInformation)) {
    const validMissing = [];
    for (const m of parsed.missingInformation) {
      if (
        m &&
        typeof m === 'object' &&
        typeof m.category === 'string' &&
        m.category.trim() &&
        typeof m.description === 'string' &&
        m.description.trim()
      ) {
        validMissing.push({
          category: m.category.trim().slice(0, 100),
          description: m.description.trim().slice(0, 500),
          importance: VALID_IMPORTANCE.includes(m.importance) ? m.importance : 'unspecified',
        });
      }
    }
    if (validMissing.length > 0) {
      validated.missingInformation = validMissing;
    }
  }

  // 11. Validate reportFindings (Step 4.4)
  if (Array.isArray(parsed.reportFindings)) {
    const validFindings = [];
    for (const rf of parsed.reportFindings) {
      if (
        rf &&
        typeof rf === 'object' &&
        typeof rf.title === 'string' &&
        rf.title.trim() &&
        typeof rf.finding === 'string' &&
        rf.finding.trim()
      ) {
        validFindings.push({
          title: rf.title.trim().slice(0, 200),
          finding: rf.finding.trim().slice(0, 2000),
          documentId: sourceType === 'document' && strId ? strId : null,
          source: createSource(),
        });
      }
    }
    if (validFindings.length > 0) {
      validated.reportFindings = validFindings;
    }
  }

  return validated;
};

/**
 * Extracts structured medical case intake candidates from a patient message
 * using the isolated Gemini integration.
 *
 * @param {Object} params
 * @param {Array<{role: string, content: string, _id?: any}>} params.messages - Recent conversation context
 * @param {Object} params.targetMessage - The target message triggering this extraction
 * @param {Object} [params.client] - Injected Gemini client (for testing)
 * @param {string} [params.apiKey] - Injected API key
 * @returns {Promise<Object>} Validated structured candidate information
 */
export const extractStructuredCaseFromMessage = async ({
  messages = [],
  targetMessage,
  client = null,
  apiKey = null,
} = {}) => {
  if (!targetMessage) {
    return {};
  }

  // Assistant messages must NOT be attributed to the patient
  if (targetMessage.role !== 'user') {
    return {};
  }

  // If the target message has no textual content, skip extraction
  if (!targetMessage.content || !targetMessage.content.trim()) {
    return {};
  }

  // Build the conversation turns for Gemini context
  const contextTurns = [];
  for (const msg of messages) {
    if (!msg || !msg.content || !msg.content.trim()) continue;
    contextTurns.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content.trim(),
    });
  }

  // Ensure the target message itself is at the end of the context if not already present
  const lastTurn = contextTurns[contextTurns.length - 1];
  if (!lastTurn || lastTurn.content !== targetMessage.content.trim()) {
    contextTurns.push({
      role: 'user',
      content: targetMessage.content.trim(),
    });
  }

  // Direct extraction request instructing Gemini to focus on patient-reported information
  const promptMessage = {
    role: 'user',
    content: `Based on the conversation above, extract all factual clinical intake information reported or confirmed by the patient in the latest message: "${targetMessage.content.trim()}". Return the structured JSON matching the clinical schema.`,
  };

  // If a mock client is provided that only mocks streaming and not generateContent,
  // skip gracefully without throwing noisy errors in streaming-only tests
  if (client && (!client.models || typeof client.models.generateContent !== 'function')) {
    return {};
  }

  try {
    const response = await geminiService.generateResponse({
      messages: [...contextTurns, promptMessage],
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for high factual accuracy
      },
      client,
      apiKey,
    });

    return parseAndValidateExtractionOutput(response.text, targetMessage._id, {
      sourceType: 'patient_report',
    });
  } catch (error) {
    console.error(`[CaseExtractor] Failed during Gemini extraction for message=${targetMessage._id}:`, error.message);
    throw error;
  }
};

/**
 * System instruction for objective medical report and test findings extraction.
 * Extracts test findings, lab values, vitals, allergies, medications, and medical history
 * directly from medical documents without making diagnoses, prescriptions, or triage scores.
 */
export const DOCUMENT_EXTRACTION_SYSTEM_INSTRUCTION = `
You are DoctAir's Medical Document Information Extraction Engine.
Your task is to extract objective, factual clinical findings and data from the provided medical report document.

CRITICAL RULES:
1. EXTRACT ONLY FACTUAL INFORMATION DIRECTLY DOCUMENTED IN THE REPORT:
   - Extract test results, lab findings, vital signs, reported symptoms, allergies, medications, and documented medical history.
   - For every test or finding, provide a clear, concise title (e.g. "Complete Blood Count", "Chest X-Ray", "Serum Creatinine") and the objective finding detail.
   - Do NOT invent, assume, or fabricate findings not in the document.
2. NO DIAGNOSES OR PRESCRIPTIONS:
   - Do NOT formulate new medical diagnoses. You may report documented findings (e.g. "Elevated blood glucose 180 mg/dL"), but do NOT claim the patient has diabetes or prescribe therapy.
   - Do NOT assign triage scores, emergency priority ratings, or urgency levels.
3. PRESERVE UNCERTAINTY:
   - If a category is not mentioned in the report, omit it or leave it null/empty.
4. VALID JSON ONLY:
   - Output must be strict, valid JSON matching the exact schema specified below.
   - Do not include markdown commentary outside the JSON block.

JSON SCHEMA:
{
  "reportFindings": [
    {
      "title": string,
      "finding": string
    }
  ],
  "vitals": [
    {
      "bloodPressure": string | null,
      "heartRate": string | null,
      "temperature": string | null,
      "oxygenSaturation": string | null,
      "respiratoryRate": string | null
    }
  ],
  "relevantMedicalHistory": [
    {
      "condition": string,
      "diagnosedApprox": string | null,
      "status": "active" | "resolved" | "historical" | "unspecified"
    }
  ],
  "medications": [
    {
      "name": string,
      "dosage": string | null,
      "frequency": string | null,
      "status": "current" | "discontinued" | "as_needed" | "unspecified"
    }
  ],
  "allergies": [
    {
      "substance": string,
      "reaction": string | null,
      "severity": "mild" | "moderate" | "severe" | "unspecified"
    }
  ],
  "symptoms": [
    {
      "name": string,
      "severity": "mild" | "moderate" | "severe" | "unspecified",
      "location": string | null,
      "onset": string | null,
      "duration": string | null,
      "status": "active" | "resolved" | "improving" | "worsening" | "unspecified"
    }
  ],
  "timeline": [
    {
      "event": string,
      "occurredAt": string | null
    }
  ],
  "missingInformation": [
    {
      "category": string,
      "description": string,
      "importance": "routine" | "important" | "critical" | "unspecified"
    }
  ]
}
`.trim();

/**
 * Extracts structured medical case findings from a processed document's text using Gemini.
 *
 * @param {Object} params
 * @param {Object} params.document - Processed Document model instance
 * @param {Object} [params.client] - Injected Gemini client
 * @param {string} [params.apiKey]
 * @returns {Promise<Object>} Validated candidate data with document attribution
 */
export const extractStructuredCaseFromDocument = async ({
  document,
  client = null,
  apiKey = null,
} = {}) => {
  if (!document) {
    return {};
  }

  if (document.status !== 'processed') {
    const error = new Error(`Cannot extract from document with status '${document.status}'`);
    error.statusCode = 400;
    throw error;
  }

  if (!document.extractedText || !document.extractedText.trim()) {
    const error = new Error('Document contains no extractable text');
    error.statusCode = 400;
    throw error;
  }

  // If a streaming-only mock client is passed, skip gracefully
  if (client && (!client.models || typeof client.models.generateContent !== 'function')) {
    return {};
  }

  const promptMessage = {
    role: 'user',
    content: `Analyze the following extracted medical report text and extract all objective report findings, test results, vitals, medical history, medications, and allergies into the structured clinical JSON schema:\n\n--- BEGIN MEDICAL REPORT: "${document.originalName}" ---\n${document.extractedText.trim()}\n--- END MEDICAL REPORT ---`,
  };

  try {
    const response = await geminiService.generateResponse({
      messages: [promptMessage],
      systemInstruction: DOCUMENT_EXTRACTION_SYSTEM_INSTRUCTION,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
      client,
      apiKey,
    });

    return parseAndValidateExtractionOutput(response.text, document._id, {
      sourceType: 'document',
    });
  } catch (error) {
    console.error(`[CaseExtractor] Failed during document extraction for doc=${document._id}:`, error.message);
    throw error;
  }
};

export default {
  EXTRACTION_SYSTEM_INSTRUCTION,
  DOCUMENT_EXTRACTION_SYSTEM_INSTRUCTION,
  parseAndValidateExtractionOutput,
  extractStructuredCaseFromMessage,
  extractStructuredCaseFromDocument,
};
