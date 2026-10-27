import mongoose from 'mongoose';

export const itineraryItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    tripId: { type: String, index: true },
    dayNumber: { type: Number, required: true },
    timeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: 'afternoon',
    },
    startTime: { type: String, default: '02:00 PM' },
    endTime: { type: String, default: '04:00 PM' },
    duration: { type: String, default: '2h' },
    title: { type: String, required: true },
    venueId: { type: String, default: null },
    venueName: { type: String, default: '' },
    category: { type: String, default: 'experience' },
    image: { type: String, default: '' },
    costPerPerson: { type: Number, default: 0 },
    location: { type: String, default: '' },
    source: { type: String, default: 'user' },
    status: {
      type: String,
      enum: ['drafting', 'voting', 'locked'],
      default: 'drafting',
    },
    lifecycleStage: {
      type: String,
      enum: ['drafting', 'voting', 'locked'],
      default: 'drafting',
    },
    positionVersion: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    votes: {
      up: { type: [String], default: [] },
      down: { type: [String], default: [] },
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

itineraryItemSchema.index({ tripId: 1, dayNumber: 1 });
itineraryItemSchema.index({ tripId: 1, id: 1 });

export const ItineraryItem = mongoose.models.ItineraryItem || mongoose.model('ItineraryItem', itineraryItemSchema);

