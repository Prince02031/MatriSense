# API Summary

The MatriSense backend exposes REST endpoints organized by domain. All request and response bodies use JSON.

### Authentication Endpoints
*   `POST /api/auth/register` — Patient or health worker registration.
*   `POST /api/auth/login` — Login credentials verification; returns JWT security token.
*   `POST /api/auth/logout` — Invalidate user token and clear session.

### Patient & Profile Endpoints
*   `GET /api/patients/:id` — Fetch detailed profile information of a patient.
*   `PUT /api/patients/:id` — Modify profile fields (age, address, contact, location).
*   `GET /api/patients/:id/history` — Fetch complete triage history sessions for the patient.
*   `POST /api/documents/upload` — Upload verification files (NID card, medical receipts, certificates).

### Triage Process Endpoints
*   `POST /api/triage/start` — Initialize a new triage assessment session.
*   `POST /api/triage/submit-symptoms` — Submit raw Bangla symptom text to extract codes.
*   `POST /api/triage/confirm` — Lock and confirm extracted symptom codes.
*   `POST /api/triage/follow-up` — Submit follow-up answers to additional risk questions.
*   `GET /api/triage/:sessionId` — Fetch triage status, risk level, and RAG guidance outputs.

### Health Worker Endpoints
*   `GET /api/worker/cases` — List active community cases filtered by worker's coverage area.
*   `GET /api/worker/cases/:sessionId` — Fetch detailed case data, symptom explanation, and map.
*   `PUT /api/worker/cases/:sessionId` — Update active case status (e.g., in-progress, closed).
*   `POST /api/worker/cases/:sessionId/assign-hospital` — Select and link a referral hospital.

### Referral Notes Endpoints
*   `POST /api/referral-notes` — Generate a digital referral notification for a mother.
*   `GET /api/referral-notes/:caseId` — Fetch referral status and notes for a specific case.

### Hospital Database Endpoints
*   `GET /api/hospitals/list` — Fetch seeded hospitals with district or upazila filters.
*   `GET /api/hospitals/nearby` — Get sorted hospitals nearby using patient GPS.
*   `POST /api/hospitals/seed-demo` — Seed demo clinics and hospitals in regional sectors.

### Documentation & Live Stats Endpoints
*   `GET /api/docs/status` — Get public status and schedule availability window of docs.
*   `GET /api/docs/stats` — Fetch live, aggregated system operational metrics.
*   `GET /api/docs/content` — Get Markdown content sections from repo-root files.
*   `GET /api/docs/evidence` — Fetch evidence library catalog metadata.
*   `GET /api/docs/evidence-file/:fileName` — Safely serve source PDF/MD files.
*   `PUT /api/docs/admin/status` — Modify visibility toggle and dates (Admin only).
