import { Router } from 'express';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import Scan from '../models/Scan.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 20 }
});
const esc = s => String(s || '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const filename = s => String(s || 'scan').replace(/[^a-z0-9._-]+/gi,'_').slice(0,80);
const recognized = scan => scan.plainText || scan.markdown || scan.latex || '';
const pdfText = value => String(value || '')
  .replace(/[∑Σ]/g, 'SUM')
  .replace(/[∫]/g, 'INT')
  .replace(/[√]/g, 'sqrt')
  .replace(/[∞]/g, 'infinity')
  .replace(/[≤]/g, '<=')
  .replace(/[≥]/g, '>=')
  .replace(/[≠]/g, '!=')
  .replace(/[≈]/g, '~=')
  .replace(/[×·]/g, '*')
  .replace(/[÷]/g, '/')
  .replace(/[−–—]/g, '-')
  .replace(/[→⇒]/g, '->')
  .replace(/[←⇐]/g, '<-')
  .replace(/[αβγδεθλμππ]/g, character => ({
    α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon',
    θ: 'theta', λ: 'lambda', μ: 'mu', π: 'pi'
  }[character] || character)
  .replace(/[^\x00-\xFF]/g, '?'))

router.post('/images-pdf', imageUpload.array('images', 20), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one image.' });
    const invalid = req.files.find(file => !['image/jpeg', 'image/png'].includes(file.mimetype));
    if (invalid) return res.status(415).json({ error: 'Only image files can be added to a PDF.' });

    res.type('application/pdf').attachment('mathlens-images.pdf');
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
    doc.pipe(res);
    for (const file of req.files) {
      const image = doc.openImage(file.buffer);
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      doc.addPage({ size: 'A4', margin: 0 });
      doc.image(image, (pageWidth - width) / 2, (pageHeight - height) / 2, { width, height });
    }
    doc.end();
  } catch (e) { next(e); }
});

router.get('/:scanId/:format', async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, user: req.user._id });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    const f = req.params.format.toLowerCase(), base = filename(scan.title);
    if (f === 'json') return res.attachment(`${base}.json`).json(scan.toObject());
    if (f === 'txt') return res.type('text/plain').attachment(`${base}.txt`).send(scan.plainText);
    if (f === 'md') return res.type('text/markdown').attachment(`${base}.md`).send(scan.markdown);
    if (f === 'tex') return res.type('application/x-tex').attachment(`${base}.tex`).send(scan.latex);
    if (f === 'html') {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(scan.title)}</title><script>window.MathJax={tex:{inlineMath:[["$","$"],["\\(","\\)"]]}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script><style>body{font:16px system-ui;max-width:900px;margin:40px auto;line-height:1.6;padding:0 20px}pre{white-space:pre-wrap}</style></head><body><h1>${esc(scan.title)}</h1><pre>${esc(recognized(scan))}</pre></body></html>`;
      return res.type('html').attachment(`${base}.html`).send(html);
    }
    if (f === 'pdf') {
      res.type('application/pdf').attachment(`${base}.pdf`);
      const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
      doc.pipe(res);
      doc.fontSize(21).text(pdfText(scan.title || 'AI Scan'));
      doc.fillColor('#000').moveDown();
      doc.fontSize(14).text('AI extracted text');
      doc.moveDown(0.5).fontSize(11).text(pdfText(recognized(scan) || 'No recognized content.'), { lineGap: 3 });
      if (scan.latex) {
        doc.moveDown().fontSize(14).text('LaTeX');
        doc.moveDown(0.5).fontSize(10).text(pdfText(scan.latex), { lineGap: 2 });
      }
      doc.end();
      return;
    }
    if (f === 'docx') {
      const children = [
        new Paragraph({ text: scan.title || 'AI Scan', heading: HeadingLevel.TITLE }),
      ];
      children.push(new Paragraph({ text: 'AI extracted text', heading: HeadingLevel.HEADING_1 }));
      for (const line of String(recognized(scan) || 'No recognized content.').split(/\n/)) children.push(new Paragraph({ text: line || ' ' }));
      if (scan.latex) {
        children.push(new Paragraph({ text: 'LaTeX', heading: HeadingLevel.HEADING_1 }));
        for (const line of String(scan.latex).split(/\n/)) children.push(new Paragraph({ text: line || ' ' }));
      }
      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      return res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').attachment(`${base}.docx`).send(buffer);
    }
    return res.status(400).json({ error: 'Supported: json, txt, md, tex, html, pdf, docx' });
  } catch (e) { next(e); }
});
export default router;
