# Medical Document Intelligence — Session Implementation Report

This document records everything built in this session for the **Multimodal Medical
Document Intelligence** feature (see [`Feature_Medical_Document_Intelligence.md`](../../Feature_Medical_Document_Intelligence.md)
for the original proposal). It covers what was built, why, how each piece works,
what was tested, and what's still open.

Work was done incrementally across three slices, matching the feature doc's phase
numbering:

- **Phase 1** — Backend core service + API route
- **Phase 3** — Frontend patient upload UI (wired to the real backend)
- **Phase 2** — MCP tool registration for the agentic assistant

Phases 4 (health-worker view) and 5 (broader test coverage) are **not started**.

---

## 1. The Feature, in One Paragraph

A pregnant mother photographs a paper medical document (prescription, lab report,
BP card). The photo is sent to Gemini Vision, which extracts structured values
(blood pressure, hemoglobin, blood sugar, etc.). The backend independently
re-checks each value against a hardcoded maternal-pregnancy danger threshold table
— it never trusts the AI's own severity judgment. Recognized risk factors
(hypertension, anemia, diabetes) are merged into the mother's patient profile,
where they become inputs to the existing deterministic triage rule engine.

---

## 2. Phase 1 — Backend Core Service

### 2.1 New file: `backend/src/services/documentAnalysisService.js`

This is the heart of the feature. It exports one main function, `analyzeDocument({ imageBuffer, mimeType })`.

**What it contains:**

| Piece | Purpose |
|---|---|
| `MATERNAL_THRESHOLDS` | Hardcoded WHO/ACOG pregnancy-specific danger thresholds for BP systolic/diastolic, hemoglobin, fasting blood sugar, platelet count. Each entry has a `warning` and `critical` cutoff (and a `direction` flag for values where *lower* is worse, e.g. hemoglobin). |
| `RESPONSE_SCHEMA` | A JSON schema passed to Gemini so it is forced to return structured, typed JSON (document type, extracted values array, medications, risk factors, summary in English and Bangla, raw OCR text). |
| `SYSTEM_INSTRUCTION` | The exact prompt from the feature doc, telling Gemini it's a maternal-health document analyzer, giving it the threshold table, and telling it to set `isReadable: false` on unreadable images. |
| `RISK_FACTOR_KEYWORD_MAP` | Maps free-text risk factor labels Gemini returns (e.g. `"Hypertension/Pre-eclampsia risk"`) onto the three boolean flags the rule engine actually understands: `hypertension`, `anemia`, `diabetes`. Uses **substring/keyword matching**, not exact match (see §2.3 — this was a bug found and fixed live). |
| `reclassifySeverity(parameter, value)` | **The safety-critical function.** Takes the raw numeric value Gemini extracted and independently recomputes NORMAL / WARNING / CRITICAL from `MATERNAL_THRESHOLDS` — overriding whatever severity Gemini itself claimed. This is what satisfies the feature doc's "Safety Boundaries" requirement: *"Extracted values feed into the existing rule engine — they don't bypass it."* |
| `normalizeExtractedValue(raw)` | Cleans up one extracted value: coerces to a number, applies `reclassifySeverity`, fills in defaults for missing fields, clamps confidence to [0,1]. |
| `normalizeAnalysisResult(raw)` | Cleans up the whole Gemini response into a predictable shape (defends against Gemini omitting fields or returning unexpected enum values). |
| `mapToKnownRiskFactorFlags(riskFactorsDetected)` | Runs each detected risk-factor string through `RISK_FACTOR_KEYWORD_MAP` to produce the `{ hypertension: true, anemia: true, ... }` object that gets merged into the patient profile. |

**Why it's structured this way:** the AI is treated as an *extraction* engine only.
Every number it reports gets re-graded by our own code. This means even if
Gemini said a BP of 150/95 was "normal" (hypothetically, a hallucination), our
threshold table would still correctly flag it WARNING — the AI cannot
downgrade or hide a dangerous reading.

### 2.2 Vision plumbing: two files edited

To send an image (not just text) to Gemini, two existing files in the app's
LLM abstraction layer were extended, keeping the same layering the rest of
the codebase already uses:

- **`backend/src/ai/providers/geminiProvider.js`** — added
  `generateJsonWithGeminiVision({ systemInstruction, userPrompt, responseSchema, temperature, imageBase64, mimeType })`.
  Nearly identical to the existing text-only `generateJsonWithGemini`, except
  the user turn's `parts` array includes an `inlineData: { mimeType, data: imageBase64 }`
  part alongside the text prompt — this is Gemini's multimodal input format.

- **`backend/src/ai/llmClient.js`** — added `generateJsonFromImage(...)`, the
  provider-agnostic entry point `documentAnalysisService.js` actually calls.
  It throws a clear error if `LLM_PROVIDER=local`, since the local Ollama
  provider has no vision path — **vision is Gemini-only for now**.

### 2.3 New API route: `POST /api/documents/analyze`

Added to the existing `backend/src/routes/document.routes.js` (this file
already had a `GET /:documentId/download` route with role-based access
control — the new route sits above it).

**Request:** `multipart/form-data`, JWT-authenticated, one field `file` (an image).

**What the handler does, step by step:**
1. Rejects any role other than `MOTHER` (403).
2. Looks up the caller's `Patient` profile (404 if none exists — a mother must
   have created her profile first via `POST /api/patients`).
3. Reads the uploaded file off disk (multer already saved it via the shared
   `handleUploadErrors('file')` middleware, reused as-is from the existing
   patient-document upload flow) and calls `analyzeDocument()`.
4. On analysis failure, returns `502` with a friendly "please retry with a
   clearer photo" message rather than a raw error.
5. Saves a new `UploadedDocument` record with the image metadata **and** the
   full analysis result in a new `documentAnalysis` field (see §2.4), plus an
   `analyzedAt` timestamp.
6. Merges any recognized risk factor flags straight into
   `Patient.knownRiskFactors` (`patient.markModified(...)` + save — required
   because Mongoose doesn't track mutations to `Mixed`-type fields
   automatically).
7. Audit-logs the action (`PATIENT_DOCUMENT_ANALYZED`).
8. Returns `{ success, documentId, analysis, riskFactorsApplied }`.

**Important architectural note:** risk factors are merged into the patient
profile **immediately at analyze time**, not gated behind a later "confirm"
step. The frontend's confirm button (see §4) is a UI acknowledgment only — by
the time the mother sees results on screen, they're already saved.

### 2.4 Model change: `backend/src/models/UploadedDocument.js`

Added two fields so the analysis result has somewhere to live permanently:
```js
documentAnalysis: { type: mongoose.Schema.Types.Mixed },
analyzedAt: { type: Date },
```

### 2.5 Live end-to-end testing (Phase 1)

Tested against the **real Gemini API**, not a mock:

1. Generated a synthetic lab-report image with Python PIL containing:
   `BP 150/95 mmHg`, `Hemoglobin 9.2 g/dL`, `Fasting Blood Sugar 92 mg/dL`.
2. Logged in as a test account via curl, created a `Patient` profile (the
   registration flow only creates a `User`, not a `Patient` — this profile
   step is required separately).
3. POSTed the image to `/api/documents/analyze`.

**Result confirmed:**
- Correct extraction of all three values.
- Correct **independent** severity reclassification: BP systolic 150 →
  `WARNING`, BP diastolic 95 → `WARNING`, hemoglobin 9.2 → `WARNING`, fasting
  blood sugar 92 → `NORMAL` — all matching the threshold table exactly,
  proving the safety double-check works regardless of what Gemini itself
  said.
- `riskFactorsDetected: ["Hypertension/Pre-eclampsia risk", "Anemia"]`.

**Bug found and fixed during this test:** the first version of
`RISK_FACTOR_KEY_MAP` only did **exact string matches** against clean
single-word labels like `"hypertension"`. Real Gemini output used descriptive
phrases like `"Hypertension/Pre-eclampsia risk"`, which don't exact-match
anything — so hypertension (the most clinically significant finding) was
silently dropped, and only `anemia` made it into `knownRiskFactorFlags`.

**Fix:** rewrote the map as a keyword-containment check
(`RISK_FACTOR_KEYWORD_MAP`, §2.1) — checks whether the lowercased label
*contains* `"hypertension"`, `"pre-eclampsia"`, `"anemia"`, `"diabetes"`, etc.,
rather than requiring an exact match. Re-ran the identical test after the fix:
`knownRiskFactorFlags: { "hypertension": true, "anemia": true }` — both risk
factors now correctly captured and merged into the patient profile.

---

## 3. LAN / Phone Testing Setup

Since this is described as "phone-heavy" (camera capture is central to the
UX), two environment changes were needed so a phone on the same Wi-Fi network
could reach the dev servers (a phone's `localhost` resolves to itself, not
the laptop):

- **`frontend/.env.local`** — `NEXT_PUBLIC_API_URL` changed from
  `http://localhost:5000` to the laptop's LAN IP (`http://10.138.253.150:5000`).
- **`backend/.env`** — `CLIENT_URL` extended to a comma-separated list
  including the LAN origin (`http://10.138.253.150:3007`), since
  `backend/src/index.js` builds its CORS allowlist from this variable.

Both dev servers were restarted (env var changes require a restart — Next.js
bakes `NEXT_PUBLIC_*` vars in at server start, and nodemon doesn't watch
`.env` files by default). Verified via curl: 200 responses on the LAN IP for
both servers, and a CORS preflight check confirming
`Access-Control-Allow-Origin: http://10.138.253.150:3007` was returned correctly.

---

## 4. Phase 3 — Frontend Patient Upload UI

### 4.1 Component: `frontend/app/components/dashboard/MedicalDocumentUpload.jsx`

Rendered once, on the patient dashboard: [`frontend/app/dashboard/patient/page.jsx`](../../frontend/app/dashboard/patient/page.jsx:290).
It is **not** present anywhere else — not on the profile page, not in the
triage flow, not on the health-worker side.

**State machine** (`stage`): `idle → preview → analyzing → result → confirmed`.

- **idle**: two buttons, "📷 Take Photo" (uses `capture="environment"` to open
  the phone's rear camera directly) and "🖼️ Choose from Gallery".
- **preview**: shows the selected image with "Analyze" / "Cancel" buttons.
- **analyzing**: shows a loading state while the real network call is in flight.
- **result**: shows the extracted values as color-coded cards (green/amber/red
  badges matching NORMAL/WARNING/CRITICAL), the AI's English + Bangla summary,
  and "Confirm & Save as Risk Factors" / "Upload Another" buttons.
- **confirmed**: shows which risk factor flags were actually applied to the
  profile.

This component was originally built **mocked** (a hardcoded fake result with
a 1.6s `setTimeout` to simulate latency) before the backend existed, then
rewired in this session to call the real endpoint.

### 4.2 What changed to wire it to the real backend

- **`frontend/app/api/patientApi.js`** — added `analyzeMedicalDocument(formData)`,
  a multipart `POST` to `/api/documents/analyze`, following the exact same
  pattern as the pre-existing `uploadPatientDocument` (no manual
  `Content-Type` header — the browser sets the multipart boundary itself).
- **`MedicalDocumentUpload.jsx`**:
  - Deleted the mock generator function entirely.
  - `handleAnalyze` now builds a `FormData`, calls `analyzeMedicalDocument`,
    and renders whatever the real Gemini Vision response contains.
  - The "🧪 Simulated result" disclaimer banner was replaced with a real one:
    *"AI-extracted from your photo — double check with your health worker."*
  - The confirmed-state message now reads the real `riskFactorsApplied` object
    returned by the backend (falls back to a generic "saved" message if no
    recognized flags were present), instead of a hardcoded mock list.

---

## 5. Phase 2 — MCP Tool Registration

### 5.1 Background: two separate "MCP" surfaces in this codebase

This took some investigation because there are **two different things** that
both need a new tool registered, and they're not connected to each other at
runtime:

1. **`backend/src/mcp/caseContext/server.js`** — an actual standalone
   `@modelcontextprotocol/sdk` server (stdio/SSE transport). This is a real
   deployable MCP server that an external MCP client (e.g. Claude Desktop)
   could connect to.
2. **`backend/src/careAssistant/careAssistantAgenticService.js`** — the code
   that actually powers the in-app "Guided Care Assistant" chat feature. It
   does **not** go through the MCP server at all — it hand-maintains its own
   separate `toolDeclarations` array (Gemini/OpenAI function-calling format)
   and directly `require()`s the same underlying service functions.

Both were updated so the new capability is usable from either surface.

### 5.2 New service function: `getDocumentAnalyses` in `caseContextService.js`

Added alongside the existing `case_get_*` functions (e.g.
`getTriageProfileContext`, `getRecentTriageHistory`), following their exact
conventions: takes `{ ...params, requester }`, hits Mongoose directly, checks
access via the existing `canAccessPatient` helper from `caseAccessPolicy.js`,
returns a plain object or `null` on denial/error (never throws, never leaks a
stack trace).

**What it does:** looks up already-analyzed `UploadedDocument` records — by a
specific `documentId`, or by `sessionId`/`patientId` (returning the most
recently analyzed documents in that scope, default limit 3). It does **not**
re-run Gemini Vision — it surfaces the `documentAnalysis` JSON that Phase 1's
`/analyze` endpoint already computed and stored.

**Access control detail worth noting:** the function resolves the *actual*
owning patient from the document record itself (`docs[0].ownerId`) and checks
access against that — not against any `patientId` the caller supplied. This
means a caller can't bypass access control by lying about whose patient ID
they're asking for; the real owner is what gets checked. **Verified live**
with a direct Node script: an unrelated `HEALTH_WORKER` requester (no
matching district/assignment) correctly got `null` back.

### 5.3 Registered in the real MCP server (`server.js`)

Added the `case_analyze_medical_document` tool:
- A Zod schema requiring at least one of `documentId` / `patientId` / `sessionId`.
- A `ListToolsRequestSchema` entry with its `inputSchema` and description.
- A `CallToolRequestSchema` dispatch branch calling `getDocumentAnalyses`.

Same shape as every other tool in this file — no new patterns introduced.

### 5.4 Wired into the live agentic assistant (`careAssistantAgenticService.js`)

- Added a matching tool declaration (Gemini function-calling format) so the
  LLM can decide to call it mid-conversation — e.g. when a health worker or
  mother asks *"what did her last lab report show?"*.
- Added the dispatch case in the tool-execution loop, forcing the *official*
  `patientId` already resolved from the session (never trusting a
  caller-supplied one, consistent with every other tool in this file).
- **Also fixed a pre-existing dead field**: `assembledContext.documentUploadSummary`
  was declared but always left as `null` — nothing ever populated it. Added
  the block that fills it in from the new tool's result (document type,
  analyzed-at timestamp, summary, extracted values, risk factors), so it
  actually reaches the final prompt sent to the LLM for its answer.

### 5.5 Verification

Ran the new `getDocumentAnalyses` function directly against the two real
documents created during Phase 1 testing:
- Correctly returned both documents' full analysis (most recent first).
- Correctly denied an unrelated health worker (returned `null`).

---

## 6. Files Touched This Session (Complete List)

**New files:**
- `backend/src/services/documentAnalysisService.js`

**Backend files edited:**
- `backend/src/models/UploadedDocument.js` — added `documentAnalysis`, `analyzedAt`
- `backend/src/routes/document.routes.js` — added `POST /analyze` route
- `backend/src/ai/providers/geminiProvider.js` — added `generateJsonWithGeminiVision`
- `backend/src/ai/llmClient.js` — added `generateJsonFromImage`
- `backend/src/mcp/caseContext/services/caseContextService.js` — added `getDocumentAnalyses`
- `backend/src/mcp/caseContext/server.js` — registered `case_analyze_medical_document`
- `backend/src/careAssistant/careAssistantAgenticService.js` — added tool declaration, dispatch, and `documentUploadSummary` population
- `backend/.env` — `CLIENT_URL` extended for LAN testing

**Frontend files edited:**
- `frontend/app/components/dashboard/MedicalDocumentUpload.jsx` — mock replaced with real API call
- `frontend/app/api/patientApi.js` — added `analyzeMedicalDocument`
- `frontend/app/dashboard/patient/page.jsx` — renders the component (done in an earlier slice, prior to this report's start)
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL` set to LAN IP for phone testing

---

## 7. What's Explicitly NOT Done Yet

Per the feature doc's 5-phase plan:

- **Phase 4 — Health worker view.** Nothing currently surfaces
  `documentAnalysis` on the worker side. The case-detail page
  (`[sessionId]/page.jsx`) has no "Uploaded Documents" section, no thumbnail
  display, no per-value Verify/Dismiss controls. This means the feature doc's
  "Safety Boundaries" line *"Health workers can verify, correct, or dismiss
  any extracted value"* is currently **unimplemented** — a worker has no UI
  to do this at all today.
- **Phase 5 — Broader test coverage.** Only one synthetic English
  typed lab-report image has been tested end-to-end. Not yet tested: a
  handwritten Bangla BP card, a prescription image, or a deliberately
  blurry/unreadable image (to confirm `isReadable: false` degrades
  gracefully rather than erroring).
- The frontend's "Confirm & Save as Risk Factors" button is now a pure UI
  acknowledgment (data is already saved server-side at analyze time) — this
  works correctly but is a UX nuance worth knowing about if you iterate on
  that screen further.
- `frontend/.env.local`'s LAN IP is hardcoded; if the laptop's IP changes
  (different Wi-Fi network), phone testing will silently break until it's
  updated again. Auto-detecting from `window.location.hostname` was
  suggested earlier as a future improvement but not implemented.

---

## 8. Quick Reference: How to Test Each Piece

**Backend only, via curl:**
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:5000/api/documents/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.jpg" | python3 -m json.tool
```

**Full UI flow:** log in as a mother on `/dashboard/patient`, use the
"📄 Upload Medical Document" card, take/choose a photo, tap Analyze.

**MCP tool, in isolation:**
```js
const { getDocumentAnalyses } = require('./src/mcp/caseContext/services/caseContextService');
await getDocumentAnalyses({ patientId: '<id>', requester: { role: 'INTERNAL' } });
```
