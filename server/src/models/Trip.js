import mongoose from 'mongoose';
import { itineraryItemSchema } from './ItineraryItem.js';

const expenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, default: 'other' },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: String, required: true },
    splitMode: { type: String, enum: ['equal', 'weighted'], default: 'equal' },
    splitWith: { type: [String], default: [] },
    splits: { type: Map, of: Number, default: () => new Map() },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    type: { type: String, default: 'actual' },
    receipt: { type: String, default: null },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    role: {
      type: String,
      enum: ['Leader', 'Planner', 'Viewer', 'Admin', 'Owner', 'Editor'],
      default: 'Planner',
    },
    avatar: { type: String, default: '' },
    color: { type: String, default: '#FF6B45' },
    upiId: { type: String, default: '' },
    upiQrCode: { type: String, default: null },
    status: { type: String, default: 'offline' },
    joinedAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    dateFormatted: { type: String, default: '' },
    theme: { type: String, default: '' },
    items: [itineraryItemSchema],
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    destination: { type: String, required: true, index: true },
    coverImage: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    daysCount: { type: Number, default: 3 },
    leaderUserId: { type: String, index: true },
    isRoomLocked: { type: Boolean, default: false },
    inviteCode: { type: String, required: true, unique: true, index: true },
    participantIds: { type: [String], default: [] },
    budget: {
      totalTarget: { type: Number, default: 30000 },
      currency: { type: String, default: 'INR' },
      splitMode: { type: String, enum: ['equal', 'weighted'], default: 'equal' },
      categories: {
        accommodation: { type: Number, default: 0 },
        food: { type: Number, default: 0 },
        transport: { type: Number, default: 0 },
        activities: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
      expenses: [expenseSchema],
    },
    members: [memberSchema],
    days: [daySchema],
  },
  {
    timestamps: true,
  }
);

tripSchema.index({ 'members.id': 1 });
tripSchema.index({ destination: 1, createdAt: -1 });

export const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);

