import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { errorResponse } from '../src/middleware/errors.js';

const source = await fs.readFile(new URL('../../mobile/src/api/scanError.js', import.meta.url), 'utf8');
const { scanErrorMessage } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('provider quota survives HTTP boundary without becoming a subscription limit', () => {
  const res = { status(status) { this.statusCode = status; return this; }, json(body) { this.body = body; return this; } };
  errorResponse({ code: 'OCR_PROVIDER_QUOTA', status: 503, message: 'Provider quota' }, {}, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'OCR_PROVIDER_QUOTA');
  assert.equal(scanErrorMessage({ response: { status: 503, data: res.body } }).title, 'Scanner provider is busy');
});
test('subscription, provider outage and uncertain network completion have distinct guidance', () => {
  assert.equal(scanErrorMessage({ response: { status: 402 } }).title, 'Free trial finished');
  assert.equal(scanErrorMessage({ response: { data: { code: 'OCR_CONNECTION' } } }).title, 'Scanner temporarily unavailable');
  const message = scanErrorMessage({ code: 'ECONNABORTED' }).message;
  assert.match(message, /History/);
  assert.doesNotMatch(message, /not used a free scan/);
});
