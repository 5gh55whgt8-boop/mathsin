import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  type: { type: String, enum: ['text','equation','table','question','diagram','unknown'], default: 'unknown' },
  text: String,
  latex: String,
  markdown: String,
  confidence: Number
}, { _id: false });

const scanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Untitled scan' },
  sourceType: { type: String, enum: ['image','pdf','document'], default: 'image' },
  mimeType: String,
  originalName: String,
  storedFile: String,
  plainText: { type: String, default: '' },
  latex: { type: String, default: '' },
  markdown: { type: String, default: '' },
  blocks: { type: [blockSchema], default: [] },
  questions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  warnings: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  favorite: { type: Boolean, default: false },
  provider: { type: String, default: 'openai' },
  model: String,
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model('Scan', scanSchema);
