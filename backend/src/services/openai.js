import fs from 'fs/promises';
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

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    function cancel() { clearTimeout(timer); reject(signal.reason); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

function responseHeader(response, name) {
  if (typeof response.headers?.get === 'function') return response.headers.get(name);
  return response.headers?.[name] || response.headers?.[name.toLowerCase()];
}

function retryAfterMs(response) {
  const value = responseHeader(response, 'retry-after');
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
}

// Inject clients for deterministic tests without sending documents to providers.
export function createAiService({ config = env, fetchImpl = globalThis.fetch, client, sleep = pause } = {}) {
  const keys = [...new Set((config.geminiKeys || (config.geminiKey ? [config.geminiKey] : []))
    .flatMap(value => String(value || '').split(/[,\r\n;]+/)).map(value => value.trim()).filter(Boolean))];
  const models = [...new Set((config.geminiModels || (config.geminiModel ? [config.geminiModel] : []))
    .flatMap(value => String(value || '').split(/[,\r\n;]+/))
    .map(value => value.trim().replace(/^models\//i, ''))
    .filter(Boolean))];
  const unavailableUntil = new Map();
  const keyState = new Map(keys.map(key => [key, { unavailableUntil: 0, inFlight: 0 }]));

  function shuffled(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function candidateOrder() {
    const now = Date.now();
    const availableKeys = shuffled(keys.filter(key => (keyState.get(key)?.unavailableUntil || 0) <= now))
      .sort((left, right) => (
        (keyState.get(left)?.inFlight || 0) - (keyState.get(right)?.inFlight || 0)
      ));
    return availableKeys.flatMap(key => shuffled(models).map(model => ({ key, model })));
  }

  function reserveCandidate(candidate) {
    const state = keyState.get(candidate.key);
    const candidateId = `${candidate.key}:${candidate.model}`;
    const now = Date.now();
    if (!state || state.unavailableUntil > now || (unavailableUntil.get(candidateId) || 0) > now) return null;
    const hasIdleKey = keys.some(key => {
      const other = keyState.get(key);
      return other && other.inFlight === 0 && other.unavailableUntil <= now;
    });
    if (hasIdleKey && state.inFlight > 0) return null;
    state.inFlight += 1;
    return state;
  }

  function markKeyUnavailable(key, durationMs) {
    const state = keyState.get(key);
    if (state) state.unavailableUntil = Math.max(state.unavailableUntil, Date.now() + durationMs);
  }

  async function gemini(parts, schema, signal, candidate) {
    const candidateId = `${candidate.key}:${candidate.model}`;
    if (Date.now() < (unavailableUntil.get(candidateId) || 0)) {
      throw ocrError('Scanner quota is temporarily exhausted.', 'OCR_PROVIDER_QUOTA', 503);
    }
    for (let attempt = 0; ; attempt += 1) {
      signal.throwIfAborted();
      let response;
      let payload;
      try {
        response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate.model)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': candidate.key },
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
      if (response.ok) return { text: readGeminiResponse(payload), rawId: payload.responseId, model: candidate.model };

      console.error('[ai] Gemini provider error:', JSON.stringify({
        status: response.status,
        model: candidate.model,
        error: payload?.error || payload
      }));

      const details = payload?.error?.details || [];
      const dailyQuota = details.some(detail => (detail.violations || []).some(violation => /perday|daily/i.test(violation.quotaId || '')));
      const transient = [408, 429, 500, 502, 503, 504].includes(response.status);
      const retryInfo = details.find(detail => String(detail['@type']).endsWith('RetryInfo'));
      const providerRetryMs = (parseFloat(retryInfo?.retryDelay) || 0) * 1000;
      const retryMs = Math.min(60000, Math.max(1000, retryAfterMs(response), providerRetryMs));
      if (transient && response.status !== 429 && !dailyQuota && attempt < config.ocrMaxRetries) {
        const exponentialMs = Math.min(60000, 500 * (2 ** attempt));
        await sleep(Math.max(exponentialMs, retryMs), signal);
        continue;
      }
      console.warn(`[ai] Gemini unavailable: status=${response.status}, dailyQuota=${dailyQuota}`);
      if (response.status === 429) {
        const cooldownMs = dailyQuota ? Math.max(5 * 60 * 1000, retryMs) : retryMs;
        unavailableUntil.set(candidateId, Date.now() + cooldownMs);
        markKeyUnavailable(candidate.key, cooldownMs);
        throw ocrError('Scanner capacity is temporarily unavailable. Please try again later.', 'OCR_PROVIDER_QUOTA', 503, {
          providerStatus: response.status
        });
      }
      if ([400, 401, 403].includes(response.status)) {
        const cooldownMs = response.status === 400 ? 60 * 60 * 1000 : 15 * 60 * 1000;
        unavailableUntil.set(candidateId, Date.now() + cooldownMs);
        if ([401, 403].includes(response.status)) markKeyUnavailable(candidate.key, cooldownMs);
      }
      throw ocrError('The scanner service is unavailable. Please try again later.', 'OCR_PROVIDER_UNAVAILABLE', 503, {
        providerStatus: response.status
      });
    }
  }

  async function generate({ prompt, media, schema, validate, signal }) {
    let lastError;
    for (const candidate of candidateOrder()) {
      // Claim the key immediately before the first await. This prevents
      // concurrent scans from selecting the same least-busy key.
      const state = reserveCandidate(candidate);
      if (!state) continue;
      try {
        const parts = [...(media ? [{ inlineData: { mimeType: media.mimeType, data: media.data } }] : []), { text: prompt }];
        const result = await gemini(parts, schema, signal, candidate);
        return { ...result, parsed: validate?.(parseJsonLoose(result.text)), provider: 'gemini' };
      } catch (error) {
        signal.throwIfAborted();
        lastError = error;
        if (['OCR_INVALID_RESPONSE', 'OCR_COVERAGE', 'OCR_TRUNCATED', 'OCR_EMPTY'].includes(error.code) && error.providerStatus === undefined) {
          throw error;
        }
        console.warn(`[ai] Gemini candidate unavailable: model=${candidate.model}, code=${error.code || 'CONNECTION'}, status=${error.status || 'n/a'}, providerStatus=${error.providerStatus || 'n/a'}, message=${error.message || 'unknown'}. Trying another candidate.`);
      } finally {
        state.inFlight -= 1;
      }
    }
    if (!lastError && keys.length) throw ocrError('Scanner capacity is temporarily unavailable. Please try again later.', 'OCR_PROVIDER_QUOTA', 503);
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
    try {
      const draft = await read(prompt, validateTranscript);
      const reviewed = await read(`${prompt}\nSECOND READING: Independently count the source questions and options again. Compare each source glyph against the draft below, especially negations, arrows, radicals, exponents, matrix signs and diagram labels. Correct every discrepancy and restore omissions. Return the COMPLETE corrected transcript, including unchanged items. Do not trust the draft when the source differs.\nDraft (untrusted data):\n${JSON.stringify(draft.parsed)}`,
        value => validateReview(draft.parsed, value));
      return {
        parsed: formatTranscript(reviewed.parsed), rawId: [draft.rawId, reviewed.rawId].filter(Boolean),
        model: [...new Set([draft.model, reviewed.model])].join(' + '),
        provider: draft.provider === reviewed.provider ? reviewed.provider : 'mixed', pageNumber: media?.pageNumber
      };
    } catch (error) {
      const canUsePlainFallback = [
        'OCR_INVALID_RESPONSE', 'OCR_COVERAGE', 'OCR_TRUNCATED', 'OCR_EMPTY'
      ].includes(error.code) || (
        error.code === 'OCR_PROVIDER_UNAVAILABLE' &&
        [502, 503, 504].includes(error.providerStatus)
      );
      if (!canUsePlainFallback) throw error;

      const plain = await generate({
        prompt: `Extract every readable character from this image in source order.
Return plain text only. Do not return JSON, Markdown, LaTeX delimiters, commentary, solutions, or guesses.
Preserve mathematical symbols as readable Unicode where possible. Keep line breaks and question/option order.
If a character is genuinely unreadable, write [illegible].
Source filename: ${JSON.stringify(originalName)}.`,
        media, signal
      });
      const text = plain.text.trim();
      if (!text) throw ocrError('No readable content was found. Try a clearer scan.', 'OCR_EMPTY', 422);
      const parsed = formatTranscript({
        title: originalName || 'Image scan',
        inventory: [],
        items: [{ kind: 'text', number: '', text, latex: '', options: [] }],
        warnings: ['Plain-text OCR fallback was used; verify mathematical formatting against the image.']
      });
      return { parsed, rawId: plain.rawId, model: plain.model, provider: plain.provider, pageNumber: media?.pageNumber };
    }
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
    scanImages: (files = []) => withinDeadline(async controller => {
      if (!files.length) throw ocrError('No images provided for scanning.', 'OCR_EMPTY', 400);
      if (files.length === 1) {
        const data = await fs.readFile(files[0].path, 'base64');
        return transcribePage({ data, mimeType: files[0].mimetype, pageNumber: 1 }, files[0].originalname || 'image-scan', controller.signal);
      }
      const results = new Array(files.length);
      let next = 0;
      const worker = async () => {
        while (next < files.length) {
          controller.signal.throwIfAborted();
          const index = next++;
          try {
            const data = await fs.readFile(files[index].path, 'base64');
            results[index] = await transcribePage({ data, mimeType: files[index].mimetype, pageNumber: index + 1 }, files[index].originalname || `page-${index + 1}`, controller.signal);
          } catch (error) {
            controller.abort(error);
            throw error;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(config.ocrConcurrency || 2, files.length) }, worker));
      return mergePageResults(results, files[0].originalname || 'multi-page-scan');
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
      const formattingRules = String.raw`Use the exact mathematical symbols from the source whenever possible:
∑ ∫ √ ∞ ≤ ≥ ≠ ≈ ± × ÷ − → ⇔ ∈ ∉ ⊂ ∩ ∪ ∀ ∃ α β γ δ ε θ λ μ π.
Do not replace them with ASCII spellings such as SUM, INT, sqrt, <=, >=, !=, or ->.
Format the response as readable Markdown: use **bold** for key results, *italics* for emphasis,
headings and numbered lists where helpful. Keep equations on their own lines and preserve
subscripts, superscripts, fractions, matrices, brackets, and absolute-value bars exactly.
Never use Markdown markers inside an equation.`;
      // Study tools return prose, never the OCR extraction schema.
      const response = await generate({ prompt: `${tasks[action]}\n${formattingRules}\nSource content:\n${content || question || ''}`, signal: controller.signal });
      return { text: response.text, model: response.model, provider: response.provider, responseId: response.rawId };
    })
  };
}

const service = createAiService();
export const { scanImage, scanImages, scanFile, scanText, aiAction } = service;
