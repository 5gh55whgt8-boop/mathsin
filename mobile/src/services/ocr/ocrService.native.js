import { processImageTextRecognition } from 'react-native-vision-camera-mlkit';

/**
 * Lightweight advisory heuristic to check if text contains math-like notation.
 * NOTE: This is strictly a UI advisory heuristic. It does NOT guarantee that ML Kit
 * or any OCR engine parsed complex mathematical formulas, spatial fractions,
 * or LaTeX notation correctly.
 */
export function containsMathLikeText(text) {
  if (!text || typeof text !== 'string') return false;
  const mathPattern = /[\^=+\-*/÷×±≠≈≤≥∫∑√∂πθλαβγ]|(?:\b(?:sqrt|sin|cos|tan|log|lim|dx|dy)\b)|[a-zA-Z]\s*[\^][0-9a-zA-Z]/i;
  return mathPattern.test(text);
}

/**
 * Normalizes ML Kit TextRecognitionResult into a stable, consistent schema.
 */
export function normalizeOcrResult(rawResult) {
  const text = (rawResult?.text || '').trim();
  const rawBlocks = Array.isArray(rawResult?.blocks) ? rawResult.blocks : [];

  const blocks = rawBlocks.map((b, bIdx) => ({
    id: `block-${bIdx}`,
    text: b.text || '',
    type: 'text',
    lines: Array.isArray(b.lines) ? b.lines.map(l => l.text || '').filter(Boolean) : [],
    languages: Array.isArray(b.languages) ? b.languages : [],
  }));

  const lines = [];
  for (const b of rawBlocks) {
    if (Array.isArray(b.lines)) {
      for (const l of b.lines) {
        if (l.text) lines.push(l.text);
      }
    }
  }

  return {
    text,
    blocks,
    lines,
    source: 'mlkit',
    local: true,
  };
}

/**
 * Recognizes text from a local image file URI using on-device Google ML Kit.
 * Does NOT call Gemini, OpenAI, or any backend endpoint.
 *
 * @param {string} imageUri Local image file path or file:// URI
 * @param {object} options Optional ML Kit configuration
 * @returns {Promise<{ text: string, blocks: Array, lines: Array, source: string, local: boolean }>}
 */
export async function recognizeImage(imageUri, options = {}) {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('Invalid image file: No URI provided for OCR.');
  }

  console.log('[OCR] Starting local ML Kit recognition');

  try {
    const rawResult = await processImageTextRecognition(imageUri, {
      language: options.language || 'LATIN',
      invertColors: Boolean(options.invertColors),
    });

    const normalized = normalizeOcrResult(rawResult);

    if (!normalized.text) {
      console.log('[OCR] No text detected');
      throw new Error('No readable text was found in this image.');
    }

    console.log(`[OCR] Completed: ${normalized.blocks.length} blocks, ${normalized.lines.length} lines`);
    return normalized;
  } catch (error) {
    // If it's already our friendly message, rethrow it
    if (error.message === 'No readable text was found in this image.') {
      throw error;
    }

    console.error('[OCR] Local text recognition error:', error?.message || error);

    // Provide user-friendly, non-leaking error messages
    const msg = error?.message || '';
    if (/not found|does not exist|ENOENT/i.test(msg)) {
      throw new Error('Image file could not be read from device storage.');
    }
    if (/unsupported|decode/i.test(msg)) {
      throw new Error('Unsupported image format. Please capture a clear JPG or PNG.');
    }
    if (/native module|nitro/i.test(msg)) {
      throw new Error('Native OCR module is initializing or unavailable. Please build and run via Expo development build.');
    }

    throw new Error('Could not recognize text from this image. Please try another shot.');
  }
}
