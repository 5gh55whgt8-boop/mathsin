import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 140 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  adminReply: { type: String, trim: true, maxlength: 4000 }
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
