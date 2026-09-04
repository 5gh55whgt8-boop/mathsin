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
import { scanFile, scanImage, scanText } from '../services/openai.js';

const uploadDir = path.resolve('uploads');
const scanStorageDir = path.resolve('storage/scans');
await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(scanStorageDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: env.maxFileSize } });
const router = Router();
router.use(requireAuth);

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

router.post('/image', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    if (!req.file.mimetype.startsWith('image/')) return res.status(415).json({ error: 'Image required' });
    const result = await scanImage(req.file.path, req.file.mimetype);
    res.status(201).json({ scan: await saveResult(req, result, 'image') });
  } catch (e) { next(e); }
  finally { fs.unlink(req.file.path).catch(() => {}); }
});

router.post('/document', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    const allowed = new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']);
    if (!allowed.has(req.file.mimetype)) return res.status(415).json({ error: 'PDF, DOCX or TXT required' });
    let result;
    if (req.file.mimetype === 'application/pdf') {
      result = await scanFile(req.file.path, req.file.mimetype, req.file.originalname);
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
