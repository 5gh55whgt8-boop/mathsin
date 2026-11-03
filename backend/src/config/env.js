import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDefaultResultOrder } from 'dns';

// Brevo IP allow-lists are considerably more practical with the machine's
// stable public IPv4 address than a privacy-rotating IPv6 address.
setDefaultResultOrder('ipv4first');

const configDir = path.dirname(fileURLToPath(import.meta.url));
const smartBillingEnv = path.resolve(configDir, '../../../../store_billing--vivek-vivek/backend/.env');
// Keep secrets at the repository root whether the server is started from root or backend/.
// Reuse the locally configured Smart Billing payment/email providers; project-local
// settings below always win so MathLens can be deployed independently later.
dotenv.config({ path: smartBillingEnv });
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(configDir, '../../../.env'), override: true });

const required = [];
const listSetting = (...values) => values
  .flatMap(value => String(value || '').split(/[,\r\n;]+/))
  .map(value => value.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);
const geminiKeys = listSetting(
  process.env.GEMINI_API_KEYS,
  process.env.GEMINI_API_KEY,
  ...Array.from({ length: 20 }, (_, index) => process.env[`GEMINI_API_KEY_${index + 1}`])
);
const geminiModels = listSetting(
  process.env.GEMINI_OCR_MODELS,
  ...Array.from({ length: 5 }, (_, index) => process.env[`GEMINI_OCR_MODEL_${index + 1}`]),
  process.env.GEMINI_OCR_MODEL
).map(model => model.replace(/^models\//i, ''));

if (!geminiKeys.length) console.warn('[env] Missing Gemini API keys. Set GEMINI_API_KEYS or GEMINI_API_KEY_1..N.');
for (const key of required) {
  if (!process.env[key]) console.warn(`[env] Missing ${key}`);
}

function integerSetting(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Math.floor(value))) : fallback;
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
  geminiKeys: [...new Set(geminiKeys)],
  geminiModels: [...new Set(geminiModels.length ? geminiModels : ['gemini-2.5-flash'])],
  ocrTimeoutMs: integerSetting('OCR_TIMEOUT_MS', 90000, 10000, 180000),
  ocrMaxRetries: integerSetting('OCR_MAX_RETRIES', 2, 0, 3),
  ocrConcurrency: integerSetting('OCR_CONCURRENCY', 2, 1, 4),
  ocrTotalTimeoutMs: integerSetting('OCR_TOTAL_TIMEOUT_MS', 540000, 10000, 540000),
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminName: process.env.ADMIN_NAME || 'Administrator',
  freeScanLimit: Number(process.env.FREE_SCAN_LIMIT || 30),
  trialDays: Number(process.env.TRIAL_DAYS || 17),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  proMonthlyAmount: Number(process.env.PRO_MONTHLY_AMOUNT || 29900),
  proCurrency: process.env.PRO_CURRENCY || 'INR',
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 15)
};
