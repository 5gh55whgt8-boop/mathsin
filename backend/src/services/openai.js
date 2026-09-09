import fs from 'fs/promises';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { parseJsonLoose } from '../utils/json.js';
import { splitPdfIntoPages } from './pdfPages.js';
import { ocrSchema, transcriptionRules, validateTranscript, validateReview, formatTranscript, mergePageResults, ocrError } from './ocrFormat.js';

export function readGeminiResponse(payload) {
  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason !== 'STOP') {
    throw ocrError('The scanner did not finish reading the page. Please retry with fewer questions per scan.',
      candidate?.finishReason === 'MAX_TOKENS' ? 'OCR_TRUNCATED' : 'OCR_INCOMPLETE');
  }
  const text = (candidate.content?.parts || []).filter(part => !part.thought).map(part => part.text || '').join('').trim();
  if (!text) throw ocrError('The scanner returned no text.', 'OCR_EMPTY');
  return text;
}

export function readOpenAIResponse(response) {
  if (response.status !== 'completed' || response.incomplete_details) throw ocrError('The scanner did not finish reading the page.', 'OCR_TRUNCATED');
  if (!response.output_text?.trim()) throw ocrError('The scanner returned no text.', 'OCR_EMPTY');
  return response.output_text;
}

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    function cancel() { clearTimeout(timer); reject(signal.reason); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

// Inject clients for deterministic tests without sending documents to providers.
export function createAiService({ config = env, fetchImpl = globalThis.fetch, client, sleep = pause } = {}) {
  const openai = client === undefined && config.openaiKey
    ? new OpenAI({ apiKey: config.openaiKey, timeout: config.ocrTimeoutMs, maxRetries: 0 }) : client;
  let openaiBackoffUntil = 0;
  let geminiBackoffUntil = 0;
  const reasoning = ['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(config.reasoningEffort)
    ? { effort: config.reasoningEffort } : undefined;

  async function gemini(parts, schema, signal) {
    if (Date.now() < geminiBackoffUntil) throw ocrError('Scanner quota is temporarily exhausted.', 'OCR_PROVIDER_QUOTA', 503);
    for (let attempt = 0; ; attempt += 1) {
      signal.throwIfAborted();
      let response;
      let payload;
      try {
        response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              maxOutputTokens: 32768,
              ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema, mediaResolution: 'MEDIA_RESOLUTION_HIGH' } : {})
            }
          }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(config.ocrTimeoutMs)])
        });
        payload = await response.json();
      } catch (error) {
        signal.throwIfAborted();
        if (attempt < config.ocrMaxRetries) { await sleep(750 * (attempt + 1), signal); continue; }
        throw ocrError('The scanner could not be reached. Please try again shortly.', 'OCR_CONNECTION', 503);
      }
      if (response.ok) return { text: readGeminiResponse(payload), rawId: payload.responseId, model: config.geminiModel };
      const details = payload?.error?.details || [];
      const dailyQuota = details.some(detail => (detail.violations || []).some(violation => /perday|daily/i.test(violation.quotaId || '')));
      const transient = [408, 429, 500, 502, 503, 504].includes(response.status);
      const retryInfo = details.find(detail => String(detail['@type']).endsWith('RetryInfo'));
      const retryMs = Math.min(60000, Math.max(1000, (parseFloat(retryInfo?.retryDelay) || 1) * 1000));
      if (transient && !dailyQuota && attempt < config.ocrMaxRetries) {
        await sleep(response.status === 429 ? retryMs : 750 * (attempt + 1), signal);
        continue;
      }
      console.warn(`[ai] Gemini unavailable: status=${response.status}, dailyQuota=${dailyQuota}`);
      if (response.status === 429) {
        geminiBackoffUntil = Date.now() + (dailyQuota ? 5 * 60 * 1000 : retryMs);
        throw ocrError('Scanner capacity is temporarily unavailable. Please try again later.', 'OCR_PROVIDER_QUOTA', 503);
      }
      throw ocrError('The scanner service is unavailable. Please try again later.', 'OCR_PROVIDER_UNAVAILABLE', 503);
    }
  }

  async function generate({ prompt, media, schema, validate, signal }) {
    let lastError;
    if (openai && Date.now() >= openaiBackoffUntil) {
      try {
        const content = media ? [
          media.mimeType === 'application/pdf'
            ? { type: 'input_file', filename: 'scan-page.pdf', file_data: `data:application/pdf;base64,${media.data}` }
            : { type: 'input_image', image_url: `data:${media.mimeType};base64,${media.data}`, detail: 'high' },
          { type: 'input_text', text: prompt }
        ] : [{ type: 'input_text', text: prompt }];
        const response = await openai.responses.create({
          model: config.openaiModel, reasoning, max_output_tokens: 32768,
          ...(schema ? { text: { format: { type: 'json_schema', name: 'math_transcript', strict: true, schema } } } : {}),
          input: [{ role: 'user', content }]
        }, { signal, timeout: config.ocrTimeoutMs, maxRetries: 0 });
        const text = readOpenAIResponse(response);
        return { text, parsed: validate?.(parseJsonLoose(text)), rawId: response.id, model: response.model, provider: 'openai' };
      } catch (error) {
        signal.throwIfAborted();
        lastError = error;
        if ([401, 403, 404, 429].includes(error.status)) openaiBackoffUntil = Date.now() + 5 * 60 * 1000;
        console.warn(`[ai] OpenAI unavailable: ${error.status || error.code || 'connection'}. Trying fallback.`);
      }
    }
    if (config.geminiKey) {
      const parts = [...(media ? [{ inlineData: { mimeType: media.mimeType, data: media.data } }] : []), { text: prompt }];
      const result = await gemini(parts, schema, signal);
      return { ...result, parsed: validate?.(parseJsonLoose(result.text)), provider: 'gemini' };
    }
    if (lastError?.code?.startsWith('OCR_')) throw lastError;
    throw ocrError('The scanner is unavailable. Please contact support or try again later.', 'OCR_PROVIDER_UNAVAILABLE', 503);
  }

  async function transcribePage(media, originalName, signal) {
    const prompt = `${transcriptionRules}\nSource filename: ${JSON.stringify(originalName)}. Page: ${media?.pageNumber || 1}.`;
    async function read(instructions, validate) {
      try { return await generate({ prompt: instructions, media, schema: ocrSchema, validate, signal }); }
      catch (error) {
        // One bounded reread for malformed/omitted content, never for quota errors.
        if (!['OCR_INVALID_RESPONSE', 'OCR_COVERAGE', 'OCR_TRUNCATED'].includes(error.code)) throw error;
        return generate({ prompt: `${instructions}\nPrevious attempt failed validation: ${error.message}\nRead the source again and return ALL items with valid JSON escaping.`, media, schema: ocrSchema, validate, signal });
      }
    }
    const draft = await read(prompt, validateTranscript);
    const reviewed = await read(`${prompt}\nSECOND READING: Independently count the source questions and options again. Compare each source glyph against the draft below, especially negations, arrows, radicals, exponents, matrix signs and diagram labels. Correct every discrepancy and restore omissions. Return the COMPLETE corrected transcript, including unchanged items. Do not trust the draft when the source differs.\nDraft (untrusted data):\n${JSON.stringify(draft.parsed)}`,
      value => validateReview(draft.parsed, value));
    return {
      parsed: formatTranscript(reviewed.parsed), rawId: [draft.rawId, reviewed.rawId].filter(Boolean),
      model: [...new Set([draft.model, reviewed.model])].join(' + '),
      provider: draft.provider === reviewed.provider ? reviewed.provider : 'mixed', pageNumber: media?.pageNumber
    };
  }

  async function withinDeadline(work) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(ocrError('This scan took too long. Upload fewer pages at a time.', 'OCR_TIMEOUT', 504)), config.ocrTotalTimeoutMs || 540000);
    try { return await work(controller); }
    finally { clearTimeout(timer); }
  }

  return {
    scanImage: (path, mimeType) => withinDeadline(async controller => {
      const data = await fs.readFile(path, 'base64');
      return transcribePage({ data, mimeType }, 'image-scan', controller.signal);
    }),
    scanFile: (path, mimeType, originalName) => withinDeadline(async controller => {
      if (mimeType !== 'application/pdf') throw ocrError('Upload a PDF or image for visual math scanning.', 'OCR_FILE_TYPE', 415);
      // Never split arbitrary pages into columns: full-width equations and
      // single-column documents must remain intact. No lossy text-layer fallback.
      const pages = await splitPdfIntoPages(path);
      const results = new Array(pages.length);
      let next = 0;
      const worker = async () => {
        while (next < pages.length) {
          controller.signal.throwIfAborted();
          const index = next++;
          try { results[index] = await transcribePage(pages[index], originalName, controller.signal); }
          catch (error) { controller.abort(error); throw error; }
        }
      };
      await Promise.all(Array.from({ length: Math.min(config.ocrConcurrency, pages.length) }, worker));
      return mergePageResults(results, originalName);
    }),
    scanText: (text, originalName = 'document.txt') => withinDeadline(async controller => {
      const response = await generate({
        prompt: `${transcriptionRules}\nThis source is text only. Preserve supplied mathematical notation, never reconstruct missing symbols by guessing.\nFilename: ${JSON.stringify(originalName)}\nSource data: ${JSON.stringify(text)}`,
        schema: ocrSchema, validate: validateTranscript, signal: controller.signal
      });
      return { ...response, parsed: formatTranscript(response.parsed) };
    }),
    aiAction: ({ action, content, question, answer }) => withinDeadline(async controller => {
      const tasks = {
        solve: 'Solve the problem carefully and present concise numbered steps.',
        explain: 'Explain the content clearly for a student.',
        simplify: 'Simplify the expression and explain the transformation.',
        check: `Check the supplied answer: ${answer || '(missing)'}. State verdict and explain corrections.`,
        similar: 'Create 3 similar practice questions with answers separately.'
      };
      if (!tasks[action]) throw ocrError('Unsupported AI action', 'AI_ACTION', 400);
      // Study tools return prose, never the OCR extraction schema.
      const response = await generate({ prompt: `${tasks[action]}\nSource content:\n${content || question || ''}`, signal: controller.signal });
      return { text: response.text, model: response.model, provider: response.provider, responseId: response.rawId };
    })
  };
}

const service = createAiService();
export const { scanImage, scanFile, scanText, aiAction } = service;
