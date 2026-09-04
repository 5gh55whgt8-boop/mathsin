import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
function safe(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan, usage: user.usage };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Name, email and password (8+ chars) required' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: tokenFor(user), user: safe(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: tokenFor(user), user: safe(user) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: safe(req.user) }));
export default router;
