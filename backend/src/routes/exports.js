import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import Scan from '../models/Scan.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const esc = s => String(s || '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const filename = s => String(s || 'scan').replace(/[^a-z0-9._-]+/gi,'_').slice(0,80);
const recognized = scan => scan.plainText || scan.markdown || scan.latex || '';

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
      doc.fontSize(21).text(scan.title || 'AI Scan');
      doc.fontSize(9).fillColor('#666').text(`AI provider: ${scan.provider || 'AI'}${scan.model ? ` • ${scan.model}` : ''}`);
      doc.fillColor('#000').moveDown();
      doc.fontSize(14).text('AI extracted text');
      doc.moveDown(0.5).fontSize(11).text(recognized(scan) || 'No recognized content.', { lineGap: 3 });
      if (scan.latex) {
        doc.moveDown().fontSize(14).text('LaTeX');
        doc.moveDown(0.5).fontSize(10).text(scan.latex, { lineGap: 2 });
      }
      doc.end();
      return;
    }
    if (f === 'docx') {
      const children = [
        new Paragraph({ text: scan.title || 'AI Scan', heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: `AI provider: ${scan.provider || 'AI'}${scan.model ? ` • ${scan.model}` : ''}`, italics: true })] })
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
