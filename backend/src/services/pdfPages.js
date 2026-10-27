import fs from 'fs/promises';
import { EncryptedPDFError, PDFDocument } from 'pdf-lib';

const MAX_PDF_PAGES = 12;
const COLUMN_OVERLAP = 0.015;

function pdfError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

async function loadPdf(bytes) {
  try {
    // Encrypted content cannot be reliably read merely by ignoring encryption.
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    // pdf-lib's transpiled Error subclass loses instanceof on some Node builds.
    if (error instanceof EncryptedPDFError || /Input document to .*PDFDocument\.load.* is encrypted\./.test(error.message || '')) {
      throw pdfError('This PDF is password protected. Upload an unlocked PDF to scan its text.', 'OCR_ENCRYPTED_PDF');
    }
    throw pdfError('This PDF could not be read. Export it as a new PDF and upload it again.', 'OCR_INVALID_PDF');
  }
}

function visibleBox(page) {
  const media = page.getMediaBox();
  const crop = page.getCropBox();
  const x = Math.max(media.x, crop.x);
  const y = Math.max(media.y, crop.y);
  const right = Math.min(media.x + media.width, crop.x + crop.width);
  const top = Math.min(media.y + media.height, crop.y + crop.height);
  return { x, y, width: right - x, height: top - y };
}

async function preparePage(source, pageIndex, sourcePage, columnCount) {
  const originalPage = source.getPage(pageIndex);
  const box = visibleBox(originalPage);
  // Splitting rotated PDF coordinates would produce top/bottom strips instead
  // of reading-order columns. Keep the whole page for those documents.
  const canSplit = originalPage.getRotation().angle % 360 === 0
    && Number.isFinite(box.width) && Number.isFinite(box.height)
    && box.width > 0 && box.height > 0;
  const columns = Number(columnCount) === 2 && canSplit ? 2 : 1;
  const output = [];

  for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
    const pageDocument = await PDFDocument.create({ updateMetadata: false });
    const [page] = await pageDocument.copyPages(source, [pageIndex]);
    if (columns === 2) {
      const overlap = box.width * COLUMN_OVERLAP;
      const midpoint = box.x + box.width / 2;
      const left = columnIndex === 0 ? box.x : midpoint - overlap;
      const right = columnIndex === 0 ? midpoint + overlap : box.x + box.width;
      // Set both boxes so PDF renderers that use either box agree. Original
      // content and images remain intact at their source resolution.
      page.setMediaBox(left, box.y, right - left, box.height);
      page.setCropBox(left, box.y, right - left, box.height);
    }
    pageDocument.addPage(page);
    const bytes = await pageDocument.save({ useObjectStreams: false, addDefaultPage: false });
    const side = columns === 2 ? (columnIndex === 0 ? 'left' : 'right') : 'full';
    output.push({
      pageNumber: `${sourcePage}-${side}`,
      sourcePage,
      mimeType: 'application/pdf',
      data: Buffer.from(bytes).toString('base64')
    });
  }
  return output;
}

/** Keep every page intact by default; request columns only for known layouts. */
export async function splitPdfIntoPages(path, columnCount = 1) {
  const source = await loadPdf(await fs.readFile(path));
  const pageCount = source.getPageCount();
  if (pageCount === 0) {
    throw pdfError('This PDF has no pages to scan.', 'OCR_EMPTY_PDF');
  }
  if (pageCount > MAX_PDF_PAGES) {
    throw pdfError(`This PDF has ${pageCount} pages. Upload up to ${MAX_PDF_PAGES} pages at a time for high-accuracy math OCR.`, 'OCR_PAGE_LIMIT', 413);
  }
  const output = [];
  // Serial copies bound temporary memory for uploaded image-heavy PDFs.
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    output.push(...await preparePage(source, pageIndex, pageIndex + 1, columnCount));
  }
  return output;
}

/** Split a selected original page after its two-column layout is identified. */
export async function splitPdfPageIntoColumns(pageInput) {
  const source = await loadPdf(Buffer.from(pageInput.data, 'base64'));
  if (source.getPageCount() !== 1) {
    throw pdfError('Column scanning requires one source page at a time.', 'OCR_INVALID_PDF');
  }
  return preparePage(source, 0, pageInput.sourcePage, 2);
}
