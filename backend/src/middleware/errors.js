// Keep provider failures distinct from the user's subscription allowance.
export function errorResponse(err, req, res, next) {
  console.error('[api]', err.code || 'INTERNAL_ERROR', err.status || 500);
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Upload a smaller file.', code: 'LIMIT_FILE_SIZE' });
  }
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500;
  const code = /^(OCR_|AI_)/.test(err.code || '') ? err.code : 'REQUEST_FAILED';
  return res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message || 'Request failed', code });
}
