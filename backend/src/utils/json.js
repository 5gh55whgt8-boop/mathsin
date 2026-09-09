export function parseJsonLoose(text) {
  // Never repair truncated JSON: that can silently discard whole questions.
  const trimmed = String(text || '').trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, '$1').trim();
  try {
    const value = JSON.parse(trimmed);
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error('The scan response was incomplete or invalid. Please retry the scan.'), {
      code: 'OCR_INVALID_RESPONSE', status: 502
    });
  }
}
