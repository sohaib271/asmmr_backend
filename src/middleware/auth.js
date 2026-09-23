import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const cookieName = process.env.AUTH_COOKIE_NAME || 'asmmr_session';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me');
    const user = await User.findById(payload.sub).select('name email role').lean();
    if (!user) return res.status(401).json({ success: false, message: 'Your session is no longer valid.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Administrator access is required.' });
  next();
}
