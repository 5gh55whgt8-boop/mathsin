/**
 * Web fallback for OCR service.
 * In browser environments, native ML Kit is unavailable.
 */

export function containsMathLikeText(text) {
  if (!text || typeof text !== 'string') return false;
  const mathPattern = /[\^=+\-*/÷×±≠≈≤≥∫∑√∂πθλαβγ]|(?:\b(?:sqrt|sin|cos|tan|log|lim|dx|dy)\b)|[a-zA-Z]\s*[\^][0-9a-zA-Z]/i;
  return mathPattern.test(text);
}

export function normalizeOcrResult(rawResult) {
  const text = (rawResult?.text || '').trim();
  const rawBlocks = Array.isArray(rawResult?.blocks) ? rawResult.blocks : [];

  const blocks = rawBlocks.map((b, bIdx) => ({
    id: `block-${bIdx}`,
    text: b.text || '',
    type: 'text',
    lines: Array.isArray(b.lines) ? b.lines.map(l => (typeof l === 'string' ? l : l.text || '')).filter(Boolean) : [],
    languages: Array.isArray(b.languages) ? b.languages : [],
  }));

  const lines = [];
  for (const b of blocks) {
    for (const l of b.lines) {
      if (l) lines.push(l);
    }
  }

  return {
    text,
    blocks,
    lines,
    source: 'web-fallback',
    local: false,
  };
}

export async function recognizeImage(imageUri, options = {}) {
  console.log('[OCR] Web platform: Native ML Kit OCR is designed for on-device mobile (Android/iOS).');
  throw new Error('On-device ML Kit OCR runs locally on physical iOS and Android devices. For web, please use mobile dev build or document upload.');
}
