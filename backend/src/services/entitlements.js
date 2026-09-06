import { env } from '../config/env.js';

export function hasScanAccess(user) {
  if (user.role === 'admin' || user.plan === 'institution') return true;
  if (user.subscription?.status === 'active' && user.subscription?.currentPeriodEnd > new Date()) return true;
  const expiresAt = user.trial?.expiresAt;
  const limit = user.trial?.scanLimit ?? env.freeScanLimit;
  return (!expiresAt || expiresAt > new Date()) && (user.usage?.scans || 0) < limit;
}

export function trialState(user) {
  const limit = user.trial?.scanLimit ?? env.freeScanLimit;
  const remaining = Math.max(0, limit - (user.usage?.scans || 0));
  const dateExpired = user.trial?.expiresAt && user.trial.expiresAt <= new Date();
  return { scanLimit: limit, scansUsed: user.usage?.scans || 0, scansRemaining: remaining, expiresAt: user.trial?.expiresAt, expired: Boolean(dateExpired || (remaining === 0 && user.subscription?.status !== 'active')) };
}
