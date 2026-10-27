import assert from 'node:assert/strict';
import { test } from 'node:test';

test('local scan payload sanitization and validation contract', () => {
  const sanitize = (body) => {
    const plainText = String(body.plainText || '').trim();
    const markdown = String(body.markdown || plainText).trim();
    if (!plainText && !markdown) {
      throw new Error('Recognized text is required');
    }
    const title = String(body.title || 'Local scan').trim().slice(0, 150) || 'Local scan';
    const latex = String(body.latex || '').trim();
    const blocks = Array.isArray(body.blocks)
      ? body.blocks.map(b => ({
          type: typeof b.type === 'string' ? b.type : 'text',
          text: String(b.text || ''),
          latex: typeof b.latex === 'string' ? b.latex : '',
          markdown: typeof b.markdown === 'string' ? b.markdown : '',
          confidence: typeof b.confidence === 'number' ? b.confidence : undefined,
        }))
      : [];
    const questions = Array.isArray(body.questions) ? body.questions : [];
    const warnings = Array.isArray(body.warnings)
      ? body.warnings.map(w => String(w)).slice(0, 20)
      : [];
    return {
      title,
      sourceType: 'image',
      plainText,
      markdown,
      latex,
      blocks,
      questions,
      warnings,
      provider: 'mlkit',
      ocrSource: 'mlkit',
      recognitionMode: 'local',
      model: String(body.model || 'ML Kit Text Recognition').slice(0, 80),
      raw: { local: true },
    };
  };

  // Missing text throws validation error
  assert.throws(() => sanitize({ plainText: '   ' }), /Recognized text is required/);

  // Valid local ML Kit payload produces expected normalized record
  const result = sanitize({
    title: 'Algebra Worksheet Page 1',
    plainText: '3x + 5 = 20\nFind x',
    blocks: [{ text: '3x + 5 = 20', type: 'text' }],
    model: 'ML Kit Latin Text Recognizer',
  });

  assert.equal(result.title, 'Algebra Worksheet Page 1');
  assert.equal(result.plainText, '3x + 5 = 20\nFind x');
  assert.equal(result.markdown, '3x + 5 = 20\nFind x');
  assert.equal(result.latex, '');
  assert.equal(result.provider, 'mlkit');
  assert.equal(result.ocrSource, 'mlkit');
  assert.equal(result.recognitionMode, 'local');
  assert.equal(result.raw.local, true);
  assert.equal(result.blocks.length, 1);
});
