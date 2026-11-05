import fs from 'fs/promises';
import path from 'path';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const mimeByExtension = {
  '.pdf': 'application/pdf',
  '.docx': DOCX_MIME,
  '.txt': 'text/plain',
};

function mimeFromSignature(bytes, originalName) {
  if (bytes.length >= 5 && bytes.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    return path.extname(String(originalName || '')).toLowerCase() === '.docx' ? DOCX_MIME : '';
  }
  return '';
}

export async function detectDocumentMimeType(filePath, suppliedMimeType = '', originalName = '') {
  let bytes = Buffer.alloc(0);
  try {
    const handle = await fs.open(filePath, 'r');
    try {
      bytes = Buffer.alloc(16);
      const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
      bytes = bytes.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    bytes = Buffer.alloc(0);
  }

  const detected = mimeFromSignature(bytes, originalName);
  if (detected) return detected;

  const supplied = String(suppliedMimeType || '').toLowerCase();
  if (Object.values(mimeByExtension).includes(supplied)) return supplied;
  return mimeByExtension[path.extname(String(originalName || '')).toLowerCase()] || '';
}
