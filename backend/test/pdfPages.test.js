import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { degrees, PDFDocument, PDFName } from 'pdf-lib';
import { splitPdfIntoPages, splitPdfPageIntoColumns } from '../src/services/pdfPages.js';

async function fixture(t, configure) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-pdf-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const document = await PDFDocument.create();
  await configure(document);
  const file = path.join(dir, 'source.pdf');
  await fs.writeFile(file, await document.save({ useObjectStreams: false, addDefaultPage: false }));
  return file;
}

async function readPage(input) {
  const document = await PDFDocument.load(Buffer.from(input.data, 'base64'));
  assert.equal(document.getPageCount(), 1);
  return document.getPage(0);
}

test('default retains full source pages, their crop coordinates, and page order', async t => {
  const file = await fixture(t, document => {
    const first = document.addPage([640, 840]);
    first.setCropBox(20, 30, 580, 760);
    first.drawText('Full width question: p -> q; both left and right options');
    document.addPage([400, 700]);
  });
  const result = await splitPdfIntoPages(file);
  assert.deepEqual(result.map(page => [page.sourcePage, page.pageNumber]), [[1, '1-full'], [2, '2-full']]);
  const first = await readPage(result[0]);
  assert.deepEqual(first.getMediaBox(), { x: 0, y: 0, width: 640, height: 840 });
  assert.deepEqual(first.getCropBox(), { x: 20, y: 30, width: 580, height: 760 });
  assert.ok(first.node.Contents(), 'original content streams remain embedded');
});

test('selected columns cover both original outer edges and overlap at the gutter', async t => {
  const file = await fixture(t, document => {
    const page = document.addPage([800, 1000]);
    page.setMediaBox(10, 20, 800, 1000);
    page.setCropBox(40, 60, 700, 900);
  });
  const [full] = await splitPdfIntoPages(file);
  const columns = await splitPdfPageIntoColumns(full);
  assert.deepEqual(columns.map(page => page.pageNumber), ['1-left', '1-right']);
  const left = await readPage(columns[0]);
  const right = await readPage(columns[1]);
  assert.deepEqual(left.getCropBox(), { x: 40, y: 60, width: 360.5, height: 900 });
  assert.deepEqual(right.getCropBox(), { x: 379.5, y: 60, width: 360.5, height: 900 });
  assert.equal(right.getCropBox().x + right.getCropBox().width, 740, 'right edge is not clipped');
  assert.deepEqual(left.getCropBox(), left.getMediaBox());
  assert.deepEqual(right.getCropBox(), right.getMediaBox());
});

test('crops never expand outside the visible media rectangle', async t => {
  const file = await fixture(t, document => {
    const page = document.addPage([600, 800]);
    page.setCropBox(-20, -30, 660, 880);
  });
  const columns = await splitPdfIntoPages(file, 2);
  const left = (await readPage(columns[0])).getCropBox();
  const right = (await readPage(columns[1])).getCropBox();
  assert.deepEqual(left, { x: 0, y: 0, width: 309, height: 800 });
  assert.deepEqual(right, { x: 291, y: 0, width: 309, height: 800 });
});

test('rotated pages remain whole even when columns are requested', async t => {
  const file = await fixture(t, document => document.addPage([600, 800]).setRotation(degrees(90)));
  const result = await splitPdfIntoPages(file, 2);
  assert.equal(result.length, 1);
  assert.equal(result[0].pageNumber, '1-full');
  const page = await readPage(result[0]);
  assert.equal(page.getRotation().angle, 90);
  assert.deepEqual(page.getCropBox(), { x: 0, y: 0, width: 600, height: 800 });
});

test('page limit is a typed client error, not a fallback to a huge model request', async t => {
  const file = await fixture(t, document => {
    for (let index = 0; index < 13; index += 1) document.addPage();
  });
  await assert.rejects(splitPdfIntoPages(file), { code: 'OCR_PAGE_LIMIT', status: 413 });
});

test('malformed, empty, and encrypted PDFs report actionable client errors', async t => {
  const empty = await fixture(t, () => {});
  await assert.rejects(splitPdfIntoPages(empty), { code: 'OCR_EMPTY_PDF', status: 400 });
  const malformed = path.join(path.dirname(empty), 'malformed.pdf');
  await fs.writeFile(malformed, 'not a PDF');
  await assert.rejects(splitPdfIntoPages(malformed), { code: 'OCR_INVALID_PDF', status: 400 });
  const encrypted = await fixture(t, document => {
    document.addPage();
    document.context.trailerInfo.Encrypt = document.context.register(document.context.obj({ Filter: PDFName.of('Standard') }));
  });
  await assert.rejects(splitPdfIntoPages(encrypted), { code: 'OCR_ENCRYPTED_PDF', status: 400 });
});
