export function parseJsonLoose(text) {
  if (!text) throw new Error('Empty AI response');
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/,'').trim();
  try { return JSON.parse(trimmed); } catch {}
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error('AI response was not valid JSON');
}
