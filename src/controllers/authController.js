import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Membership from '../models/Membership.js';
import User from '../models/User.js';

const cookieName = process.env.AUTH_COOKIE_NAME || 'asmmr_session';
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const publicUser = user => ({ id: user.id || user._id, name: user.name, email: user.email, role: user.role });

function setSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: '7d' });
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export async function register(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Enter your name, a valid email, and a password of at least 8 characters.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ success: false, message: 'An account already exists for this email. Please sign in.' });
    const membership = await Membership.findOne({ email });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'user' });
    if (membership && !membership.user) {
      membership.user = user._id;
      await membership.save();
    }
    setSession(res, user);
    res.status(201).json({ success: true, data: { user: publicUser(user), hasMembership: Boolean(membership) } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An account already exists for this email. Please sign in.' });
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    }
    setSession(res, user);
    res.json({ success: true, data: { user: publicUser(user), hasMembership: Boolean(await Membership.exists({ user: user._id })) } });
  } catch (error) { next(error); }
}

export async function accountStatus(req, res, next) {
  try {
    const email = normalizeEmail(req.query.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    const [account, membership] = await Promise.all([
      User.exists({ email }),
      Membership.findOne({ email }).select('fullName').lean(),
    ]);
    res.json({ success: true, data: { hasAccount: Boolean(account), hasMembership: Boolean(membership), fullName: membership?.fullName || '' } });
  } catch (error) { next(error); }
}

export async function me(req, res, next) {
  try {
    const membership = await Membership.findOne({ user: req.user._id }).select('status reviewReason').lean();
    res.json({ success: true, data: { user: publicUser(req.user), membership } });
  } catch (error) { next(error); }
}

export function logout(req, res) {
  res.clearCookie(cookieName, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  res.json({ success: true });
}
