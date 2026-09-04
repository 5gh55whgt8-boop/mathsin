import fs from 'fs/promises';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { parseJsonLoose } from '../utils/json.js';

const openaiClient = env.openaiKey ? new OpenAI({ apiKey: env.openaiKey }) : null;

const schemaPrompt = `You are a precision OCR and mathematical document parser.
Return ONLY valid JSON with this shape:
{
  "title": "short descriptive title",
  "plainText": "faithful readable transcription",
  "latex": "LaTeX for all mathematical content, preserving document order",
  "markdown": "Markdown reconstruction mixing text and LaTeX",
  "blocks": [{"type":"text|equation|table|question|diagram|unknown","text":"","latex":"","markdown":"","confidence":0.0}],
  "questions": [{"number":"1","question":"","options":["A","B","C","D"],"answer":null,"latex":""}],
  "warnings": []
}
Rules: preserve symbols, superscripts, subscripts, roots, matrices, integrals, limits, fractions and option labels. Do not solve unless an answer is explicitly printed in the source. For handwriting, transcribe uncertainty into warnings instead of inventing. For tables, preserve rows/columns in markdown.`;

function reasoning() {
  const allowed = new Set(['none','low','medium','high','xhigh','max']);
  return allowed.has(env.reasoningEffort) ? { effort: env.reasoningEffort } : undefined;
}

function geminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p?.text || '').join('\n').trim();
}

async function geminiGenerate(parts) {
  if (!env.geminiKey) throw new Error('GEMINI_API_KEY is not configured');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.geminiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = payload?.error?.message || `Gemini API error ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }
  const text = geminiText(payload);
  if (!text) throw new Error('Gemini returned an empty response');
  return { text, rawId: payload?.responseId || null, model: env.geminiModel };
}

async function withFallback(openaiFn, geminiFn) {
  let openaiError = null;
  if (openaiClient) {
    try {
      return await openaiFn();
    } catch (e) {
      openaiError = e;
      console.warn(`[ai] OpenAI failed (${e?.status || e?.code || 'error'}): ${e?.message || e}. Falling back to Gemini.`);
    }
  }
  if (env.geminiKey) {
    try {
      return await geminiFn();
    } catch (geminiError) {
      const err = new Error(`AI providers unavailable. Gemini: ${geminiError.message}${openaiError ? ` | OpenAI: ${openaiError.message}` : ''}`);
      err.status = geminiError.status || openaiError?.status || 502;
      throw err;
    }
  }
  if (openaiError) throw openaiError;
  throw new Error('No AI provider configured. Add OPENAI_API_KEY or GEMINI_API_KEY.');
}

export async function scanImage(path, mimeType) {
  const b64 = await fs.readFile(path, { encoding: 'base64' });
  return withFallback(
    async () => {
      const response = await openaiClient.responses.create({
        model: env.openaiModel,
        reasoning: reasoning(),
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: schemaPrompt },
            { type: 'input_image', image_url: `data:${mimeType};base64,${b64}`, detail: 'high' }
          ]
        }]
      });
      return { parsed: parseJsonLoose(response.output_text), rawId: response.id, model: response.model };
    },
    async () => {
      const response = await geminiGenerate([
        { text: schemaPrompt },
        { inlineData: { mimeType, data: b64 } }
      ]);
      return { parsed: parseJsonLoose(response.text), rawId: response.rawId, model: response.model };
    }
  );
}

export async function scanFile(path, mimeType, originalName) {
  const b64 = await fs.readFile(path, { encoding: 'base64' });
  return withFallback(
    async () => {
      const response = await openaiClient.responses.create({
        model: env.openaiModel,
        reasoning: reasoning(),
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: `${schemaPrompt}\nParse the attached file named ${originalName}.` },
            { type: 'input_file', filename: originalName, file_data: `data:${mimeType};base64,${b64}` }
          ]
        }]
      });
      return { parsed: parseJsonLoose(response.output_text), rawId: response.id, model: response.model };
    },
    async () => {
      const response = await geminiGenerate([
        { text: `${schemaPrompt}\nParse the attached file named ${originalName}.` },
        { inlineData: { mimeType, data: b64 } }
      ]);
      return { parsed: parseJsonLoose(response.text), rawId: response.rawId, model: response.model };
    }
  );
}

export async function scanText(text, originalName = 'document.txt') {
  return withFallback(
    async () => {
      const response = await openaiClient.responses.create({
        model: env.openaiModel,
        reasoning: reasoning(),
        input: `${schemaPrompt}\nParse this document named ${originalName}:\n\n${text}`
      });
      return { parsed: parseJsonLoose(response.output_text), rawId: response.id, model: response.model };
    },
    async () => {
      const response = await geminiGenerate([{ text: `${schemaPrompt}\nParse this document named ${originalName}:\n\n${text}` }]);
      return { parsed: parseJsonLoose(response.text), rawId: response.rawId, model: response.model };
    }
  );
}

export async function aiAction({ action, content, question, answer }) {
  const tasks = {
    solve: 'Solve the problem carefully and present concise numbered steps.',
    explain: 'Explain the content clearly for a student, with math notation where useful.',
    simplify: 'Simplify the mathematical expression and explain the key transformation.',
    check: `Check the supplied answer for correctness. User answer: ${answer || '(missing)'}. State verdict and explain any correction without inventing missing source facts.`,
    similar: 'Create 3 similar practice questions at comparable difficulty and include answers separately.'
  };
  if (!tasks[action]) throw new Error('Unsupported AI action');
  const prompt = `${tasks[action]}\n\nSource content:\n${content || question || ''}`;
  return withFallback(
    async () => {
      const response = await openaiClient.responses.create({ model: env.openaiModel, reasoning: reasoning(), input: prompt });
      return { text: response.output_text, model: response.model, responseId: response.id };
    },
    async () => {
      const response = await geminiGenerate([{ text: prompt }]);
      return { text: response.text, model: response.model, responseId: response.rawId };
    }
  );
}
