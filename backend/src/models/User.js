import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  plan: { type: String, enum: ['free', 'pro', 'institution'], default: 'free' },
  trial: {
    startedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    scanLimit: { type: Number, default: 3 }
  },
  subscription: {
    status: { type: String, enum: ['trialing', 'active', 'expired', 'cancelled'], default: 'trialing' },
    provider: String,
    paymentId: String,
    orderId: String,
    currentPeriodEnd: Date
  },
  usage: {
    scans: { type: Number, default: 0 },
    aiActions: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
