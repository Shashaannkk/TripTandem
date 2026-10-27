import mongoose from 'mongoose';

const reactionUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

export const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    tripId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    senderAvatar: { type: String, default: '' },
    text: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    reactions: {
      type: Map,
      of: [reactionUserSchema],
      default: () => new Map(),
    },
    isSystem: { type: Boolean, default: false },
    isAi: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ tripId: 1, createdAt: 1 });

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

