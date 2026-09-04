import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { env } from '../config/env.js';

export async function ensureAdmin() {
  if (!env.adminEmail || !env.adminPassword) return;
  const existing = await User.findOne({ email: env.adminEmail.toLowerCase() });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await User.create({
    name: env.adminName,
    email: env.adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    plan: 'institution'
  });
  console.log(`[admin] seeded ${env.adminEmail}`);
}
