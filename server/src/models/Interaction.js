import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    tripId: { type: String, default: null, index: true },
    venueId: { type: String, required: true, index: true },
    destination: { type: String, default: '' },
    category: { type: String, default: 'attraction' },
    interactionType: {
      type: String,
      enum: ['like', 'save', 'pin', 'view', 'vote_up', 'vote_down', 'book', 'co_travel', 'comment'],
      default: 'like',
    },
    rating: { type: Number, min: 1, max: 5 },
    weight: { type: Number, default: 1 },
    coTraveledWith: { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

interactionSchema.index({ userId: 1, venueId: 1 });
interactionSchema.index({ userId: 1, interactionType: 1 });
interactionSchema.index({ tripId: 1, timestamp: -1 });

export const Interaction =
  mongoose.models.Interaction || mongoose.model('Interaction', interactionSchema);

