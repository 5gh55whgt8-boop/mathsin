import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const smartBillingEnv = path.resolve(configDir, '../../../../store_billing--vivek-vivek/backend/.env');
// Keep secrets at the repository root whether the server is started from root or backend/.
// Reuse the locally configured Smart Billing payment/email providers; project-local
// settings below always win so MathLens can be deployed independently later.
dotenv.config({ path: smartBillingEnv });
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(configDir, '../../../.env'), override: true });

const required = [];
if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
  console.warn('[env] Missing both OPENAI_API_KEY and GEMINI_API_KEY');
}
for (const key of required) {
  if (!process.env[key]) console.warn(`[env] Missing ${key}`);
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'MathLens AI',
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI,
  poolMax: Number(process.env.DB_POOL_MAX || 15),
  jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  maxFileSize: Number(process.env.MAX_FILE_SIZE || 20 * 1024 * 1024),
  openaiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_OCR_MODEL || 'gpt-5.6',
  reasoningEffort: process.env.OPENAI_OCR_REASONING_EFFORT || 'high',
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_OCR_MODEL || 'gemini-3.5-flash',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminName: process.env.ADMIN_NAME || 'Administrator',
  freeScanLimit: Number(process.env.FREE_SCAN_LIMIT || 3),
  trialDays: Number(process.env.TRIAL_DAYS || 7),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  proMonthlyAmount: Number(process.env.PRO_MONTHLY_AMOUNT || 29900),
  proCurrency: process.env.PRO_CURRENCY || 'INR',
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 15)
};
