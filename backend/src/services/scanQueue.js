import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import ScanJob from '../models/ScanJob.js';
import Scan from '../models/Scan.js';
import User from '../models/User.js';
import { hasScanAccess } from './entitlements.js';
import { scanFile } from './openai.js';

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'scanInputs' });
export function jobView(job) {
  return { id: String(job._id), status: job.status, completed: job.completed instanceof Map ? job.completed.size : Object.keys(job.completed || {}).length,
    total: job.total, attempts: job.attempts, nextAttempt: job.nextAttempt, code: job.errorCode, message: job.message, scanId: job.scan };
}
export function retryDelay(attempt) { return Math.min(3600000, 60000 * 2 ** Math.min(Math.max(attempt - 1, 0), 6)); }
export function retryable(error) { return /^(OCR_PROVIDER_|OCR_CONNECTION|OCR_TIMEOUT|OCR_INVALID_RESPONSE|OCR_COVERAGE|OCR_TRUNCATED|OCR_INCOMPLETE)/.test(error.code || ''); }

async function cleanupFinishedInputs() {
  // Also cleans up a crash after the completion transaction but before deletion.
  const terminal = await ScanJob.find({ active: false, source: { $exists: true } }).limit(20);
  for (const job of terminal) {
    const exists = await mongoose.connection.db.collection('scanInputs.files').findOne({ _id: job.source });
    if (exists) await bucket().delete(job.source);
    await ScanJob.updateOne({ _id: job._id, active: false }, { $unset: { source: 1, completed: 1 } });
  }
}

export async function enqueuePdf(user, file) {
  const hash = crypto.createHash('sha256').update(await fs.readFile(file.path)).digest('hex');
  const existing = await ScanJob.findOne({ user: user._id, active: true });
  if (existing) {
    if (existing.hash === hash) return existing;
    throw Object.assign(new Error('A scan is already queued. Wait for it to finish before uploading another PDF.'), { status: 409 });
  }
  const stream = bucket().openUploadStream(file.originalname, { metadata: { user: user._id, createdAt: new Date() } });
  try {
    await pipeline(createReadStream(file.path), stream);
    return await ScanJob.create({ user: user._id, source: stream.id, originalName: file.originalname, hash,
      expiresAt: new Date(Date.now() + 24 * 3600000) });
  } catch (error) {
    await bucket().delete(stream.id).catch(() => {});
    if (error.code === 11000) {
      const other = await ScanJob.findOne({ user: user._id, active: true });
      if (other?.hash === hash) return other;
      throw Object.assign(new Error('Another scan is already queued.'), { status: 409 });
    }
    throw error;
  }
}

let running = false;
// Lease exceeds the OCR hard deadline; a process crash is recovered by another poll.
export async function processNextJob() {
  if (running) return;
  running = true;
  let temp;
  try {
    await cleanupFinishedInputs();
    const now = new Date();
    const token = crypto.randomUUID();
    const job = await ScanJob.findOneAndUpdate({ active: true, $or: [
      { status: { $in: ['queued', 'waiting'] }, nextAttempt: { $lte: now } },
      { status: 'processing', leaseUntil: { $lt: now } }
    ] }, { $set: { status: 'processing', leaseToken: token, leaseUntil: new Date(Date.now() + 15 * 60000) }, $inc: { attempts: 1 } }, { new: true, sort: { nextAttempt: 1 } });
    if (!job) return;
    const owned = { _id: job._id, leaseToken: token, status: 'processing' };
    try {
      const user = await User.findById(job.user);
      if (!user || !hasScanAccess(user)) throw Object.assign(new Error('Your trial or subscription has ended. Contact support or renew before scanning.'), { code: 'SUBSCRIPTION_REQUIRED' });
      if (job.expiresAt < now) throw Object.assign(new Error('The scanner could not finish within 24 hours. Please retry later.'), { code: 'OCR_JOB_EXPIRED' });
      temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-job-'));
      const input = path.join(temp, 'input.pdf');
      await pipeline(bucket().openDownloadStream(job.source), createWriteStream(input));
      const result = await scanFile(input, 'application/pdf', job.originalName, {
        completed: Object.fromEntries(job.completed || []),
        onPrepared: total => ScanJob.updateOne(owned, { $set: { total } }),
        onCompleted: async (index, page) => {
          const saved = await ScanJob.updateOne(owned, { $set: { [`completed.${index}`]: page } });
          if (!saved.matchedCount) throw new Error('Scan lease lost');
        }
      });
      // Atomic publication + allowance charge: crashes cannot double-charge or
      // leave a charged user without a saved scan. Atlas supports transactions.
      await mongoose.connection.transaction(async session => {
        const current = await ScanJob.findOne(owned).session(session);
        if (!current) throw new Error('Scan lease lost');
        const account = await User.findById(job.user).session(session);
        if (!account || !hasScanAccess(account)) throw Object.assign(new Error('Trial or subscription ended before this scan completed.'), { code: 'SUBSCRIPTION_REQUIRED' });
        const p = result.parsed;
        const [scan] = await Scan.create([{ user: job.user, ...p, sourceType: 'pdf', mimeType: 'application/pdf', originalName: job.originalName,
          provider: result.provider, model: result.model, raw: { responseId: result.rawId } }], { session });
        await User.updateOne({ _id: job.user }, { $inc: { 'usage.scans': 1 } }, { session });
        await ScanJob.updateOne(owned, { $set: { status: 'completed', active: false, scan: scan._id, message: '', errorCode: '' }, $unset: { completed: 1 } }, { session });
      });
    } catch (error) {
      const wait = retryable(error) && job.expiresAt > new Date();
      await ScanJob.updateOne(owned, { $set: { status: wait ? 'waiting' : 'failed', active: wait,
        errorCode: error.code || 'SCAN_JOB_FAILED', message: wait ? 'Provider temporarily unavailable. Completed pages are saved; retry is automatic.' : (error.code ? error.message : 'Scan could not complete. Please retry.'),
        nextAttempt: new Date(Date.now() + retryDelay(job.attempts)) } });
      console.warn('[scan-job]', String(job._id), error.code || 'SCAN_JOB_FAILED');
    }
    await cleanupFinishedInputs();
  } finally {
    if (temp) await fs.rm(temp, { recursive: true, force: true });
    running = false;
  }
}
export function kickScanQueue() { void processNextJob().catch(error => console.warn('[scan-queue]', error.code || 'worker unavailable')); }
export async function startScanQueue() {
  await ScanJob.init();
  kickScanQueue();
  const timer = setInterval(kickScanQueue, 15000);
  timer.unref();
}
