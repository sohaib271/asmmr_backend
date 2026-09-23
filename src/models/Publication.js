import mongoose from 'mongoose';

const publicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxLength: 300 },
  type: { type: String, enum: ['journal', 'research-paper'], required: true },
  abstract: { type: String, required: true, trim: true, maxLength: 3000 },
  manuscriptUrl: { type: String, trim: true, maxLength: 1000 },
  status: { type: String, enum: ['pending', 'under-review', 'published', 'rejected'], default: 'pending', index: true },
  reviewReason: { type: String, trim: true, maxLength: 1000, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  publishedAt: Date,
}, { timestamps: true });

publicationSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model('Publication', publicationSchema);
