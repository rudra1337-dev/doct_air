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
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message content cannot be empty'],
      maxlength: [10000, 'Message content cannot exceed 10000 characters'],
    },
    inputMode: {
      type: String,
      enum: {
        values: ['text'],
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
