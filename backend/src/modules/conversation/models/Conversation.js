import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'New Consultation',
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'archived'],
        message: '{VALUE} is not a valid conversation status',
      },
      default: 'active',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user conversation querying ordered by recent activity
conversationSchema.index({ userId: 1, lastMessageAt: -1 });

// Clean JSON serialization
conversationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
