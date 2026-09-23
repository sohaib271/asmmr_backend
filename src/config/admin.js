import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export async function ensureAdminAccount() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return;
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    let changed = false;
    if (existing.role !== 'admin') { existing.role = 'admin'; changed = true; }
    if (!await bcrypt.compare(password, existing.passwordHash)) {
      existing.passwordHash = await bcrypt.hash(password, 12);
      changed = true;
    }
    const name = String(process.env.ADMIN_NAME || '').trim();
    if (name && existing.name !== name) { existing.name = name; changed = true; }
    if (changed) { await existing.save(); console.log('Administrator account synchronized'); }
    return;
  }
  await User.create({ name: process.env.ADMIN_NAME || 'ASMMR Administrator', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  console.log('Administrator account created');
}
