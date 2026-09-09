import crypto from 'crypto';
import EmailOtp from '../models/EmailOtp.js';
import { env } from '../config/env.js';

function hashCode(email, code) {
  return crypto.createHash('sha256').update(`${email}:${code}:${env.jwtSecret}`).digest('hex');
}

function senderDetails() {
  const configured = String(env.emailFrom || '').trim();
  const match = configured.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || 'MathLens AI', email: match[2].trim() };
  // Smart Billing's legacy setting contains a display name followed by the
  // address. Extract the valid address before passing it to Brevo.
  const email = configured.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  return { name: 'MathLens AI', email: email || configured };
}

async function deliverCode(email, code) {
  if (!env.brevoApiKey || !env.emailFrom) {
    const error = new Error('OTP email service is not configured'); error.status = 503; throw error;
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': env.brevoApiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: senderDetails(), to: [{ email }], subject: 'Verify your MathLens AI account',
      textContent: `Your MathLens AI verification code is ${code}. It expires in ${env.otpTtlMinutes} minutes. If you did not request this, ignore this email.`,
      htmlContent: `<h2>MathLens AI</h2><p>Your account verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in ${env.otpTtlMinutes} minutes. If you did not request it, ignore this email.</p>`
    })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.message || 'Email provider rejected the OTP request'); error.status = 502; throw error;
  }
}

export async function sendVerificationCode(email) {
  const normalized = email.toLowerCase().trim();
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);
  await EmailOtp.deleteMany({ email: normalized, purpose: 'verification' });
  await EmailOtp.create({ email: normalized, codeHash: hashCode(normalized, code), expiresAt });
  try { await deliverCode(normalized, code); }
  catch (error) { await EmailOtp.deleteMany({ email: normalized, purpose: 'verification' }); throw error; }
  return { expiresAt };
}

export async function verifyCode(email, code) {
  const normalized = email.toLowerCase().trim();
  const otp = await EmailOtp.findOne({ email: normalized, purpose: 'verification', expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (!otp || otp.attempts >= 5 || otp.codeHash !== hashCode(normalized, String(code || '').trim())) {
    if (otp) { otp.attempts += 1; await otp.save(); }
    return false;
  }
  await otp.deleteOne();
  return true;
}
