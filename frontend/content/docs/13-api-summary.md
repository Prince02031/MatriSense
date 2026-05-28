# API Summary

The MatriSense backend exposes REST endpoints grouped by product workflow. Exact route names can vary by branch, so this page should reflect the current implementation rather than overclaim future endpoints.

### Authentication Endpoints
*   `POST /api/auth/register` — Register a mother, health worker, or admin-supported user depending on role rules.
*   `POST /api/auth/login` — Login and receive an auth token.
*   `GET /api/auth/me` — Fetch the current authenticated user.

### Patient & Profile Endpoints
*   `GET /api/patients/me` — Fetch the logged-in mother’s profile where implemented.
*   `POST /api/patients` — Create a patient profile.
*   `PUT /api/patients/:id` — Update profile fields.
*   `GET /api/patients/:id` — Fetch a patient profile where permitted.
*   Document upload endpoints may be present for optional identity, birth certificate, prescriptions, reports, or worker certification files.

### Triage Process Endpoints
*   `POST /api/triage/start` — Start a triage session and store profile/location snapshot if available.
*   `POST /api/triage/:sessionId/extract` — Extract structured symptoms from Bangla input.
*   `POST /api/triage/:sessionId/confirm` — Save confirmed symptoms.
*   `GET /api/triage/:sessionId/follow-up` — Fetch approved follow-up questions.
*   `POST /api/triage/:sessionId/answers` — Save follow-up answers.
*   `POST /api/triage/:sessionId/run` — Build case state, run rules, retrieve RAG guidance, and save decision.
*   `POST /api/triage/:sessionId/explain` — Generate or refresh Bangla explanation where implemented.
*   `GET /api/triage/:sessionId/result` — Fetch the final patient result.

### Health Worker Endpoints
*   `GET /api/worker/cases` — List triage cases for worker review.
*   `GET /api/worker/cases/:sessionId` — Fetch case detail.
*   `PUT /api/worker/cases/:sessionId/status` — Update case status.
*   `GET /api/worker/cases/:sessionId/audit` — Fetch audit timeline if implemented.

### Referral Notes Endpoints
*   `POST /api/referral-notes` — Add referral or follow-up note.
*   `GET /api/referral-notes/:sessionId` — Fetch notes for a case.

### Hospital Database Endpoints
*   `GET /api/hospitals` — Fetch seeded hospitals with filters if regional referral is enabled.
*   `GET /api/hospitals/nearby` — Fetch same-district or nearby hospitals.
*   `POST /api/hospitals/seed-demo` — Seed demo hospitals.
*   `PUT /api/worker/cases/:sessionId/hospital` — Assign or reassign a hospital if enabled.

### Speech Endpoints
*   `POST /api/speech/transcribe` — Convert Bangla voice input to text where voice support is enabled.

### Documentation & Live Stats Endpoints
*   `GET /api/docs/status` — Check public docs visibility and schedule.
*   `GET /api/docs/stats` — Fetch live documentation metrics.
*   `GET /api/docs/content` — Fetch Markdown-backed docs sections if enabled.
*   `GET /api/docs/evidence` — Fetch evidence library metadata if enabled.
*   `GET /api/docs/evidence-file/:fileName` — Safely serve evidence PDF/MD files if enabled.
*   `PUT /api/docs/admin/status` or `PUT /api/admin/docs/status` — Update docs visibility and schedule using the route implemented in the current branch.
