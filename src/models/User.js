import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxLength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'reviewer', 'admin'], default: 'user' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
