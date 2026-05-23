# MatriSense Regional Referral & Hospital Assignment: Agent Prompt Array

Use these prompts sequentially. Commit after each stable milestone.

## Prompt 1 — Inspect and Plan

```text
You are working on MatriSense.

Goal:
Inspect the current project and produce a short implementation plan for the Regional Referral & Hospital Assignment feature. Do not edit files yet.

Current status:
- Patient → triage → health worker flow works.
- Patient history exists.
- Worker case detail exists.
- Health worker status update exists.

Do not modify:
- backend/src/ai
- backend/src/rag
- backend/src/safety
- backend/src/triage/rules
- decisionBuilder
- AI extraction
- LLM explanation
- admin/dev triage lab

Inspect:
Backend:
- backend/src/models/User.js
- backend/src/models/Patient.js
- backend/src/models/TriageSession.js
- backend/src/models/AuditLog.js
- backend/src/routes/worker.routes.js
- backend/src/controllers/worker.controller.js
- backend/src/routes/triage.routes.js
- backend/src/services/auditService.js
- backend/src/index.js

Frontend:
- frontend/app/dashboard/patient/profile/page.jsx
- frontend/app/triage/start/page.jsx
- frontend/app/dashboard/worker/page.jsx
- frontend/app/dashboard/worker/[sessionId]/page.jsx
- frontend/app/api/workerApi.js
- frontend/app/api/patientApi.js
- frontend/app/api/triageApi.js

Output:
1. Existing relevant fields and endpoints.
2. Minimal files to change.
3. Implementation order.
4. Risks or conflicts.
```

## Prompt 2 — Add Optional Region, Location, and Assignment Fields

```text
You are working on MatriSense.

Goal:
Add optional region/location fields to Patient, User, and TriageSession models. Keep all changes backward compatible.

Add Patient fields:
- division
- district
- upazilaOrThana
- addressOrVillage
- latitude
- longitude
- locationSource: PROFILE | GPS | TRIAGE_INPUT

Add User fields for health workers:
- coverageDistricts: [String]
- coverageUpazilas: [String]
- canViewAllDistricts: Boolean

Add TriageSession profileSnapshot fields:
- name, age, phone
- trimester, gestationalWeek
- expectedDeliveryDate, lastCheckupDate
- knownRiskFactors
- emergencyContactName, emergencyContactPhone
- division, district, upazilaOrThana, addressOrVillage
- latitude, longitude, locationSource

Add TriageSession hospital assignment fields:
- assignedHospitalId
- assignedHospitalSnapshot
- assignedByWorkerId
- assignedAt
- hospitalAssignmentHistory

Rules:
- Do not make new fields required.
- Do not rename existing fields.
- Do not touch AI/RAG/rules/safety code.

After editing:
- List exact files changed.
- Explain why old sessions still work.
```

## Prompt 3 — Save Profile Snapshot on Triage Start

```text
You are working on MatriSense.

Goal:
Update POST /api/triage/start to save profile/location snapshot into TriageSession.

Behavior:
1. Accept optional patientId.
2. If patientId exists and Patient is found, copy profile/location fields into profileSnapshot.
3. If request body includes location/profile fields, merge them into profileSnapshot.
4. Do not automatically update permanent Patient profile from triage.
5. Triage must still work without location or patientId.
6. Keep existing caseState/rule behavior unchanged.

Do not modify AI extraction, rule engine, RAG, safety validator, or admin/dev lab.

After editing:
- List files changed.
- Explain snapshot creation.
- Explain behavior with no location.
```

## Prompt 4 — Add Hospital Model and Routes

```text
You are working on MatriSense.

Goal:
Add seeded hospital database and hospital lookup endpoints.

Create Hospital model with:
- name
- type
- division
- district
- upazilaOrThana
- address
- latitude
- longitude
- phone
- services: [String]
- isActive

Create and mount routes:
- GET /api/hospitals
- GET /api/hospitals/nearby
- POST /api/hospitals/seed-demo

GET /api/hospitals filters:
- district
- upazilaOrThana
- type
- service
- isActive

GET /nearby:
- If lat/lng exists, calculate approximate Haversine distance and sort nearest first.
- If no lat/lng, filter by district/upazila.
- Never crash if location is missing.

Seed 10–15 demo hospitals across a few Bangladesh districts.

Do not touch AI/RAG/rules/safety code.

After editing:
- List files changed.
- Explain seed command/endpoint.
- Explain nearby logic.
```

## Prompt 5 — Add Worker Region Filtering

```text
You are working on MatriSense.

Goal:
Filter worker cases by assigned districts and add district filter UI.

Backend:
Update GET /api/worker/cases.
- ADMIN sees all.
- canViewAllDistricts=true sees all.
- HEALTH_WORKER with coverageDistricts sees matching district cases.
- Support query params: district, riskLevel, status, assignedHospitalId.
- Resolve case district from profileSnapshot, populated Patient, or caseState.profile.
- Missing district must not crash; label as Unassigned region or include safely.

Frontend:
- Add district filter dropdown to worker dashboard.
- Show district/upazila on case card/row.
- Show assigned hospital if available.
- Preserve existing filters/navigation.

Do not touch AI/RAG/rules/safety code.

After editing:
- List files changed.
- Explain filtering logic.
- Explain missing-district behavior.
```

## Prompt 6 — Add Hospital Assignment Backend

```text
You are working on MatriSense.

Goal:
Add endpoint for worker to assign/reassign hospital to a triage case.

Endpoint:
PUT /api/worker/cases/:sessionId/hospital

Payload:
{
  hospitalId,
  reason
}

Behavior:
1. Authenticate health worker/admin.
2. Load triage session.
3. Load hospital.
4. Return 404 if missing.
5. Determine ASSIGNED or REASSIGNED.
6. Save assignedHospitalId, assignedHospitalSnapshot, assignedByWorkerId, assignedAt.
7. Append hospitalAssignmentHistory.
8. Create audit log entry using existing audit service if available.
9. Return updated case.

Rules:
- Do not automatically assign hospitals.
- Keep old sessions working.
- Do not create duplicate audit systems.
- Do not touch AI/RAG/rules/safety code.

After editing:
- List files changed.
- Explain assignment vs reassignment.
- Explain audit behavior.
```

## Prompt 7 — Add Worker Assignment UI

```text
You are working on MatriSense.

Goal:
Add Referral & Hospital Assignment panel to worker case detail.

Add API helpers if missing:
- getHospitals(filters)
- getNearbyHospitals(params)
- assignHospitalToCase(sessionId, payload)

Worker case detail panel should show:
- patient address
- district/upazila
- GPS coordinates if available
- current assigned hospital
- assignment history
- same-district/nearby hospitals
- assign/reassign button
- reason input

Behavior:
- Use lat/lng if available, otherwise district/upazila.
- If no location exists, show clear fallback.
- On assignment success, update UI and refresh audit timeline if present.
- Do not block case detail if hospitals fail to load.

After editing:
- List files changed.
- Explain assignment UI.
- Explain empty/error states.
```

## Prompt 8 — Update Patient Profile and Triage Location Payload

```text
You are working on MatriSense.

Goal:
Expose region/address fields on patient side and include them in triage start payload.

Patient profile form should support:
- division
- district
- upazilaOrThana
- addressOrVillage
- optional GPS button

Triage start should:
- load patient profile if available
- prefill trimester/gestationalWeek/location
- include patientId if available
- include profile/location snapshot in startTriage payload
- allow triage without profile/location
- not overwrite permanent profile from triage

GPS rules:
- Ask permission before using browser geolocation.
- If denied, continue with manual address.
- Do not request GPS automatically on page load.

Do not touch AI/RAG/rules/safety code.

After editing:
- List files changed.
- Explain patient location behavior.
```

## Prompt 9 — Optional Map

```text
You are working on MatriSense.

Goal:
Add simple Leaflet map to worker case detail if it can be done cleanly.

Rules:
- Map is optional.
- Hospital list assignment must remain primary.
- If Next.js SSR or package issues become time-consuming, skip map and leave TODO.

Map should show:
- patient marker if lat/lng exists
- hospital markers
- assigned hospital marker if possible

After editing:
- List files changed.
- Explain when map appears.
- Explain fallback when coordinates are missing.
```

## Prompt 10 — End-to-End Test Pass

```text
You are working on MatriSense.

Goal:
Run a bug-fix pass for Regional Referral & Hospital Assignment only.

Test:
1. Backend starts.
2. Frontend starts.
3. Seed demo hospitals.
4. Create/edit patient profile with district/address.
5. Start and complete high-risk triage.
6. Worker dashboard shows case.
7. Worker filters by district.
8. Worker opens case detail.
9. Patient location displays.
10. Hospitals display.
11. Assign hospital.
12. Refresh; assignment persists.
13. Reassign hospital with reason.
14. Assignment history shows both.
15. Audit timeline records assignment/reassignment if audit exists.
16. Case with no district/location does not crash.
17. No AI/RAG/rules/safety files changed.

Fix only bugs related to this feature.

After finishing:
- List files changed.
- Provide final test result.
- Mention known MVP limitations.
```
