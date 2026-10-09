import mongoose from 'mongoose';

/**
 * Reusable sub-schema for source attribution.
 * Guarantees every clinical data point can be traced to a patient description,
 * uploaded medical document, or clinician record without fabricating confidence scores.
 */
const sourceAttributionSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: {
        values: ['patient_report', 'document', 'clinician'],
        message: '{VALUE} is not a supported source type',
      },
      required: [true, 'Source type is required'],
      default: 'patient_report',
    },
    sourceId: {
      type: String,
      trim: true,
      maxlength: [100, 'Source reference ID cannot exceed 100 characters'],
      default: null,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence cannot be less than 0'],
      max: [1, 'Confidence cannot exceed 1'],
      default: null, // Nullable — never fabricated
    },
  },
  { _id: false }
);

/**
 * Structured Symptom Item sub-schema
 */
const symptomItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Symptom name is required'],
      trim: true,
      maxlength: [200, 'Symptom name cannot exceed 200 characters'],
    },
    severity: {
      type: String,
      enum: {
        values: ['mild', 'moderate', 'severe', 'unspecified'],
        message: '{VALUE} is not a valid symptom severity',
      },
      default: 'unspecified',
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Symptom location cannot exceed 200 characters'],
      default: null,
    },
    onset: {
      type: String,
      trim: true,
      maxlength: [200, 'Symptom onset cannot exceed 200 characters'],
      default: null,
    },
    duration: {
      type: String,
      trim: true,
      maxlength: [200, 'Symptom duration cannot exceed 200 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'resolved', 'improving', 'worsening', 'unspecified'],
        message: '{VALUE} is not a valid symptom status',
      },
      default: 'unspecified',
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Relevant Medical History Item sub-schema
 */
const medicalHistoryItemSchema = new mongoose.Schema(
  {
    condition: {
      type: String,
      required: [true, 'Medical condition name is required'],
      trim: true,
      maxlength: [255, 'Medical condition cannot exceed 255 characters'],
    },
    diagnosedApprox: {
      type: String,
      trim: true,
      maxlength: [100, 'Diagnosis timing cannot exceed 100 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'resolved', 'historical', 'unspecified'],
        message: '{VALUE} is not a valid condition status',
      },
      default: 'unspecified',
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Medication Item sub-schema
 */
const medicationItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
      maxlength: [200, 'Medication name cannot exceed 200 characters'],
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: [100, 'Dosage cannot exceed 100 characters'],
      default: null,
    },
    frequency: {
      type: String,
      trim: true,
      maxlength: [100, 'Frequency cannot exceed 100 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['current', 'discontinued', 'as_needed', 'unspecified'],
        message: '{VALUE} is not a valid medication status',
      },
      default: 'unspecified',
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Allergy Item sub-schema
 */
const allergyItemSchema = new mongoose.Schema(
  {
    substance: {
      type: String,
      required: [true, 'Allergen substance is required'],
      trim: true,
      maxlength: [200, 'Allergen substance cannot exceed 200 characters'],
    },
    reaction: {
      type: String,
      trim: true,
      maxlength: [200, 'Allergic reaction cannot exceed 200 characters'],
      default: null,
    },
    severity: {
      type: String,
      enum: {
        values: ['mild', 'moderate', 'severe', 'unspecified'],
        message: '{VALUE} is not a valid allergy severity',
      },
      default: 'unspecified',
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Vital Reading sub-schema
 */
const vitalReadingSchema = new mongoose.Schema(
  {
    bloodPressure: {
      type: String,
      trim: true,
      maxlength: [50, 'Blood pressure cannot exceed 50 characters'],
      default: null,
    },
    heartRate: {
      type: String,
      trim: true,
      maxlength: [50, 'Heart rate cannot exceed 50 characters'],
      default: null,
    },
    temperature: {
      type: String,
      trim: true,
      maxlength: [50, 'Temperature cannot exceed 50 characters'],
      default: null,
    },
    oxygenSaturation: {
      type: String,
      trim: true,
      maxlength: [50, 'Oxygen saturation cannot exceed 50 characters'],
      default: null,
    },
    respiratoryRate: {
      type: String,
      trim: true,
      maxlength: [50, 'Respiratory rate cannot exceed 50 characters'],
      default: null,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Report Finding sub-schema (derived from attached medical reports/PDFs)
 */
const reportFindingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Finding title is required'],
      trim: true,
      maxlength: [200, 'Finding title cannot exceed 200 characters'],
    },
    finding: {
      type: String,
      required: [true, 'Finding detail is required'],
      trim: true,
      maxlength: [2000, 'Finding detail cannot exceed 2000 characters'],
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Timeline Event sub-schema
 */
const timelineEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: [true, 'Timeline event description is required'],
      trim: true,
      maxlength: [500, 'Timeline event cannot exceed 500 characters'],
    },
    occurredAt: {
      type: String,
      trim: true,
      maxlength: [100, 'Timeline event time cannot exceed 100 characters'],
      default: null,
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
  },
  { _id: true }
);

/**
 * Missing / Uncollected Information sub-schema
 */
const missingInfoItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Missing information category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Missing information description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    importance: {
      type: String,
      enum: {
        values: ['routine', 'important', 'critical', 'unspecified'],
        message: '{VALUE} is not a valid importance level',
      },
      default: 'unspecified',
    },
  },
  { _id: true }
);

/**
 * Discrepancy / Competing Claim sub-schema
 * Preserves conflicting statements (e.g. symptom onset or severity revisions)
 * without clinically deciding which statement is correct.
 */
const discrepancyItemSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: [true, 'Discrepancy field is required'],
      trim: true,
      maxlength: [100, 'Field name cannot exceed 100 characters'],
    },
    previousValue: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Previous value cannot exceed 500 characters'],
    },
    previousSource: {
      type: sourceAttributionSchema,
      default: null,
    },
    newValue: {
      type: String,
      required: [true, 'New value is required'],
      trim: true,
      maxlength: [500, 'New value cannot exceed 500 characters'],
    },
    source: {
      type: sourceAttributionSchema,
      default: null,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Primary Medical Case Schema
 *
 * Stores structured, evolving clinical information gathered during an existing conversation.
 * Represents an objective intake summary with full source attribution.
 * Does NOT contain triage scores, diagnoses, or prescriptions.
 */
const caseSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      unique: true, // Database-level uniqueness: strictly one primary case per conversation
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['in_progress', 'ready_for_review', 'reviewed'],
        message: '{VALUE} is not a valid case status',
      },
      default: 'in_progress',
      index: true,
    },

    // ── Structured Clinical Intake Fields ──────────────────────────────────
    chiefComplaint: {
      text: {
        type: String,
        trim: true,
        maxlength: [500, 'Chief complaint cannot exceed 500 characters'],
        default: null,
      },
      source: {
        type: sourceAttributionSchema,
        default: null,
      },
    },

    symptoms: {
      type: [symptomItemSchema],
      default: [],
    },

    onset: {
      value: {
        type: String,
        trim: true,
        maxlength: [200, 'Onset description cannot exceed 200 characters'],
        default: null,
      },
      source: {
        type: sourceAttributionSchema,
        default: null,
      },
    },

    duration: {
      value: {
        type: String,
        trim: true,
        maxlength: [200, 'Duration description cannot exceed 200 characters'],
        default: null,
      },
      source: {
        type: sourceAttributionSchema,
        default: null,
      },
    },

    severity: {
      value: {
        type: String,
        trim: true,
        maxlength: [100, 'Severity description cannot exceed 100 characters'],
        default: null,
      },
      source: {
        type: sourceAttributionSchema,
        default: null,
      },
    },

    symptomLocation: {
      value: {
        type: String,
        trim: true,
        maxlength: [200, 'Symptom location cannot exceed 200 characters'],
        default: null,
      },
      source: {
        type: sourceAttributionSchema,
        default: null,
      },
    },

    associatedSymptoms: {
      type: [
        new mongoose.Schema(
          {
            name: {
              type: String,
              required: [true, 'Associated symptom name is required'],
              trim: true,
              maxlength: [200, 'Associated symptom name cannot exceed 200 characters'],
            },
            source: {
              type: sourceAttributionSchema,
              default: null,
            },
          },
          { _id: true }
        ),
      ],
      default: [],
    },

    relevantMedicalHistory: {
      type: [medicalHistoryItemSchema],
      default: [],
    },

    medications: {
      type: [medicationItemSchema],
      default: [],
    },

    allergies: {
      type: [allergyItemSchema],
      default: [],
    },

    vitals: {
      type: [vitalReadingSchema],
      default: [],
    },

    reportFindings: {
      type: [reportFindingSchema],
      default: [],
    },

    timeline: {
      type: [timelineEventSchema],
      default: [],
    },

    missingInformation: {
      type: [missingInfoItemSchema],
      default: [],
    },

    discrepancies: {
      type: [discrepancyItemSchema],
      default: [],
    },

    processedMessageIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Message',
        },
      ],
      default: [],
      index: true,
    },

    processedDocumentIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      ],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// Compound index for querying cases by patient ordered by recent update
caseSchema.index({ patientId: 1, updatedAt: -1 });

// Clean JSON serialization consistent with project standards
caseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.patientId = ret.patientId.toString();
    ret.conversationId = ret.conversationId.toString();
    if (Array.isArray(ret.processedMessageIds)) {
      ret.processedMessageIds = ret.processedMessageIds.map((id) =>
        id ? id.toString() : id
      );
    }
    if (Array.isArray(ret.processedDocumentIds)) {
      ret.processedDocumentIds = ret.processedDocumentIds.map((id) =>
        id ? id.toString() : id
      );
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Case = mongoose.model('Case', caseSchema);

export default Case;
