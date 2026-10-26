import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import Scan from '../models/Scan.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import mammoth from 'mammoth';
import { scanImage, scanText } from '../services/openai.js';
import { hasScanAccess, trialState } from '../services/entitlements.js';
import ScanJob from '../models/ScanJob.js';
import { enqueuePdf, jobView, kickScanQueue } from '../services/scanQueue.js';

const uploadDir = path.resolve('uploads');
const scanStorageDir = path.resolve('storage/scans');
await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(scanStorageDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: env.maxFileSize } });
const router = Router();
router.use(requireAuth);

router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await ScanJob.find({ user: req.user._id, active: true }).sort({ createdAt: -1 }).limit(1);
    res.json({ jobs: jobs.map(jobView) });
    kickScanQueue();
  } catch (error) { next(error); }
});
router.get('/jobs/:id', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid job id' });
    const job = await ScanJob.findOne({ _id: req.params.id, user: req.user._id });
    if (!job) return res.status(404).json({ error: 'Scan job not found' });
    const scan = job.scan ? await Scan.findOne({ _id: job.scan, user: req.user._id }) : undefined;
    res.json({ job: jobView(job), scan });
    kickScanQueue();
  } catch (error) { next(error); }
});
router.post('/jobs', requireScanAccess, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    if (req.file.mimetype !== 'application/pdf') return res.status(415).json({ error: 'PDF required for background scanning' });
    const job = await enqueuePdf(req.user, req.file);
    res.status(202).json({ job: jobView(job) });
    kickScanQueue();
  } catch (error) { next(error); }
  finally { fs.unlink(req.file.path).catch(() => {}); }
});

function requireScanAccess(req, res, next) {
  if (hasScanAccess(req.user)) return next();
  return res.status(402).json({ error: 'Your free trial has ended. Subscribe to MathLens Pro to continue scanning.', code: 'SUBSCRIPTION_REQUIRED', trial: trialState(req.user) });
}

function safeExt(originalName = '', mimeType = '') {
  const ext = path.extname(originalName).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
  const byMime = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
    'image/gif': '.gif', 'image/bmp': '.bmp'
  };
  return byMime[mimeType] || '';
}

async function persistOriginal(req, sourceType) {
  if (sourceType !== 'image' || !req.file?.path) return undefined;
  const storedFile = `${crypto.randomUUID()}${safeExt(req.file.originalname, req.file.mimetype)}`;
  await fs.copyFile(req.file.path, path.join(scanStorageDir, storedFile));
  return storedFile;
}

async function saveResult(req, result, sourceType) {
  const p = result.parsed || {};
  const storedFile = await persistOriginal(req, sourceType);
  const scan = await Scan.create({
    user: req.user._id,
    title: p.title || req.file.originalname || 'Untitled scan',
    sourceType,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    storedFile,
    plainText: p.plainText || '',
    latex: p.latex || '',
    markdown: p.markdown || '',
    blocks: Array.isArray(p.blocks) ? p.blocks : [],
    questions: Array.isArray(p.questions) ? p.questions : [],
    warnings: Array.isArray(p.warnings) ? p.warnings : [],
    model: result.model,
    provider: result.provider || 'openai',
    raw: { responseId: result.rawId }
  });
  await User.updateOne({ _id: req.user._id }, { $inc: { 'usage.scans': 1 } });
  return scan;
}

router.post('/image', requireScanAccess, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    if (!req.file.mimetype.startsWith('image/')) return res.status(415).json({ error: 'Image required' });
    const result = await scanImage(req.file.path, req.file.mimetype);
    res.status(201).json({ scan: await saveResult(req, result, 'image') });
  } catch (e) { next(e); }
  finally { fs.unlink(req.file.path).catch(() => {}); }
});

router.post('/document', requireScanAccess, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    const allowed = new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']);
    if (!allowed.has(req.file.mimetype)) return res.status(415).json({ error: 'PDF, DOCX or TXT required' });
    let result;
    if (req.file.mimetype === 'application/pdf') {
      // Installed APKs still expect a synchronous response. Their work now
      // survives HTTP disconnects too; new clients poll /jobs instead.
      const queued = await enqueuePdf(req.user, req.file);
      kickScanQueue();
      const deadline = Date.now() + 8 * 60000;
      while (!res.destroyed && Date.now() < deadline) {
        const job = await ScanJob.findOne({ _id: queued._id, user: req.user._id });
        if (job.status === 'completed') return res.status(201).json({ scan: await Scan.findOne({ _id: job.scan, user: req.user._id }) });
        if (job.status === 'failed') return res.status(422).json({ code: job.errorCode, error: job.message });
        if (job.status === 'waiting') break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (!res.destroyed) return res.status(503).json({ code: 'OCR_JOB_PENDING', jobId: String(queued._id), error: 'Your PDF is saved in the scan queue. Completed pages are safe and retry is automatic. Check History later; do not upload it again.' });
      return;
    } else if (req.file.mimetype === 'text/plain') {
      const text = await fs.readFile(req.file.path, 'utf8');
      result = await scanText(text, req.file.originalname);
    } else {
      const extracted = await mammoth.extractRawText({ path: req.file.path });
      result = await scanText(extracted.value, req.file.originalname);
    }
    res.status(201).json({ scan: await saveResult(req, result, req.file.mimetype === 'application/pdf' ? 'pdf' : 'document') });
  } catch (e) { next(e); }
  finally { fs.unlink(req.file.path).catch(() => {}); }
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const q = { user: req.user._id };
    if (req.query.favorite === 'true') q.favorite = true;
    if (req.query.search) q.$or = [
      { title: new RegExp(req.query.search, 'i') },
      { plainText: new RegExp(req.query.search, 'i') },
      { tags: new RegExp(req.query.search, 'i') }
    ];
    const [items, total] = await Promise.all([
      Scan.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      Scan.countDocuments(q)
    ]);
    res.json({ items, total, page, pages: Math.ceil(total/limit) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json({ scan });
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['title','plainText','latex','markdown','blocks','questions','tags','favorite'];
    const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const scan = await Scan.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, patch, { new: true });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json({ scan });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (scan.storedFile) fs.unlink(path.join(scanStorageDir, scan.storedFile)).catch(() => {});
    await scan.deleteOne();
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
