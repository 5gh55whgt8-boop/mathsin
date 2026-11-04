import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectImageMimeType } from '../src/services/imageFormat.js';

test('camera uploads use the file signature when Android omits image metadata', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-image-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'upload');
  await fs.writeFile(file, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]));

  assert.equal(await detectImageMimeType(file, 'application/octet-stream', 'upload'), 'image/jpeg');
});

test('image MIME metadata is normalized when the signature is unavailable', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-image-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'upload.png');
  await fs.writeFile(file, Buffer.from('not-an-image'));

  assert.equal(await detectImageMimeType(file, 'image/jpg', 'upload.png'), 'image/jpeg');
});
