# MathLens AI — Phase 1 to Phase 4 v5

A production-oriented Mathpix-style scanner stack built as a monorepo:

- `mobile/` — Expo SDK 57 React Native app
- `backend/` — Node.js + Express + MongoDB API
- `web/` — React + Vite browser workspace

## Included phases

### Phase 1
- Email/password authentication
- Camera/gallery image scan
- AI OCR for mixed text + mathematics
- LaTeX / Markdown / plain text output
- Copy/share-ready result payload
- Scan history

### Phase 2
- PDF/document upload endpoint
- Handwritten/printed math recognition prompt
- Table/equation/document structure extraction
- Editable result storage
- Tags, favorites and workspace organization

### Phase 3
- AI solve / explain / simplify / answer-check actions
- Question extraction schema for MCQs
- Structured JSON for question-paper workflows
- Confidence/warnings fields

### Phase 4
- Cloud MongoDB sync
- Mobile + web workspace
- Usage counters and plan scaffolding
- Admin role and user-plan endpoint
- Export endpoints (PDF, DOCX, Markdown, LaTeX, TXT, JSON and printable HTML)
- API health/preflight tooling

## Important security note

The supplied `.env` is included because it was explicitly requested. It is ignored by Git. Rotate any API/database credentials that were pasted into a chat before deploying publicly.

## Requirements

- Node.js 22.13+ (Expo SDK 57)
- MongoDB Atlas access
- OpenAI API key for OCR/vision and AI actions

## Run backend

```bash
cd backend
npm install
npm run dev
```

Backend: `http://localhost:5000`

### Math OCR verification

PDFs are scanned one original-resolution page at a time (up to 12 pages per upload).
Each visual page gets a transcription and a second source-image review. The server
checks the source question/option inventory and rejects incomplete JSON or truncated
provider responses before saving the scan or counting usage. Text and Markdown are
assembled from the same ordered transcription; mathematical LaTeX is kept separately.
Unreadable symbols are marked `[illegible]`, and diagrams use labeled text descriptions.
These checks reduce omissions; they do not guarantee perfect recognition of every source.

`OCR_TIMEOUT_MS` defaults to 90000 per provider request, `OCR_TOTAL_TIMEOUT_MS` to
540000 for a scan, `OCR_MAX_RETRIES` to 2, and `OCR_CONCURRENCY` to 2 pages. The mobile
scan upload allows 600000 ms; other API calls retain their normal timeout. Provider
credits/quota must be available. Daily quota errors stop without repeated retries.

Run offline regression checks from `backend/` with `npm test`. To explicitly run the
live 40-question source regression (uses provider quota):

```powershell
node scripts/check-mathsinn.mjs "C:\path\to\mathsinn.pdf"
```

The live script saves recognized text under the ignored `tmp/` directory and checks
question numbers 1–40 and four options per question. Inspect its formula samples
against the original PDF as well; matching question counts alone is not a fidelity test.
An optional third argument selects a Gemini model for a one-off comparison without
changing the app configuration. Existing damaged scans need to be scanned again.

## Run mobile

```bash
cd mobile
npm install
npx expo install --fix
npm start
```

If testing on a real phone, edit `mobile/.env` and set `EXPO_PUBLIC_API_URL` to your computer LAN IP, e.g. `http://192.168.1.5:5000/api`.

## Run web

```bash
cd web
npm install
npm run dev
```

## Seed admin

The backend automatically ensures the configured admin account exists on startup.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/scans/image`
- `POST /api/scans/document`
- `GET /api/scans`
- `GET /api/scans/:id`
- `PATCH /api/scans/:id`
- `DELETE /api/scans/:id`
- `POST /api/ai/action`
- `GET /api/exports/:scanId/:format` — pdf/docx/md/tex/txt/json/html
- `GET /api/workspace/stats`
- `PATCH /api/workspace/plan/:userId` (admin)

## OCR provider behavior

OpenAI is primary. The service uses the Responses API with image/file inputs and requests strict JSON output in the prompt. Gemini environment variables are retained as a future fallback hook, but no Gemini-specific SDK is required to run the project.

## APK / Android preview

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

## AI provider fallback
The backend now tries OpenAI first and automatically falls back to Gemini when OpenAI is unavailable (including quota/credit errors). Configure `GEMINI_API_KEY` and `GEMINI_OCR_MODEL` in `backend/.env`. The selected provider/model is saved on each scan.

## v4.1 — AI Photo Export
- New image scans preserve the original uploaded photo on the backend.
- Result screen includes **Export PDF** and **Export Word**.
- PDF/Word exports contain only AI-extracted selectable/editable text and equations; the original photo is not embedded.
- PDF/DOCX exports include the original photo, AI-recognized content, provider/model details, and LaTeX when available.
- Web downloads directly; Android/iOS uses the native share sheet.
- Existing scans made before v4.1 may export AI text only because their original image was not retained by older builds.
