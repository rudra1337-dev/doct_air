import mongoose from 'mongoose';

/**
 * Reusable sub-schema for source attribution in Medical Reports.
 */
const reportSourceAttributionSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: {
        values: ['patient_report', 'document', 'clinician'],
        message: '{VALUE} is not a supported source type',
      },
      required: true,
      default: 'patient_report',
    },
    sourceId: {
      type: String,
      trim: true,
      default: null,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    confidence: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Medical Report Schema
 *
 * Persisted structured snapshot of a medical intake report generated from
 * one specific patient conversation and structured Case record.
 *
 * Non-diagnostic intake summary with full source attribution.
 * Does NOT contain triage scores, priority rankings, or diagnoses.
 */
const medicalReportSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: [true, 'Case ID is required'],
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'ready'],
        message: '{VALUE} is not a valid report status',
      },
      default: 'draft',
      index: true,
    },
    isLatest: {
      type: Boolean,
      default: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    sourceLastUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    // Snapshot of case completeness at report generation time
    completenessSnapshot: {
      isComplete: { type: Boolean, default: false },
      canSubmitForReview: { type: Boolean, default: false },
      completionPercentage: { type: Number, default: 0 },
      missingRequiredCount: { type: Number, default: 0 },
      missingOptionalCount: { type: Number, default: 0 },
      incompleteFieldsCount: { type: Number, default: 0 },
      discrepancyCount: { type: Number, default: 0 },
      evaluatedAt: { type: Date, default: Date.now },
    },

    // 12 Required Structured Sections
    sections: {
      // 1. Consultation Overview
      consultationOverview: {
        status: { type: String, enum: ['draft', 'ready'], default: 'draft' },
        caseStatus: { type: String, default: 'in_progress' },
        consultationReference: { type: String, default: null },
        patientId: { type: String, default: null },
        patientName: { type: String, default: null },
        generatedAt: { type: Date, default: Date.now },
        version: { type: Number, default: 1 },
        summaryText: { type: String, default: '' },
      },

      // 2. Chief Complaint
      chiefComplaint: {
        text: { type: String, default: null },
        source: { type: reportSourceAttributionSchema, default: null },
        recordedAt: { type: Date, default: null },
      },

      // 3. Symptoms
      symptoms: [
        {
          id: { type: String, default: null },
          name: { type: String, required: true },
          severity: { type: String, default: 'unspecified' },
          location: { type: String, default: null },
          onset: { type: String, default: null },
          duration: { type: String, default: null },
          status: { type: String, default: 'unspecified' },
          associatedSymptoms: { type: [String], default: [] },
          source: { type: reportSourceAttributionSchema, default: null },
        },
      ],

      // 4. Relevant Medical History
      relevantMedicalHistory: [
        {
          id: { type: String, default: null },
          condition: { type: String, required: true },
          diagnosedApprox: { type: String, default: null },
          status: { type: String, default: 'unspecified' },
          source: { type: reportSourceAttributionSchema, default: null },
        },
      ],

      // 5. Medications
      medications: {
        status: {
          type: String,
          enum: ['recorded', 'unrecorded_or_unknown', 'none_reported'],
          default: 'unrecorded_or_unknown',
        },
        items: [
          {
            id: { type: String, default: null },
            name: { type: String, required: true },
            dosage: { type: String, default: null },
            frequency: { type: String, default: null },
            status: { type: String, default: 'unspecified' },
            source: { type: reportSourceAttributionSchema, default: null },
            missingDetails: { type: [String], default: [] },
          },
        ],
      },

      // 6. Allergies
      allergies: {
        status: {
          type: String,
          enum: ['recorded', 'unrecorded_or_unknown', 'no_known_allergies'],
          default: 'unrecorded_or_unknown',
        },
        items: [
          {
            id: { type: String, default: null },
            substance: { type: String, required: true },
            reaction: { type: String, default: null },
            severity: { type: String, default: 'unspecified' },
            source: { type: reportSourceAttributionSchema, default: null },
          },
        ],
      },

      // 7. Vitals
      vitals: [
        {
          id: { type: String, default: null },
          bloodPressure: { type: String, default: null },
          heartRate: { type: String, default: null },
          temperature: { type: String, default: null },
          oxygenSaturation: { type: String, default: null },
          respiratoryRate: { type: String, default: null },
          recordedAt: { type: Date, default: null },
          source: { type: reportSourceAttributionSchema, default: null },
        },
      ],

      // 8. Medical Documents and Findings
      medicalDocumentsAndFindings: {
        documents: [
          {
            documentId: { type: String, required: true },
            originalName: { type: String, required: true },
            status: { type: String, default: 'processed' },
            pageCount: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: null },
          },
        ],
        findings: [
          {
            id: { type: String, default: null },
            title: { type: String, required: true },
            finding: { type: String, required: true },
            documentId: { type: String, default: null },
            documentName: { type: String, default: null },
            source: { type: reportSourceAttributionSchema, default: null },
          },
        ],
      },

      // 9. Medical Timeline
      medicalTimeline: [
        {
          id: { type: String, default: null },
          event: { type: String, required: true },
          occurredAt: { type: String, default: null },
          isApproximate: { type: Boolean, default: false },
          sortDate: { type: Date, default: null },
          source: { type: reportSourceAttributionSchema, default: null },
        },
      ],

      // 10. Discrepancies
      discrepancies: [
        {
          id: { type: String, default: null },
          field: { type: String, required: true },
          previousValue: { type: String, default: null },
          previousSource: { type: reportSourceAttributionSchema, default: null },
          newValue: { type: String, required: true },
          source: { type: reportSourceAttributionSchema, default: null },
          recordedAt: { type: Date, default: null },
        },
      ],

      // 11. Missing and Incomplete Information
      missingAndIncompleteInformation: {
        missingRequired: [
          {
            field: { type: String, required: true },
            label: { type: String, default: '' },
            reason: { type: String, default: '' },
          },
        ],
        missingOptional: [
          {
            field: { type: String, required: true },
            label: { type: String, default: '' },
            reason: { type: String, default: '' },
          },
        ],
        incompleteFields: [
          {
            field: { type: String, required: true },
            label: { type: String, default: '' },
            reason: { type: String, default: '' },
          },
        ],
        followUpQuestions: [
          {
            questionKey: { type: String, default: '' },
            targetField: { type: String, default: '' },
            category: { type: String, default: 'required' },
            questionText: { type: String, default: '' },
            status: { type: String, default: 'asked' },
            answerText: { type: String, default: null },
            askedAt: { type: Date, default: null },
            answeredAt: { type: Date, default: null },
          },
        ],
      },

      // 12. Source References
      sourceReferences: {
        messages: [
          {
            messageId: { type: String, required: true },
            role: { type: String, default: 'user' },
            snippet: { type: String, default: '' },
            createdAt: { type: Date, default: null },
            inputMode: { type: String, default: 'text' },
          },
        ],
        documents: [
          {
            documentId: { type: String, required: true },
            filename: { type: String, default: '' },
            uploadedAt: { type: Date, default: null },
            pageCount: { type: Number, default: 0 },
          },
        ],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
medicalReportSchema.index({ conversationId: 1, isLatest: 1 });
medicalReportSchema.index({ caseId: 1, isLatest: 1 });
medicalReportSchema.index({ conversationId: 1, version: -1 });

// Clean JSON serialization
medicalReportSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.conversationId = ret.conversationId?.toString();
    ret.caseId = ret.caseId?.toString();
    ret.patientId = ret.patientId?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const MedicalReport = mongoose.model('MedicalReport', medicalReportSchema);

export default MedicalReport;
