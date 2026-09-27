import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'node:crypto';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import EmailOtp from '../models/EmailOtp.js';
import { sendOtpEmail } from '../services/emailService.js';

const cookieName = process.env.AUTH_COOKIE_NAME || 'asmmr_session';
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const publicUser = user => ({ id: user.id || user._id, name: user.name, email: user.email, role: user.role });
const otpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);
const newCode = () => String(randomInt(100000, 1000000));

async function saveAndSendCode({ email, purpose, name, payload = {} }) {
  const existing = await EmailOtp.findOne({ email, purpose }).select('updatedAt');
  if (existing && Date.now() - existing.updatedAt.getTime() < 60_000) {
    const error = new Error('A code was already sent. Please wait one minute before requesting another.');
    error.status = 429;
    throw error;
  }
  const code = newCode();
  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    { codeHash: await bcrypt.hash(code, 10), payload, attempts: 0, expiresAt: otpExpiry() },
    { upsert: true, new: true, runValidators: true },
  );
  try { await sendOtpEmail({ to: email, name, code, purpose }); }
  catch (error) { await EmailOtp.deleteOne({ email, purpose }); throw error; }
}

async function validCode(email, purpose, code) {
  const otp = await EmailOtp.findOne({ email, purpose }).select('+codeHash');
  if (!otp || otp.expiresAt <= new Date()) return null;
  if (otp.attempts >= 5) { await otp.deleteOne(); return null; }
  if (!/^\d{6}$/.test(code) || !await bcrypt.compare(code, otp.codeHash)) {
    otp.attempts += 1;
    await otp.save();
    return null;
  }
  return otp;
}

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
    await saveAndSendCode({ email, purpose: 'verify-email', name, payload: { name, passwordHash: await bcrypt.hash(password, 12) } });
    res.status(202).json({ success: true, message: 'We sent a 6-digit verification code to your email.', data: { verificationRequired: true, email } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An account already exists for this email. Please sign in.' });
    next(error);
  }
}

export async function verifyRegistration(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = await validCode(email, 'verify-email', String(req.body.code || '').trim());
    if (!otp) return res.status(400).json({ success: false, message: 'The verification code is invalid or has expired.' });
    if (await User.exists({ email })) { await otp.deleteOne(); return res.status(409).json({ success: false, message: 'An account already exists for this email. Please sign in.' }); }
    const membership = await Membership.findOne({ email });
    const user = await User.create({ name: otp.payload.name, email, passwordHash: otp.payload.passwordHash, role: 'user' });
    if (membership && !membership.user) { membership.user = user._id; await membership.save(); }
    await otp.deleteOne();
    setSession(res, user);
    res.status(201).json({ success: true, message: 'Your email has been verified.', data: { user: publicUser(user), hasMembership: Boolean(membership) } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An account already exists for this email. Please sign in.' });
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    const user = await User.findOne({ email }).select('name');
    if (user) await saveAndSendCode({ email, purpose: 'reset-password', name: user.name });
    res.json({ success: true, message: 'If an account exists for that email, a password reset code has been sent.' });
  } catch (error) { next(error); }
}

export async function resetPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Your new password must contain at least 8 characters.' });
    const otp = await validCode(email, 'reset-password', String(req.body.code || '').trim());
    if (!otp) return res.status(400).json({ success: false, message: 'The reset code is invalid or has expired.' });
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) { await otp.deleteOne(); return res.status(400).json({ success: false, message: 'The reset code is invalid or has expired.' }); }
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    await otp.deleteOne();
    res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (error) { next(error); }
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
