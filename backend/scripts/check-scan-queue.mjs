// Explicit paid-provider integration test; isolated database, no real user edits.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDb } from '../src/config/db.js';
import User from '../src/models/User.js';
import Scan from '../src/models/Scan.js';
import ScanJob from '../src/models/ScanJob.js';
import { enqueuePdf, processNextJob, jobView } from '../src/services/scanQueue.js';

const source = process.argv[2];
if (!source) throw new Error('Pass the mathsinn PDF path');
const dbName = `mathlens_queue_test_${crypto.randomBytes(6).toString('hex')}`;
let user, job;
const started = Date.now();
try {
  await connectDb({ dbName });
  await Promise.all([User.init(), Scan.init(), ScanJob.init()]);
  user = await User.create({ name: 'Queue test', email: `${crypto.randomUUID()}@example.invalid`, passwordHash: 'not-a-login-hash', trial: { scanLimit: 3, expiresAt: new Date(Date.now() + 86400000) } });
  const file = { path: source, originalname: path.basename(source) };
  job = await enqueuePdf(user, file);
  assert.equal(String((await enqueuePdf(user, file))._id), String(job._id));
  console.log('[queue-test] durable upload and duplicate suppression passed');
  await processNextJob();
  let state = await ScanJob.findById(job._id);
  console.log('[queue-test]', JSON.stringify(jobView(state)));
  // A second worker run simulates a later retry, preserving DB checkpoints.
  if (state.status === 'waiting') {
    console.log('[queue-test] Retrying only missing sections after provider cooldown');
    await new Promise(resolve => setTimeout(resolve, Math.max(0, state.nextAttempt - Date.now())));
    await processNextJob();
    state = await ScanJob.findById(job._id);
  }
  assert.equal(state.status, 'completed', state.message);
  const scan = await Scan.findById(state.scan);
  assert.equal(scan.questions.length, 40);
  assert.ok(scan.questions.every(question => question.options.length === 4));
  assert.deepEqual(scan.questions.map(q => String(q.number).replace(/[.)]$/, '')), Array.from({ length: 40 }, (_, i) => String(i + 1)));
  await processNextJob();
  assert.equal((await User.findById(user._id)).usage.scans, 1);
  assert.equal(await Scan.countDocuments({ user: user._id }), 1);
  assert.equal(await mongoose.connection.db.collection('scanInputs.files').countDocuments({}), 0);
  await fs.mkdir('../tmp', { recursive: true });
  await fs.writeFile('../tmp/queue-mathsinn-result.json', JSON.stringify(scan.toObject(), null, 2));
  console.log(JSON.stringify({ passed: true, questions: scan.questions.length, options: 160, charged: 1, seconds: Math.round((Date.now() - started) / 1000) }));
} finally {
  // Only remove this isolated test's records, never touch production accounts.
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
    if (job) {
      const remaining = await ScanJob.findById(job._id);
      if (remaining?.source) await new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'scanInputs' }).delete(remaining.source).catch(() => {});
      await ScanJob.deleteOne({ _id: job._id });
    }
    if (user) { await Scan.deleteMany({ user: user._id }); await User.deleteOne({ _id: user._id }); }
  }
  await mongoose.disconnect();
}
