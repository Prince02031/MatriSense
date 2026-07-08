# Medical Document Intelligence & Clinical Data — Feature Memo

**Branch:** vision-support · **Scope:** Patient + health-worker document intelligence · **Updated:** 2026-07-08

A shortlist of everything shipped in this feature slice — AI document reading, patient-confirmed corrections, unified clinical history with trends, and the health-worker view of it all — with exact steps to check each one yourself.

**13 features** in this slice · **5 verified end-to-end** · **8 built, need a manual pass**

Status key: **✓ verified** = confirmed working end-to-end. **◐ built** = compiles/runs clean in dev but hasn't had a full manual click-through yet.

---

## Patient-side (8 features)

Everything a patient sees under the sidebar's **Uploaded Documents** and **My Clinical Data** pages.

### 1. AI-assisted document reading — ✓ verified
A photo of a prescription, lab report, ultrasound, or BP card gets read by Gemini Vision, checked against deterministic pregnancy-safe thresholds, and merges any recognized risk factors into the patient's profile.

**How to check:** Documents → `+ Upload Document` → AI-Assisted tab → Take Photo / Choose from Gallery → Analyze Document. Confirm each extracted value shows a severity badge (✅ / ⚠️ / 🚨).

### 2. Review chat — confirm or correct a reading — ◐ built
A short, document-scoped chat lets the patient walk through what the AI found. Any correction is re-run through the same deterministic severity rules — never taken on the chat model's word alone.

**How to check:** After analyzing a document → `💬 Discuss & Confirm with Assistant` → correct a value (e.g. "actually my BP was 130/85") → `✓ Done discussing — Save` → check the value updated on Documents / My Clinical Data.

### 3. Manual document upload — ◐ built
For IDs, certificates, or old reports that don't need AI analysis. Moved out of the Profile page into the same upload flow as AI documents.

**How to check:** Documents → `+ Upload Document` → Manual Upload tab → pick type / title / file → Upload.

### 4. Uploaded Documents page — ✓ verified
One place listing every document a patient has ever uploaded — AI-read or manual — with extracted values and confirmation status.

**How to check:** Sidebar → `Uploaded Documents`.

### 5. View original file — ◐ built
A "View Document" button opens the original image or PDF in a new tab, streamed through the existing protected download endpoint.

**How to check:** Uploaded Documents → any card → `🩺 View Document`.

### 6. Manage & delete documents — ◐ built
A "Manage Documents" toggle reveals delete controls. Deleting a document can optionally cascade to delete the clinical data it produced — opt-in checkbox, off by default so history isn't lost by accident.

**How to check:** Uploaded Documents → `🗑️ Manage Documents` → Delete on a card → try the confirm dialog both with and without the "also delete clinical data" checkbox checked.

### 7. My Clinical Data — history & trends — ◐ built
Every clinical value ever recorded, grouped one card per parameter (e.g. Creatinine) showing the latest reading. Click a card for its full history plus a trend chart, points colored by severity.

**How to check:** Sidebar → `My Clinical Data` → click any card. Upload the same parameter on two different documents to see a two-point trend line.

### 8. Bangla (বাংলা) support — ◐ built
Uploaded Documents, Document Upload, and My Clinical Data are fully translated and switch instantly with the existing header language toggle.

**How to check:** Header language toggle → বাংলা → revisit the three pages above. Worth a native-speaker read-through.

---

## Health-worker-side (3 features)

Everything an assigned worker sees on a patient's case detail page.

### 9. Case detail page — tabbed layout — ◐ built
Replaced one long scrolling page with seven tabs: Overview, Triage Review, Documents, Clinical Data, Recommendations, Referral & Hospital, Notes & Audit. Status and checkup-date controls stay pinned in a sidebar across every tab.

**How to check:** Worker → Patient List → Review on any case → click through the tab bar.

### 10. Clinical Data tab (worker view) — ◐ built
The same grouped history and trend chart the patient sees, surfaced to the assigned worker — gated behind the patient's existing consent toggle.

**How to check:** Case detail → Clinical Data tab, on a patient who has both uploaded documents and granted consent. Toggle consent off on a test patient and confirm the tab shows "Consent Not Granted" instead of data.

### 11. Patient Documents panel — ✓ verified
Lists a patient's documents with a view link. Pre-existing feature, unchanged in behavior — just relocated into the new Documents tab.

**How to check:** Case detail → Documents tab.

---

## Data model & privacy (2 features)

### 12. ClinicalDataPoint model — ✓ verified
A new unified, timestamped record of every clinical value regardless of source — documents today, chat-derived facts planned later — each carrying severity, confirmation state, and a trace back to its source document.

**How to check:** Not directly visible in the UI — it's what powers My Clinical Data and the worker's Clinical Data tab. Confirmed writing correctly during document analysis.

### 13. Consent-gated visibility — ✓ verified
Every worker-facing view of documents or clinical data checks the patient's existing "share with health worker" consent flag. Nothing new is exposed beyond what that toggle already governed.

**How to check:** Patient Profile → toggle consent off for a test account → confirm both worker-side Documents and Clinical Data tabs show the consent-denied message instead of data.

---

## Not built yet (deferred by design)

- On-demand "scan my chat for health data" extraction, with per-entry patient confirmation before anything is saved.
- An MCP tool exposing the unified clinical data list to the AI assistant (and later, analytics).

---

Deeper technical detail (data model, endpoints, safety design) lives in `Feature_Medical_Document_Intelligence.md` at the repo root. "◐ built" items compile clean and ran without errors in dev, but haven't had a full manual click-through yet — flag anything odd.
