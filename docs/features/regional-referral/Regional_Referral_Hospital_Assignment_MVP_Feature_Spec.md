# MatriSense MVP Feature Spec: Regional Referral & Hospital Assignment

## Feature Goal

Add a simple district-based regional case management and hospital assignment workflow for MatriSense.

The existing patient → triage → health worker flow already works. This feature adds an operational referral layer so health workers are not overwhelmed by all cases and can assign a suitable hospital/facility to a patient case.

## MVP Scope

```text
Patient profile/location
→ triage session location snapshot
→ district-based health worker case filtering
→ seeded hospital database
→ same-district/nearby hospital lookup
→ manual hospital assignment/reassignment
→ assignment history and audit trail
```

## Non-Goals for MVP

Do not implement these yet:

```text
automatic hospital assignment
automatic health worker assignment
complex load balancing
road-distance/travel-time routing
live Google Places dependency
full Bangladesh hospital import
AI deciding referral destination
```

The health worker must choose the hospital manually.

## Safety Boundary

This feature must not modify:

```text
AI extraction
rule engine
RAG retrieval logic
LLM explanation
safety validator
admin/dev triage lab
```

Hospital assignment is an operational workflow, not a medical diagnosis or AI decision.

## Patient Region/Location Fields

Patient profile should support optional fields:

```js
{
  division: String,
  district: String,
  upazilaOrThana: String,
  addressOrVillage: String,
  latitude: Number,
  longitude: Number,
  locationSource: "PROFILE" | "GPS" | "TRIAGE_INPUT"
}
```

All fields are optional. Emergency triage should still work with no GPS or profile.

## Triage Session Profile Snapshot

Each triage case should store a snapshot of patient profile/location at the time triage starts:

```js
profileSnapshot: {
  name,
  age,
  phone,
  trimester,
  gestationalWeek,
  expectedDeliveryDate,
  lastCheckupDate,
  knownRiskFactors,
  emergencyContactName,
  emergencyContactPhone,
  division,
  district,
  upazilaOrThana,
  addressOrVillage,
  latitude,
  longitude,
  locationSource
}
```

Snapshot rules:

1. If a permanent Patient profile exists, copy useful fields into `profileSnapshot`.
2. If `/triage/start` provides location fields, merge them into the session snapshot.
3. Do not overwrite the permanent Patient profile from triage unless the user explicitly saves profile.
4. Old sessions without `profileSnapshot` must still load.

## Health Worker Coverage

Health workers should have optional fields:

```js
{
  coverageDistricts: [String],
  coverageUpazilas: [String],
  canViewAllDistricts: Boolean
}
```

Default:

```js
coverageDistricts: []
coverageUpazilas: []
canViewAllDistricts: false
```

Visibility logic:

```text
ADMIN → all cases
canViewAllDistricts=true → all cases
HEALTH_WORKER with coverageDistricts → matching district cases
missing district → show as “Unassigned region” and do not crash
```

## Hospital Model

Add a seeded hospital database:

```js
Hospital {
  name,
  type,
  division,
  district,
  upazilaOrThana,
  address,
  latitude,
  longitude,
  phone,
  services,
  isActive
}
```

Hospital types:

```text
GENERAL
MATERNAL
SPECIALIZED
UPAZILA_HEALTH_COMPLEX
DISTRICT_HOSPITAL
MEDICAL_COLLEGE
```

Suggested services:

```text
maternal
emergency
delivery
antenatal
obgyn
blood
nicu
```

## Hospital Endpoints

Recommended endpoints:

```text
GET  /api/hospitals
GET  /api/hospitals/nearby?lat=&lng=&district=&upazilaOrThana=&service=
POST /api/hospitals/seed-demo
```

`GET /api/hospitals` should support filters:

```text
district
upazilaOrThana
type
service
isActive
```

`GET /api/hospitals/nearby` behavior:

```text
If lat/lng exists:
  calculate approximate Haversine distance and sort nearest first.

If lat/lng is missing:
  return active hospitals from same district/upazila.

If no usable location exists:
  return empty list with clear message; do not crash.
```

## Hospital Assignment Fields

Add optional fields to `TriageSession`:

```js
{
  assignedHospitalId,
  assignedHospitalSnapshot,
  assignedByWorkerId,
  assignedAt,
  hospitalAssignmentHistory: [
    {
      hospitalId,
      hospitalName,
      assignedBy,
      assignedAt,
      reason,
      action: "ASSIGNED" | "REASSIGNED"
    }
  ]
}
```

## Assignment Endpoint

Recommended endpoint:

```text
PUT /api/worker/cases/:sessionId/hospital
```

Payload:

```json
{
  "hospitalId": "mongo_object_id",
  "reason": "Nearest district hospital with maternal emergency support"
}
```

Behavior:

1. Authenticate health worker/admin.
2. Load triage session.
3. Load selected hospital.
4. Save assignment snapshot.
5. Append assignment history.
6. Create audit log entry.
7. Return updated case.

## Frontend Requirements

### Patient Profile

Add fields:

```text
division
district
upazilaOrThana
addressOrVillage
optional GPS button
```

GPS should be optional and permission-based. If denied, continue with manual address.

### Triage Start

Load patient profile if available and include location/profile fields in the `startTriage` payload. Do not force profile creation.

### Worker Dashboard

Show:

```text
district/upazila or “Unassigned region”
risk level
status
assigned hospital or “Not assigned”
symptom summary
```

Add district filter while preserving existing risk/status filters.

### Worker Case Detail

Add a panel titled **Referral & Hospital Assignment** showing:

```text
patient address
patient district/upazila
GPS coordinates if available
current assigned hospital
assignment history
same-district/nearby hospitals
assign/reassign button
reason input
```

Optional map support can be added later. Hospital list assignment should work first.

## Acceptance Criteria

The feature is MVP-complete when:

```text
Patient profile supports region/address fields.
Triage sessions store location/profile snapshot.
Worker dashboard supports district filtering.
Case cards show district or “Unassigned region”.
Hospital model and seed data exist.
Worker case detail shows hospital suggestions.
Worker can assign/reassign hospital.
Assignment persists after refresh.
Assignment history is visible.
Audit log records assignment/reassignment.
Cases without location still open safely.
AI/RAG/rule/safety files remain untouched.
```

## Manual Demo Flow

```text
1. Mother edits profile with district/upazila/address.
2. Mother starts triage and submits high-risk Bangla symptoms.
3. Health worker filters dashboard by district.
4. Health worker opens case detail.
5. Health worker sees patient location and hospital options.
6. Health worker assigns hospital.
7. Health worker updates status.
8. Audit/history shows the action.
```
