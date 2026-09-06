import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { sendVerificationCode, verifyCode } from '../services/email.js';

const router = Router();
function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
function safe(user) {
  return { id: user._id, name: user.name, email: user.email, emailVerified: user.emailVerified !== false, role: user.role, plan: user.plan, usage: user.usage, trial: user.trial, subscription: user.subscription };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Name, email and password (8+ chars) required' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + env.trialDays);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), trial: { startedAt: new Date(), expiresAt, scanLimit: env.freeScanLimit } });
    try { const otp = await sendVerificationCode(user.email); res.status(201).json({ verificationRequired: true, email: user.email, expiresAt: otp.expiresAt }); }
    catch (error) { await user.deleteOne(); throw error; }
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.emailVerified === false) return res.status(403).json({ error: 'Verify your email before signing in', code: 'EMAIL_VERIFICATION_REQUIRED', email: user.email });
    res.json({ token: tokenFor(user), user: safe(user) });
  } catch (e) { next(e); }
});

router.post('/otp/resend', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (user.emailVerified !== false) return res.status(400).json({ error: 'Email is already verified' });
    const otp = await sendVerificationCode(email);
    res.json({ verificationRequired: true, email, expiresAt: otp.expiresAt });
  } catch (e) { next(e); }
});

router.post('/otp/verify', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit verification code' });
    if (!(await verifyCode(email, code))) return res.status(400).json({ error: 'Invalid or expired verification code' });
    const user = await User.findOneAndUpdate({ email }, { emailVerified: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ token: tokenFor(user), user: safe(user) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: safe(req.user) }));
export default router;
