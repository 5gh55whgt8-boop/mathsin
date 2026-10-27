// Explicit live regression (uses the configured OCR providers; not part of npm test).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createAiService } from '../src/services/openai.js';
import { env } from '../src/config/env.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/check-mathsinn.mjs <path-to-mathsinn.pdf>');
const started = Date.now();
const service = createAiService({ config: process.argv[3] ? { ...env, openaiKey: undefined, geminiModel: process.argv[3] } : env });
try {
  const result = await service.scanFile(source, 'application/pdf', path.basename(source));
  const output = path.resolve('../tmp/ocr-mathsinn-result.json');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  const questions = result.parsed.questions;
  const numbers = questions.map(question => String(question.number).replace(/[.)]$/, ''));
  const expected = Array.from({ length: 40 }, (_, index) => String(index + 1));
  const complete = JSON.stringify(numbers) === JSON.stringify(expected) && questions.every(question => question.options.length === 4);
  console.log(JSON.stringify({ output, seconds: Math.round((Date.now() - started) / 1000), provider: result.provider,
    questionCount: questions.length, complete40With4Options: complete, numbers, warnings: result.parsed.warnings,
    samples: questions.filter(question => ['3', '11', '12', '17', '18', '20', '22', '29', '30', '35', '39'].includes(String(question.number)))
  }, null, 2));
  if (!complete) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ seconds: Math.round((Date.now() - started) / 1000), code: error.code, status: error.status, error: error.message }));
  process.exitCode = 1;
}
