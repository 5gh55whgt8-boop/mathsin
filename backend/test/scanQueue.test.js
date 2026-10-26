import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobView, retryDelay, retryable } from '../src/services/scanQueue.js';

test('job API exposes progress but never source files or checkpoint content', () => {
  const view = jobView({ _id: 'id', completed: new Map([['0', { private: 'text' }]]), source: 'private-file', hash: 'hash', total: 3 });
  assert.equal(view.completed, 1);
  assert.equal(view.total, 3);
  assert.equal(view.source, undefined);
  assert.equal(view.hash, undefined);
});
test('retry backoff is bounded; quota/network errors retry but bad PDFs do not', () => {
  assert.equal(retryDelay(1), 60000);
  assert.equal(retryDelay(50), 3600000);
  for (const code of ['OCR_PROVIDER_QUOTA', 'OCR_CONNECTION', 'OCR_TIMEOUT']) assert.equal(retryable({ code }), true);
  for (const code of ['OCR_INVALID_PDF', 'SUBSCRIPTION_REQUIRED', 'OCR_JOB_EXPIRED']) assert.equal(retryable({ code }), false);
});
