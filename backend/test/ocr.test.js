import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { parseJsonLoose } from '../src/utils/json.js';
import { formatTranscript, validateTranscript, validateReview, mergePageResults } from '../src/services/ocrFormat.js';
import { createAiService, readGeminiResponse, readOpenAIResponse } from '../src/services/openai.js';

function transcript(number = '11') {
  return {
    title: 'Mathematical logic',
    inventory: [{ number, optionLabels: ['(A)', '(B)', '(C)', '(D)'] }],
    items: [{ kind: 'text', number: '', text: 'Choose the correct option.', latex: '', options: [] }, {
      kind: 'question', number, text: '~[(~p ∧ q) → ~p] ≡', latex: String.raw`\sim[(\sim p\land q)\to\sim p]\equiv`,
      options: ['p ∨ (~p ∧ q)', 'p ∧ (~p ∧ q)', 'p ∧ (p ∨ ~q)', 'p ∨ (p ∧ ~q)'].map((text, i) => ({ label: `(${String.fromCharCode(65 + i)})`, text, latex: '' }))
    }], warnings: []
  };
}
const config = { geminiKey: 'test-only', geminiModel: 'test-model', ocrTimeoutMs: 10000, ocrMaxRetries: 0, ocrConcurrency: 2, ocrTotalTimeoutMs: 10000 };
const reply = (value, finishReason = 'STOP') => ({ ok: true, status: 200, json: async () => ({
  responseId: 'fixture', candidates: [{ finishReason, content: { parts: [{ text: typeof value === 'string' ? value : JSON.stringify(value) }] } }]
}) });

test('literal logic symbols, all options and source order survive public formats', () => {
  const value = transcript();
  const result = formatTranscript(value);
  assert.ok(result.plainText.startsWith('Choose the correct option.\n\n11. ~[(~p ∧ q) → ~p] ≡'));
  assert.ok(result.plainText.includes('(D) p ∨ (p ∧ ~q)'));
  assert.equal(result.markdown, result.plainText);
  assert.equal(result.questions[0].answer, '');
  assert.equal(result.questions[0].options.length, 4);
  assert.ok(result.latex.includes(String.raw`\land`));
});

test('strict JSON rejects truncation, trailing junk and silently damaged LaTeX', () => {
  assert.throws(() => parseJsonLoose('{"items":[{"text":"partial"}'), { code: 'OCR_INVALID_RESPONSE' });
  assert.throws(() => parseJsonLoose('{"items":[]} junk'), { code: 'OCR_INVALID_RESPONSE' });
  assert.deepEqual(parseJsonLoose('```json\n{"latex":"\\\\frac{1}{2}"}\n```'), { latex: String.raw`\frac{1}{2}` });
  const damaged = transcript();
  damaged.items[1].latex = '\frac{1}{2}'; // JS form-feed: exactly the JSON escape corruption to catch.
  assert.throws(() => validateTranscript(damaged), { code: 'OCR_INVALID_RESPONSE' });
});

test('provider completion is required even when truncated response happens to be valid JSON', () => {
  assert.throws(() => readGeminiResponse({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }), { code: 'OCR_TRUNCATED' });
  assert.throws(() => readOpenAIResponse({ status: 'incomplete', output_text: '{}' }), { code: 'OCR_TRUNCATED' });
  assert.equal(readGeminiResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private reasoning' }, { text: '{"ok":true}' }] } }] }), '{"ok":true}');
});

test('question inventory rejects a dropped question, option or reordered label', () => {
  const missing = transcript();
  missing.items.pop();
  assert.throws(() => validateTranscript(missing), { code: 'OCR_COVERAGE' });
  const missingOption = transcript();
  missingOption.items[1].options.pop();
  assert.throws(() => validateTranscript(missingOption), { code: 'OCR_COVERAGE' });
  const swapped = transcript();
  swapped.items[1].options.reverse();
  assert.throws(() => validateTranscript(swapped), { code: 'OCR_COVERAGE' });
});

test('raw Markdown/LaTeX in readable text cannot be accepted as a faithful scan', () => {
  for (const text of [String.raw`$\underline{\quad}$`, '### $p$: Ram is rich', String.raw`\frac{1}{2}`]) {
    const value = transcript();
    value.items[1].options[0].text = text;
    assert.throws(() => validateTranscript(value), { code: 'OCR_INVALID_RESPONSE' });
  }
});

test('literal currency in a word problem is not mistaken for LaTeX delimiters', () => {
  const value = transcript();
  value.items[1].text = 'An item costs $5 and another costs $10. Find the total.';
  assert.ok(formatTranscript(value).plainText.includes('$5 and another costs $10'));
});

test('verification cannot lose previously detected questions/options', () => {
  const reviewed = transcript();
  reviewed.items.pop();
  reviewed.inventory = [];
  assert.throws(() => validateReview(transcript(), reviewed), { code: 'OCR_COVERAGE' });
});

test('matrices, scope, labels and diagram caveats remain editable text', () => {
  const value = transcript();
  value.items.push({ kind: 'equation', number: '', text: 'A = [[−p/2, 0], [0, 1/q]]; √((x(x+y+z))/(yz)); a₂₁A₂₁', latex: String.raw`A=\begin{bmatrix}-p/2&0\\0&1/q\end{bmatrix}`, options: [] });
  value.items[1].options[0].text = '[Diagram description: S′₁ in series with parallel S′₂ / S₁ / S₃]';
  const result = formatTranscript(value);
  assert.ok(result.plainText.includes('a₂₁A₂₁'));
  assert.ok(result.plainText.includes('√((x(x+y+z))/(yz))'));
  assert.ok(result.warnings.some(warning => warning.includes('Diagrams')));
  assert.equal(result.blocks.at(-1).type, 'equation');
});

test('page merge keeps every page in source order without repeating transcript formats', () => {
  const pages = ['1', '2', '3'].map(number => ({ parsed: formatTranscript(transcript(number)), provider: 'gemini', model: 'test', rawId: [number] }));
  const merged = mergePageResults(pages, 'source.pdf');
  assert.deepEqual(merged.parsed.questions.map(q => q.number), ['1', '2', '3']);
  assert.equal(merged.parsed.plainText.split('Choose the correct option.').length - 1, 3);
  assert.deepEqual(merged.rawId, ['1', '2', '3']);
});

test('study tools use prose generation without the OCR schema', async () => {
  let body;
  const service = createAiService({ config, fetchImpl: async (url, request) => { body = JSON.parse(request.body); return reply('1. Subtract 2 from both sides.'); } });
  const result = await service.aiAction({ action: 'solve', content: 'x + 2 = 5' });
  assert.equal(result.text, '1. Subtract 2 from both sides.');
  assert.equal(body.generationConfig.responseJsonSchema, undefined);
  assert.equal(body.generationConfig.responseMimeType, undefined);
});

test('daily quota errors fail promptly, avoid retries and expose no provider credentials', async () => {
  let calls = 0;
  const service = createAiService({ config: { ...config, ocrMaxRetries: 3 }, fetchImpl: async () => {
    calls++;
    return { ok: false, status: 429, json: async () => ({ error: { message: 'sensitive provider details', details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } }) };
  }, sleep: async () => { assert.fail('Daily quota must not be retried'); } });
  await assert.rejects(service.scanText('x=1'), { code: 'OCR_PROVIDER_QUOTA', status: 503 });
  await assert.rejects(service.scanText('x=1'), { code: 'OCR_PROVIDER_QUOTA', status: 503 });
  assert.equal(calls, 1);
});

test('visual scan performs a second source reading before returning corrected text', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-ocr-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'fixture.png');
  await fs.writeFile(source, Buffer.from('fixture-image'));
  const requests = [];
  const service = createAiService({ config, fetchImpl: async (url, request) => {
    const body = JSON.parse(request.body);
    requests.push(body);
    const value = transcript();
    if (requests.length === 1) value.items[1].text = '~[(~p ∨ q) → ~p] ≡';
    return reply(value);
  } });
  const result = await service.scanImage(source, 'image/png');
  assert.equal(requests.length, 2);
  assert.equal(result.parsed.questions[0].question, '~[(~p ∧ q) → ~p] ≡');
  assert.ok(requests[1].contents[0].parts.at(-1).text.includes('SECOND READING'));
  assert.equal(requests[1].contents[0].parts[0].inlineData.data, requests[0].contents[0].parts[0].inlineData.data);
  assert.equal(requests[0].generationConfig.mediaResolution, 'MEDIA_RESOLUTION_HIGH');
});

test('a failed PDF page stops queued pages and never returns a partial scan', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlens-ocr-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const document = await PDFDocument.create();
  for (let i = 0; i < 3; i++) document.addPage();
  const source = path.join(directory, 'fixture.pdf');
  await fs.writeFile(source, await document.save());
  let calls = 0;
  const service = createAiService({ config: { ...config, ocrConcurrency: 1 }, fetchImpl: async () => {
    calls++;
    return { ok: false, status: 403, json: async () => ({ error: { message: 'blocked' } }) };
  } });
  await assert.rejects(service.scanFile(source, 'application/pdf', 'fixture.pdf'), { code: 'OCR_PROVIDER_UNAVAILABLE' });
  assert.equal(calls, 1);
});

test('OpenAI uses strict schema and its completed result has the same public format', async () => {
  let request;
  const client = { responses: { create: async body => {
    request = body;
    return { status: 'completed', incomplete_details: null, output_text: JSON.stringify(transcript()), model: 'fixture-openai', id: 'id' };
  } } };
  const service = createAiService({ config: { ...config, openaiModel: 'fixture-openai' }, client,
    fetchImpl: async () => { assert.fail('Completed valid response must not fall back'); } });
  const result = await service.scanText('~[(~p ∧ q) → ~p] ≡');
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.equal(result.provider, 'openai');
  assert.equal(result.parsed.questions.length, 1);
});

test('incomplete OpenAI output falls back rather than saving a partial transcript', async () => {
  let fallbacks = 0;
  const service = createAiService({ config, client: { responses: { create: async () => ({
    status: 'incomplete', output_text: JSON.stringify(transcript()), incomplete_details: { reason: 'max_output_tokens' }
  }) } }, fetchImpl: async () => { fallbacks++; return reply(transcript()); } });
  const result = await service.scanText('source');
  assert.equal(fallbacks, 1);
  assert.equal(result.provider, 'gemini');
});

test('overall deadline aborts an in-flight provider request', async () => {
  const service = createAiService({ config: { ...config, ocrTotalTimeoutMs: 20 }, fetchImpl: (url, request) => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true });
  }) });
  await assert.rejects(service.scanText('source'), { code: 'OCR_TIMEOUT', status: 504 });
});
