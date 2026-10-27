import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' },
    bloodGroup: { type: String, default: '' },
    medicalNotes: { type: String, default: '' },
  },
  { _id: false }
);

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    role: { type: String, default: 'Planner' },
    avatar: { type: String, default: '' },
    color: { type: String, default: '#FF6B45' },
    phone: { type: String, default: '' },
    upiId: { type: String, default: '' },
    upiQrCode: { type: String, default: null },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    googleId: { type: String, default: null, sparse: true },
    refreshTokens: [refreshTokenSchema],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

