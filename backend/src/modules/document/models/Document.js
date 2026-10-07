import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
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
      required: [true, 'Conversation ID is required'],
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
        values: ['uploaded', 'processing', 'failed', 'deleted'],
        message: '{VALUE} is not a valid document status',
      },
      default: 'uploaded',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient conversation and user document lookups
documentSchema.index({ conversationId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, createdAt: -1 });

// Clean JSON serialization — strictly excludes internal filesystem paths and keys
documentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    ret.conversationId = ret.conversationId.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.storagePath; // Security: Never expose internal server filesystem paths
    delete ret.storageKey;  // Keep internal disk storage key concealed from client
    return ret;
  },
});

const Document = mongoose.model('Document', documentSchema);

export default Document;
