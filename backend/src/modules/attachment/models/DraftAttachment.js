import mongoose from 'mongoose';
import { TEMP_ATTACHMENT_TTL_MS } from '../../../config/env.js';

const draftAttachmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      default: 'application/pdf',
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0'],
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      unique: true,
      index: true,
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['uploaded', 'committed', 'deleted', 'expired'],
        message: '{VALUE} is not a valid draft attachment status',
      },
      default: 'uploaded',
      index: true,
    },
    committedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + TEMP_ATTACHMENT_TTL_MS),
      index: { expires: 0 }, // MongoDB TTL index for automatic expiration
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user querying
draftAttachmentSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Clean JSON serialization — strictly excludes internal filesystem paths
draftAttachmentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    if (ret.conversationId) {
      ret.conversationId = ret.conversationId.toString();
    }
    if (ret.committedDocumentId) {
      ret.committedDocumentId = ret.committedDocumentId.toString();
    }
    delete ret._id;
    delete ret.__v;
    delete ret.storagePath;
    delete ret.storageKey;
    return ret;
  },
});

const DraftAttachment = mongoose.model('DraftAttachment', draftAttachmentSchema);

export default DraftAttachment;
