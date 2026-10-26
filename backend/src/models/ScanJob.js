import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  source: mongoose.Schema.Types.ObjectId,
  originalName: String,
  hash: String,
  status: { type: String, enum: ['queued', 'processing', 'waiting', 'completed', 'failed'], default: 'queued' },
  active: { type: Boolean, default: true },
  total: { type: Number, default: 0 },
  completed: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  attempts: { type: Number, default: 0 },
  nextAttempt: { type: Date, default: Date.now },
  leaseUntil: Date,
  leaseToken: String,
  errorCode: String,
  message: String,
  scan: mongoose.Schema.Types.ObjectId,
  expiresAt: Date
}, { timestamps: true });
// One outstanding scan per account bounds storage, quota races and duplicate taps.
schema.index({ user: 1 }, { unique: true, partialFilterExpression: { active: true } });
schema.index({ status: 1, nextAttempt: 1, leaseUntil: 1 });
export default mongoose.model('ScanJob', schema);
