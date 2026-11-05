import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectDocumentMimeType } from '../src/services/documentFormat.js';

test('document MIME detection trusts a PDF signature over incorrect Android metadata', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-document-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'upload');
  await fs.writeFile(file, Buffer.from('%PDF-1.7\n'));

  assert.equal(await detectDocumentMimeType(file, 'image/jpeg', 'upload.pdf'), 'application/pdf');
});

test('document MIME detection falls back to a supported extension', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-document-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'notes.txt');
  await fs.writeFile(file, 'plain text');

  assert.equal(await detectDocumentMimeType(file, 'application/octet-stream', 'notes.txt'), 'text/plain');
});
