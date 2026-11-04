import fs from 'fs/promises';
import path from 'path';

const mimeByExtension = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
};

function mimeFromSignature(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'image/gif';
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return '';
}

export async function detectImageMimeType(filePath, suppliedMimeType = '', originalName = '') {
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
  const detected = mimeFromSignature(bytes);
  if (detected) return detected;

  const supplied = String(suppliedMimeType || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'].includes(supplied)) return supplied;

  return mimeByExtension[path.extname(String(originalName || '')).toLowerCase()] || '';
}
