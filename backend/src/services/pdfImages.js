import { PDFiumLibrary } from '@hyzyla/pdfium';
import sharp from 'sharp';
import { splitPdfIntoPages } from './pdfPages.js';
import { ocrError } from './ocrFormat.js';

// Serialize rendering to bound WASM/bitmap memory on the free 512 MB server.
let renderQueue = Promise.resolve();

// Split only at a long printed separator with empty gutters, never whitespace
// alone: a full-width equation may cross an otherwise empty page centre.
export async function findColumnDivider(bytes) {
  const { data, info } = await sharp(bytes).resize({ width: 900, withoutEnlargement: true }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const top = Math.floor(info.height * 0.12), bottom = Math.floor(info.height * 0.88);
  const density = (x, slope, offset = 0) => {
    let dark = 0;
    for (let y = top; y < bottom; y += 2) {
      const column = Math.round(x + slope * (y - top) + offset);
      if ([-1, 0, 1].some(delta => data[y * info.width + column + delta] < 200)) dark++;
    }
    return dark / Math.ceil((bottom - top) / 2);
  };
  for (let step = -15; step <= 15; step++) {
    const slope = step * 0.002;
    for (let x = Math.floor(info.width * 0.43); x < info.width * 0.57; x++) {
      if (density(x, slope) < 0.78) continue;
      const left = density(x, slope, -10), right = density(x, slope, 10);
      if (left < 0.04 && right < 0.04) {
        let crossings = 0;
        for (let y = top; y < bottom; y++) {
          const column = Math.round(x + slope * (y - top));
          if ([-18, -12, -6, 6, 12, 18].every(offset => data[y * info.width + column + offset] < 200)) crossings++;
        }
        // A table grid or full-width expression crossing the rule must remain
        // in one image; column separation is not safe there.
        if (crossings > 2) continue;
        const endpoints = [x - slope * top, x + slope * (info.height - top)];
        return { left: Math.min(...endpoints) / info.width, right: Math.max(...endpoints) / info.width };
      }
    }
  }
  return null;
}
export function renderPdfPages(path, signal) {
  const work = renderQueue.then(async () => {
    signal?.throwIfAborted();
    const pages = await splitPdfIntoPages(path);
    const library = await PDFiumLibrary.init();
    const result = [];
    let totalBytes = 0;
    try {
      for (const source of pages) {
        signal?.throwIfAborted();
        const document = await library.loadDocument(Buffer.from(source.data, 'base64'));
        try {
          const page = document.getPage(0);
          const { originalWidth, originalHeight } = page.getOriginalSize();
          if (!(originalWidth > 0 && originalHeight > 0)) throw ocrError('Invalid PDF page size.', 'OCR_INVALID_PDF', 400);
          const image = await page.render({
            scale: Math.min(3, 2600 / Math.max(originalWidth, originalHeight)),
            render: ({ data, width, height }) => sharp(data, { raw: { width, height, channels: 4 } })
              .flatten({ background: '#ffffff' }).png().toBuffer()
          });
          const bytes = Buffer.from(image.data);
          totalBytes += bytes.length;
          if (totalBytes > 32 * 1024 * 1024) throw ocrError('This PDF is too large after rendering. Upload fewer pages.', 'OCR_PAGE_LIMIT', 413);
          const divider = await findColumnDivider(bytes);
          if (divider) {
            const { width, height } = await sharp(bytes).metadata();
            for (const [side, left, right] of [['left', 0, Math.ceil(divider.right * width) + 3], ['right', Math.floor(divider.left * width) - 3, width]]) {
              const region = await sharp(bytes).extract({ left, top: 0, width: right - left, height }).png().toBuffer();
              result.push({ pageNumber: `${source.sourcePage}-${side}`, sourcePage: source.sourcePage, mimeType: 'image/png', data: region.toString('base64') });
            }
          } else {
            result.push({ pageNumber: source.pageNumber, sourcePage: source.sourcePage, mimeType: 'image/png', data: bytes.toString('base64') });
          }
        } finally { document.destroy(); }
      }
      return result;
    } finally { library.destroy(); }
  });
  renderQueue = work.catch(() => {});
  return work;
}
