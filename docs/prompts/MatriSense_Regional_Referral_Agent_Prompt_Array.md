# MatriSense Regional Referral & Hospital Assignment: Agent Prompt Array

## How to Use

Give these prompts to the coding agent sequentially.

After each prompt:

```text
1. Review the changed files.
2. Run backend/frontend if possible.
3. Test that prompt’s specific behavior.
4. Commit once stable.
5. Continue to the next prompt.
```

Do not ask the agent to implement every prompt at once unless you can review a large diff.

---

## Global Context

MatriSense is a Bangla-first maternal health triage and referral system.

Current status:

```text
Patient → triage → health worker flow works.
Patient history exists.
Worker case detail exists.
Health worker case status update exists.
The AI triage pipeline is stable.
```

This feature adds:

```text
District/upazila-based patient record routing
Health worker regional coverage
Patient location/address snapshot
Seeded hospital database
Nearby/same-district hospital lookup
Manual hospital assignment/reassignment
Assignment history and audit trail
Optional GPS and map support
```

Critical rule:

```text
Do not modify the core AI triage pipeline.
```

Generally do not modify:

```text
backend/src/ai
backend/src/rag
backend/src/safety
backend/src/triage/rules
decisionBuilder
AI extraction
LLM explanation logic
dev/admin triage lab
```

---

# Prompt 1 — Inspect and Plan

```text
You are working on the MatriSense project.

You own the full “Regional Referral & Hospital Assignment” feature end-to-end.

Before editing, inspect the project and produce a short implementation plan.

Current project status:
- Patient → triage → health worker flow works.
- Patient history exists.
- Worker case detail exists.
- Health worker case status update exists.
- The AI triage pipeline is stable and must not be modified.

Feature goal:
Add district-based regional case management and hospital assignment. Health workers should see patient cases by assigned district, view patient location/address, see nearby or same-district hospitals from seeded data, and assign or reassign a hospital to a case.

Do not modify:
- backend/src/ai
- backend/src/rag
- backend/src/safety
- backend/src/triage/rules
- decisionBuilder
- AI extraction
- LLM explanation logic
- dev/admin triage lab

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

Output only:
1. Existing relevant models and fields.
2. Existing worker case/status endpoints.
3. Existing patient profile and triage start flow.
4. Existing audit support.
5. Proposed minimal file changes.
6. Risks or conflicts.

Do not edit files yet.
```

---

# Prompt 2 — Add Region, Location, Coverage, and Assignment Fields

```text
You are working on the MatriSense project.

Goal:
Add optional region/location, health worker coverage, and hospital assignment fields without breaking old data.

Do not modify:
- backend/src/ai
- backend/src/rag
- backend/src/safety
- backend/src/triage/rules
- admin/dev triage lab

Inspect:
- backend/src/models/User.js
- backend/src/models/Patient.js
- backend/src/models/TriageSession.js

Required changes:

1. Patient model optional fields:
- division
- district
- upazilaOrThana
- addressOrVillage
- latitude
- longitude
- locationSource

locationSource allowed values:
- PROFILE
- GPS
- TRIAGE_INPUT

2. User model optional health worker coverage fields:
- coverageDistricts: [String]
- coverageUpazilas: [String]
- canViewAllDistricts: Boolean

Defaults:
- coverageDistricts: []
- coverageUpazilas: []
- canViewAllDistricts: false

3. TriageSession optional profileSnapshot:
- name
- age
- phone
- trimester
- gestationalWeek
- expectedDeliveryDate
- lastCheckupDate
- knownRiskFactors
- emergencyContactName
- emergencyContactPhone
- division
- district
- upazilaOrThana
- addressOrVillage
- latitude
- longitude
- locationSource

4. TriageSession optional hospital assignment fields:
- assignedHospitalId
- assignedHospitalSnapshot
- assignedByWorkerId
- assignedAt
- hospitalAssignmentHistory

hospitalAssignmentHistory item:
- hospitalId
- hospitalName
- assignedBy
- assignedAt
- reason
- action: ASSIGNED or REASSIGNED

Rules:
- Keep all new fields optional.
- Do not require a migration for old sessions.
- Do not rename existing fields.
- Do not change AI/rule/RAG session fields.

After editing:
- List exact files changed.
- Explain new fields added.
- Explain why old sessions still work.
```

---

# Prompt 3 — Save Profile/Location Snapshot When Triage Starts

```text
You are working on the MatriSense project.

Goal:
When a triage session starts, save a safe profile/location snapshot into TriageSession.

Do not modify:
- AI extraction
- rule engine
- RAG
- safety validator
- admin/dev triage lab

Inspect:
- backend/src/routes/triage.routes.js
- backend/src/models/Patient.js
- backend/src/models/TriageSession.js
- backend/src/services/caseStateBuilder.js if needed

Required behavior for POST /api/triage/start:

1. Accept optional patientId.
2. If patientId is provided and Patient exists, copy useful Patient fields into profileSnapshot.
3. If triage start payload includes profile/location fields, merge them into profileSnapshot:
   - trimester
   - gestationalWeek
   - age
   - lastCheckupDate
   - knownRiskFactors
   - emergencyContactName
   - emergencyContactPhone
   - division
   - district
   - upazilaOrThana
   - addressOrVillage
   - latitude
   - longitude
   - locationSource
4. Payload fields should fill or override the session snapshot only.
5. Do not automatically update the permanent Patient profile from triage.
6. Triage start must still work without patientId or location.
7. Preserve current caseState initialization.
8. Keep existing rule compatibility.

Emergency triage must not be blocked because GPS/profile/location is missing.

After editing:
- List exact files changed.
- Explain where profileSnapshot is created.
- Explain whether permanent Patient profile is updated.
- Explain behavior with no location.
```

---

# Prompt 4 — Update Patient Profile Frontend

```text
You are working on the MatriSense project.

Goal:
Update the patient profile frontend so mothers can save region/address information.

Do not modify:
- AI triage pipeline
- worker hospital assignment yet
- admin/dev triage lab

Inspect:
- frontend/app/dashboard/patient/profile/page.jsx
- frontend/app/api/patientApi.js
- frontend/app/context/AuthContext.jsx if needed

Required fields:
- name
- age
- phone
- trimester
- gestationalWeek
- expectedDeliveryDate
- lastCheckupDate
- knownRiskFactors
- emergencyContactName
- emergencyContactPhone
- division
- district
- upazilaOrThana
- addressOrVillage

Optional GPS support:
Add “Use my current location” only if simple.

GPS rules:
1. Ask permission before browser geolocation.
2. If allowed, fill latitude/longitude and set locationSource = GPS.
3. If denied/unavailable, show friendly message and continue with manual address.
4. Do not block profile save if GPS fails.
5. Do not request GPS automatically on page load.

Rules:
- Keep existing profile save/load behavior.
- Do not invent fake coordinates.
- Keep UI simple.

After editing:
- List exact files changed.
- Explain how patient saves district/address.
- Explain GPS-denied behavior.
```

---

# Prompt 5 — Send Location Snapshot From Triage Start Frontend

```text
You are working on the MatriSense project.

Goal:
Update /triage/start so the triage session receives patient profile/location snapshot data.

Do not modify:
- AI extraction
- rule engine
- RAG
- safety validator
- admin/dev triage lab

Inspect:
- frontend/app/triage/start/page.jsx
- frontend/app/api/triageApi.js
- frontend/app/api/patientApi.js
- frontend/app/context/AuthContext.jsx if needed

Required behavior:
1. Load mother profile if available.
2. Pre-fill trimester, gestationalWeek, district, upazilaOrThana, and addressOrVillage from profile.
3. Include patientId if available.
4. Include these fields in startTriage payload:
   - trimester
   - gestationalWeek
   - division
   - district
   - upazilaOrThana
   - addressOrVillage
   - latitude
   - longitude
   - locationSource
5. Allow emergency triage even if no profile exists.
6. If no profile exists, show helpful message:
   “You can continue reporting symptoms now, or complete your profile later.”
7. Do not force profile creation before triage.
8. Do not overwrite permanent profile from triage.

Optional:
Add “Use my current location for this triage” button. If GPS is denied, continue without GPS.

After editing:
- List exact files changed.
- Explain how /triage/start gets location data.
- Explain what happens if no profile exists.
```

---

# Prompt 6 — Add Hospital Model, Routes, and Seed Data

```text
You are working on the MatriSense project.

Goal:
Add a simple seeded hospital database and hospital lookup endpoints.

Do not modify:
- AI triage pipeline
- worker case filtering
- hospital assignment endpoint yet unless necessary
- admin/dev triage lab

Inspect:
- backend/src/index.js
- backend/src/models directory
- backend/src/routes directory
- existing route/controller/service patterns

Required backend work:

1. Create backend/src/models/Hospital.js with:
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

Hospital type examples:
- GENERAL
- MATERNAL
- SPECIALIZED
- UPAZILA_HEALTH_COMPLEX
- DISTRICT_HOSPITAL
- MEDICAL_COLLEGE

2. Create and mount hospital routes:
- GET /api/hospitals
- GET /api/hospitals/nearby
- POST /api/hospitals/seed-demo

3. GET /api/hospitals filters:
- district
- upazilaOrThana
- type
- service
- isActive

4. GET /api/hospitals/nearby query params:
- lat
- lng
- district
- upazilaOrThana
- service

Nearby behavior:
- If lat/lng exists, calculate approximate distance using Haversine and sort nearest first.
- If no lat/lng, return active hospitals from same district/upazila.
- Include distanceKm when calculated.
- Never crash if location is missing.

5. POST /api/hospitals/seed-demo:
- Insert 10–15 demo hospitals across a few Bangladesh districts.
- Seed only if hospitals are not already present.
- Return count and success response.

Rules:
- Do not rely on live external hospital APIs.
- Do not fake assignment.
- Keep seed data simple but realistic enough for demo.

After editing:
- List exact files changed.
- Explain hospital filters.
- Explain nearby hospital logic.
- Explain how to seed demo hospitals.
```

---

# Prompt 7 — Add Worker Region Filtering

```text
You are working on the MatriSense project.

Goal:
Update worker case listing so health workers can view cases by assigned district and filter by district/status/risk.

Do not modify:
- AI triage
- rules
- RAG
- safety validator
- hospital assignment endpoint yet unless needed

Inspect:
- backend/src/models/User.js
- backend/src/models/TriageSession.js
- backend/src/routes/worker.routes.js
- backend/src/controllers/worker.controller.js
- frontend/app/dashboard/worker/page.jsx
- frontend/app/api/workerApi.js

Backend requirements:
Update GET /api/worker/cases.

Behavior:
1. Admin users can view all cases.
2. Users with canViewAllDistricts=true can view all cases.
3. Health workers with coverageDistricts should see cases whose district matches their coverage.
4. District should be resolved from:
   - session.profileSnapshot.district
   - populated patient district if available
   - caseState.profile.district if available
5. Query params:
   - district
   - riskLevel
   - status
   - assignedHospitalId
6. Do not crash if district is missing.
7. Cases without district should be labeled Unassigned region or still included with fallback behavior for MVP.

Frontend requirements:
1. Add district filter dropdown to worker dashboard.
2. Keep existing risk/status filters.
3. Show case district/upazila on each case row/card.
4. Show assigned hospital name if available.
5. Show “Unassigned region” when missing.
6. Do not break existing worker case navigation.

Rules:
- Do not hide high-risk cases only because district is missing.
- Do not invent fake district names.
- Preserve existing worker dashboard behavior.

After editing:
- List exact files changed.
- Explain region filtering logic.
- Explain how missing district cases are handled.
```

---

# Prompt 8 — Add Hospital Assignment Backend

```text
You are working on the MatriSense project.

Goal:
Allow health workers to assign or reassign a hospital to a triage case.

Do not modify:
- AI triage
- rule engine
- RAG
- safety validator
- admin/dev triage lab

Inspect:
- backend/src/models/TriageSession.js
- backend/src/models/Hospital.js
- backend/src/models/AuditLog.js
- backend/src/routes/worker.routes.js
- backend/src/controllers/worker.controller.js
- backend/src/services/auditService.js

Required endpoint:
PUT /api/worker/cases/:sessionId/hospital

Payload:
{
  hospitalId,
  reason
}

Behavior:
1. Authenticate health worker/admin using existing middleware.
2. Load TriageSession by sessionId.
3. Load Hospital by hospitalId.
4. If session is missing, return 404.
5. If hospital is missing, return 404.
6. Determine action:
   - ASSIGNED if no previous hospital
   - REASSIGNED if assigned hospital already exists
7. Save:
   - assignedHospitalId
   - assignedHospitalSnapshot
   - assignedByWorkerId
   - assignedAt
8. Append to hospitalAssignmentHistory:
   - hospitalId
   - hospitalName
   - assignedBy
   - assignedAt
   - reason
   - action
9. Create audit log entry using existing audit service if available.
10. Return updated case.

Rules:
- Do not automatically assign hospitals.
- Health worker must choose.
- Do not create duplicate audit systems if one already exists.
- Keep old sessions working.

After editing:
- List exact files changed.
- Explain assignment vs reassignment.
- Explain audit log behavior.
- Explain response shape.
```

---

# Prompt 9 — Add Hospital Assignment Frontend

```text
You are working on the MatriSense project.

Goal:
Add a Referral & Hospital Assignment panel to worker case detail.

Do not modify:
- AI triage pipeline
- patient triage pages
- admin/dev triage lab

Inspect:
- frontend/app/dashboard/worker/[sessionId]/page.jsx
- frontend/app/api/workerApi.js
- frontend/app/api/hospitalApi.js if it exists
- any worker case detail components

Required frontend work:

1. Add API helpers if missing:
- getHospitals(filters)
- getNearbyHospitals(params)
- assignHospitalToCase(sessionId, payload)

Use NEXT_PUBLIC_API_URL || http://localhost:5000.
Include auth token if existing API clients do.

2. In worker case detail, add panel:
Referral & Hospital Assignment

Show:
- patient address
- district
- upazila/thana
- GPS coordinates if available
- current assigned hospital
- assignment history

3. Load nearby/same-district hospitals:
- Use patient latitude/longitude if available.
- Otherwise use district/upazila.
- If no location/district exists, show:
  “No location available. Add patient district/address to suggest hospitals.”

4. Show hospital list:
- name
- type
- district/upazila
- address
- phone
- services
- distanceKm if available
- Assign/Reassign button

5. Assignment behavior:
- Worker selects hospital.
- Worker enters optional reason.
- Submit PUT /api/worker/cases/:sessionId/hospital.
- On success, update current assigned hospital and history.
- Show success message.
- Refresh audit timeline if available.

UX rules:
- If a hospital is already assigned, button text should say Reassign.
- If not assigned, button text should say Assign.
- Do not block case detail if hospitals fail to load.
- Show useful loading/error states.

After editing:
- List exact files changed.
- Explain how hospital suggestions are loaded.
- Explain how worker assigns/reassigns.
```

---

# Prompt 10 — Optional Leaflet Map

```text
You are working on the MatriSense project.

Goal:
Add an optional simple map to the worker case detail hospital assignment panel.

Only do this if Leaflet can be added cleanly. If map integration becomes complex, do not break the hospital list assignment workflow.

Do not modify:
- AI triage
- backend rules/RAG/safety
- hospital assignment backend
- patient profile backend

Inspect:
- frontend/app/dashboard/worker/[sessionId]/page.jsx
- frontend/package.json
- any existing map components

Requirements:
1. Use Leaflet/react-leaflet if already available or easy to install.
2. Show map only when patient latitude and longitude exist.
3. Show:
   - patient marker
   - hospital markers
   - assigned hospital marker if applicable
4. If coordinates are missing, show friendly message and keep hospital list visible.
5. Do not require map for assignment.
6. Do not break Next.js SSR. Dynamically import map component with SSR disabled if needed.
7. Keep styling simple.

Fallback:
If package/SSR issues take too long:
- Skip map.
- Leave a TODO comment.
- Keep hospital list assignment fully working.

After editing:
- List exact files changed.
- Explain when map appears.
- Explain fallback when coordinates are missing.
```

---

# Prompt 11 — Audit and Status Compatibility

```text
You are working on the MatriSense project.

Goal:
Ensure hospital assignment/reassignment integrates cleanly with existing audit timeline and case status update behavior.

Do not modify:
- AI triage
- rule engine
- RAG
- safety validator

Inspect:
- backend/src/models/AuditLog.js
- backend/src/services/auditService.js
- backend/src/controllers/worker.controller.js
- frontend/app/dashboard/worker/[sessionId]/page.jsx
- frontend/app/api/workerApi.js
- existing status update controls

Required work:
1. Confirm backend accepted status values.
2. Ensure frontend does not send status values the backend rejects.
3. If UI labels differ from backend values, add a mapping.
4. Ensure hospital assignment creates audit event.
5. Ensure hospital reassignment creates audit event.
6. After assignment or status update, refresh:
   - current case detail
   - audit timeline if shown
7. Do not duplicate audit endpoints if they already exist.
8. If audit endpoint is missing and AuditLog model exists, add:
   GET /api/worker/cases/:sessionId/audit

Audit timeline should show real backend events such as:
- status updated
- hospital assigned
- hospital reassigned
- referral note added if available

Rules:
- Do not fake audit entries on frontend.
- Use real backend audit logs.
- Missing audit data should be graceful.

After editing:
- List exact files changed.
- Explain accepted status values.
- Explain audit event names for assignment/reassignment.
- Explain frontend refresh behavior.
```

---

# Prompt 12 — End-to-End Test and Bug Fix Pass

```text
You are working on the MatriSense project.

Goal:
Do an end-to-end verification pass for the Regional Referral & Hospital Assignment feature and fix only related bugs.

Do not modify:
- AI triage decision logic
- rule engine
- RAG retrieval
- safety validator
- admin/dev triage lab

Test flow:
1. Backend starts without crash.
2. Frontend starts without crash.
3. Seed demo hospitals.
4. Register/login as mother.
5. Create or edit patient profile with district/upazila/address/emergency contact.
6. Start triage from patient side.
7. Complete a high-risk triage case.
8. Confirm result page still works.
9. Login as health worker.
10. Confirm worker dashboard shows the case.
11. Filter by district.
12. Open worker case detail.
13. Confirm patient region/address appears.
14. Confirm nearby/same-district hospitals appear.
15. Assign a hospital with reason.
16. Refresh page.
17. Confirm assigned hospital persists.
18. Reassign another hospital with reason.
19. Confirm assignment history shows both actions.
20. Confirm audit timeline shows assignment/reassignment if audit exists.
21. Test a case with no district/location and confirm it does not crash.
22. Confirm no AI/RAG/rule/safety files were changed.

Fix only bugs related to:
- region fields
- location snapshot
- worker filtering
- hospital lookup
- hospital assignment
- assignment history
- audit refresh
- frontend display fallbacks

After finishing:
- List exact files changed.
- Provide final test checklist result.
- Mention known limitations.
```

---

# Prompt 13 — Final Review and Documentation

```text
You are working on the MatriSense project.

Goal:
Review the Regional Referral & Hospital Assignment feature for maintainability and update lightweight documentation.

Do not modify:
- AI triage
- RAG
- safety validator
- rule engine
- admin/dev triage lab

Review:
1. New model fields are optional and backward compatible.
2. Old sessions do not crash.
3. Worker filtering does not hide high-risk cases with missing district.
4. Hospital assignment requires manual worker action.
5. Assignment/reassignment creates history and audit log.
6. Patient GPS is optional.
7. Emergency triage is not blocked by missing location.
8. Frontend handles loading/error/empty states.
9. No fake location or fake hospital data is displayed as real user data.
10. No core AI files were modified.

Documentation:
Add or update a short markdown file, for example:
docs/regional-referral-mvp.md

Include:
- feature purpose
- data model summary
- endpoints
- frontend pages touched
- district filtering behavior
- hospital lookup behavior
- hospital assignment behavior
- seed demo hospital instructions
- limitations
- test flow

After editing:
- List exact files changed.
- Summarize final architecture.
- Summarize known MVP limitations.
```

---

# Recommended Prompt Order

```text
1. Inspect and plan.
2. Add model fields.
3. Save triage snapshot.
4. Update patient profile frontend.
5. Send location from triage start.
6. Add hospital model/routes/seed.
7. Add worker region filtering.
8. Add hospital assignment backend.
9. Add hospital assignment frontend.
10. Optional map.
11. Audit/status compatibility.
12. End-to-end test pass.
13. Final review/docs.
```

If quota is limited, skip Prompt 10.

Minimum useful MVP sequence:

```text
Prompt 1
Prompt 2
Prompt 3
Prompt 6
Prompt 7
Prompt 8
Prompt 9
Prompt 12
```

---

# Completion Definition

The feature is complete when:

```text
A patient can complete triage with district/location snapshot.
A health worker can filter cases by district.
Worker case detail shows patient region/address.
Worker sees same-district or nearby seeded hospitals.
Worker can assign and reassign a hospital.
Assignment persists after refresh.
Assignment history is visible.
Audit records assignment/reassignment if audit exists.
No AI/RAG/rule/safety files were modified.
```
