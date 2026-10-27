import mongoose from 'mongoose';

const eventLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        'trip.created',
        'trip.member.joined',
        'trip.member.role_changed',
        'trip.member.removed',
        'itinerary.item.created',
        'itinerary.item.updated',
        'itinerary.item.reordered',
        'itinerary.item.deleted',
        'conflict.flagged',
        'conflict.resolved',
        'ai.question',
        'vote.opened',
        'vote.cast',
        'vote.resolved',
        'budget.expense.created',
        'budget.expense.updated',
        'budget.split_mode_changed',
        'trip.locked',
        'trip.unlocked',
        'trip.leader.transferred',
      ],
    },
    actorId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

eventLogSchema.index({ tripId: 1, type: 1 });
eventLogSchema.index({ tripId: 1, timestamp: -1 });

export const EventLog =
  mongoose.models.EventLog || mongoose.model('EventLog', eventLogSchema);

