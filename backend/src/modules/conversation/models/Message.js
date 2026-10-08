import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'assistant'],
        message: '{VALUE} is not a valid message role',
      },
      required: [true, 'Message role is required'],
    },
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: [10000, 'Message content cannot exceed 10000 characters'],
      validate: {
        validator: function (v) {
          const hasContent = typeof v === 'string' && v.trim().length > 0;
          const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;
          return hasContent || hasAttachments;
        },
        message: 'Message must contain text content or at least one attachment',
      },
    },
    attachments: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
          required: true,
        },
        originalName: {
          type: String,
          required: true,
          trim: true,
        },
        fileSize: {
          type: Number,
          default: 0,
        },
      },
    ],
    inputMode: {
      type: String,
      enum: {
        values: ['text', 'voice'],
        message: '{VALUE} is not a supported input mode',
      },
      default: 'text',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'failed'],
        message: '{VALUE} is not a supported message status',
      },
      default: 'completed',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Messages are immutable records with explicit createdAt
  }
);

// Compound index for chronological message retrieval per conversation
messageSchema.index({ conversationId: 1, createdAt: 1 });

// Clean JSON serialization
messageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.conversationId = ret.conversationId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
