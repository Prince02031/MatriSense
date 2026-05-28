# MatriSense MVP Feature Spec: Regional Referral & Hospital Assignment

## 1. Feature Owner

Assign this feature to one teammate end-to-end.

**Suggested role name:** Regional Referral & Hospital Assignment Owner

They own:

```text
Patient region/location fields
→ triage session location snapshot
→ district-based worker case filtering
→ seeded hospital database
→ nearby/same-district hospital lookup
→ worker hospital assignment/reassignment
→ assignment history and audit trail
```

They must **not** modify:

```text
backend/src/ai
backend/src/rag
backend/src/safety
backend/src/triage/rules
AI extraction
rule engine
decisionBuilder
LLM explanation
admin/dev triage lab
```

---

## 2. Why This Feature Matters

MatriSense already has the core flow:

```text
Patient reports Bangla symptoms
→ AI extracts symptoms
→ rule engine classifies risk
→ RAG provides safe guidance
→ high-risk case reaches health worker
```

The next operational gap is referral coordination. Health workers should not see an unfiltered list of all cases. They should see cases by region and assign a suitable hospital or facility for follow-up.

This feature makes MatriSense feel like a real maternal referral support system, not only an AI triage demo.

---

## 3. MVP Goal

Build a **district-based regional referral workflow**.

MVP behavior:

```text
1. Patient profile stores district/upazila/address and optional GPS.
2. Triage session stores a snapshot of patient profile/location at triage start.
3. Health workers can be assigned to one or more districts.
4. Worker dashboard can filter cases by district, status, risk, and assigned hospital.
5. Worker case detail shows patient location/address.
6. Worker sees seeded hospitals from the same district or nearby based on coordinates.
7. Worker manually assigns or reassigns a hospital.
8. Assignment persists on the triage case.
9. Assignment/reassignment appears in history and audit timeline.
```

---

## 4. What We Are Not Building Yet

Avoid these for MVP:

```text
Automatic hospital assignment
Automatic health worker assignment
Complex load balancing
Real road-distance/travel-time routing
Live Google Places dependency
Importing every hospital in Bangladesh
AI deciding the referral destination
```

The health worker should remain the human decision-maker.

---

## 5. Safety Boundary

This feature must preserve MatriSense’s safety architecture:

```text
Rule engine decides urgency.
RAG retrieves allowed guidance.
LLM explains in Bangla.
Safety validator checks final output.
Health worker chooses hospital/referral action.
```

Hospital assignment is an operational workflow, not a medical AI decision.

---

## 6. Patient Region and Location Fields

Add optional location fields to the Patient profile:

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

All fields must be optional. Emergency triage should still work without location.

### Location Source Meaning

```text
PROFILE: location saved in permanent patient profile.
GPS: location collected with browser geolocation after permission.
TRIAGE_INPUT: location/address entered during triage start for that session only.
```

---

## 7. Triage Session Profile/Location Snapshot

Every triage case should store a session-level snapshot so worker screens do not break when the permanent Patient profile is missing.

Recommended field in `TriageSession`:

```js
profileSnapshot: {
  name: String,
  age: Number,
  phone: String,
  trimester: String,
  gestationalWeek: Number,
  expectedDeliveryDate: Date,
  lastCheckupDate: Date,
  knownRiskFactors: [String],
  emergencyContactName: String,
  emergencyContactPhone: String,
  division: String,
  district: String,
  upazilaOrThana: String,
  addressOrVillage: String,
  latitude: Number,
  longitude: Number,
  locationSource: String
}
```

Snapshot rules:

```text
1. If patientId exists, copy Patient profile/location fields into profileSnapshot.
2. If triage start payload includes district/address/GPS fields, merge those into profileSnapshot.
3. Do not automatically update the permanent Patient profile from triage.
4. Do not block triage if patient/profile/location is missing.
5. Old sessions without profileSnapshot must still load.
```

Display fallback order:

```text
1. Populated Patient profile
2. TriageSession.profileSnapshot
3. TriageSession.caseState.profile
4. Raw triage start fields if available
5. “Not provided”
```

---

## 8. Health Worker Coverage

Add optional coverage fields to the `User` model for health workers:

```js
{
  coverageDistricts: [String],
  coverageUpazilas: [String],
  canViewAllDistricts: Boolean
}
```

Defaults:

```js
coverageDistricts: []
coverageUpazilas: []
canViewAllDistricts: false
```

### Worker Case Visibility

For `GET /api/worker/cases`:

```text
ADMIN users: can see all cases.
canViewAllDistricts=true: can see all cases.
HEALTH_WORKER with coverageDistricts: can see matching district cases.
Query param district: filters within allowed district coverage.
Cases with no district: should not crash; show as “Unassigned region” or include with fallback for MVP.
```

Supported query filters:

```text
district
riskLevel
status
assignedHospitalId
```

For MVP, do not hide high-risk cases only because district is missing.

---

## 9. Hospital Data Model

Create:

```text
backend/src/models/Hospital.js
```

Recommended schema:

```js
{
  name: String,
  type: "GENERAL" | "MATERNAL" | "SPECIALIZED" | "UPAZILA_HEALTH_COMPLEX" | "DISTRICT_HOSPITAL" | "MEDICAL_COLLEGE",
  division: String,
  district: String,
  upazilaOrThana: String,
  address: String,
  latitude: Number,
  longitude: Number,
  phone: String,
  services: [String],
  isActive: Boolean
}
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

Use seeded demo data, not live hospital search, for reliable judging/demo behavior.

---

## 10. Hospital Endpoints

Create and mount hospital routes:

```text
GET  /api/hospitals
GET  /api/hospitals/nearby?lat=&lng=&district=&upazilaOrThana=&service=
POST /api/hospitals/seed-demo
```

### GET /api/hospitals

Supports:

```text
district
upazilaOrThana
type
service
isActive
```

### GET /api/hospitals/nearby

Behavior:

```text
If lat/lng exists:
  Calculate approximate distance using Haversine.
  Prefer same-district hospitals if district is provided.
  Sort nearest first.
  Include distanceKm.

If no lat/lng exists:
  Return active hospitals from same district/upazila.

If no location/district exists:
  Return empty list or clear message.
  Do not crash.
```

### POST /api/hospitals/seed-demo

Seed 10–15 demo hospitals across a few districts. Only seed if hospitals are not already present.

---

## 11. Hospital Assignment Fields

Add optional assignment fields to `TriageSession`:

```js
{
  assignedHospitalId: ObjectId,
  assignedHospitalSnapshot: {
    name: String,
    type: String,
    division: String,
    district: String,
    upazilaOrThana: String,
    address: String,
    latitude: Number,
    longitude: Number,
    phone: String,
    services: [String]
  },
  assignedByWorkerId: ObjectId,
  assignedAt: Date,
  hospitalAssignmentHistory: [
    {
      hospitalId: ObjectId,
      hospitalName: String,
      assignedBy: ObjectId,
      assignedAt: Date,
      reason: String,
      action: "ASSIGNED" | "REASSIGNED"
    }
  ]
}
```

---

## 12. Assignment Endpoint

Create:

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

```text
1. Authenticate health worker/admin.
2. Load TriageSession by sessionId.
3. Load Hospital by hospitalId.
4. If missing, return 404.
5. Determine ASSIGNED vs REASSIGNED.
6. Save assignedHospitalId.
7. Save assignedHospitalSnapshot.
8. Save assignedByWorkerId.
9. Save assignedAt.
10. Append hospitalAssignmentHistory.
11. Create audit log entry.
12. Return updated case.
```

Do not automatically assign hospitals.

---

## 13. Audit Requirements

Hospital assignment should create audit events.

Recommended event names:

```text
HOSPITAL_ASSIGNED
HOSPITAL_REASSIGNED
```

Audit should include:

```text
sessionId
workerId
hospitalId
hospitalName
previousHospitalName if reassigned
reason
timestamp
```

Use the existing audit service/model if present. Do not build a parallel audit system.

---

## 14. Patient Frontend Requirements

Update patient profile page to support:

```text
name
age
phone
trimester
gestationalWeek
expectedDeliveryDate
lastCheckupDate
knownRiskFactors
emergencyContactName
emergencyContactPhone
division
district
upazilaOrThana
addressOrVillage
```

Optional GPS button:

```text
“Use my current location”
```

GPS rules:

```text
Ask permission before requesting GPS.
If allowed, save latitude/longitude and locationSource=GPS.
If denied, continue with manual address.
Never block triage because GPS is unavailable.
Never request GPS automatically on page load.
```

---

## 15. Triage Start Frontend Requirements

`/triage/start` should:

```text
1. Load patient profile if available.
2. Pre-fill trimester/gestationalWeek/location from profile.
3. Include patientId if available.
4. Send location/profile snapshot fields in startTriage payload.
5. Allow emergency triage even if no profile/location exists.
6. Not overwrite permanent profile unless user explicitly saves profile.
```

---

## 16. Worker Dashboard Requirements

Worker case list should show:

```text
risk level
status
created time
patient name or fallback
district/upazila or “Unassigned region”
assigned hospital or “Not assigned”
short symptom summary
```

Filters:

```text
district
riskLevel
status
assignedHospitalId
```

---

## 17. Worker Case Detail Requirements

Add a panel named:

**Referral & Hospital Assignment**

It should show:

```text
Patient address
District
Upazila/thana
GPS coordinates if available
Current assigned hospital
Assignment history
Nearby/same-district hospitals
Assign/Reassign button
Reason input
```

On assignment success:

```text
Show success message.
Update current assigned hospital.
Refresh assignment history.
Refresh audit timeline if present.
```

---

## 18. Map Support

Map is optional.

Implementation priority:

```text
1. Complete hospital list assignment first.
2. Add Leaflet map only if time remains.
```

If map is added:

```text
Show patient marker if lat/lng exists.
Show hospital markers.
Indicate assigned hospital if feasible.
```

If map causes SSR/package issues, skip it and keep the list-based assignment flow.

---

## 19. Acceptance Criteria

Feature is MVP-complete when:

```text
1. Patient profile supports district/upazila/address.
2. Triage session stores profile/location snapshot.
3. Worker case list can filter by district.
4. Cases show district or “Unassigned region”.
5. Hospital model exists.
6. Demo hospitals can be seeded.
7. Worker case detail shows same-district/nearby hospitals.
8. Worker can assign a hospital.
9. Worker can reassign a hospital with reason.
10. Assignment persists after refresh.
11. Assignment history is visible.
12. Audit records assignment/reassignment if audit exists.
13. Missing location does not crash any screen.
14. AI/RAG/rule/safety files remain untouched.
```

---

## 20. Testing Checklist

The feature owner should test:

```text
1. Create/edit patient profile with district and address.
2. Start triage from patient side.
3. Complete high-risk triage.
4. Confirm case appears in worker dashboard.
5. Worker filters cases by district.
6. Worker opens case detail.
7. Worker sees patient district/address.
8. Worker sees hospitals from same district.
9. Worker assigns hospital.
10. Refresh page.
11. Assigned hospital remains.
12. Worker reassigns hospital with reason.
13. Assignment history shows both actions.
14. Audit timeline records both actions if audit exists.
15. Case with no district still opens without crashing.
16. Patient can complete triage if GPS is denied.
17. No core AI files were modified.
```

---

## 21. Demo Flow

```text
1. Login as mother.
2. Edit profile with district/upazila/address.
3. Start triage.
4. Enter high-risk Bangla symptom:
   “আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি”
5. Complete triage result.
6. Login as health worker.
7. Filter dashboard by district.
8. Open high-risk case.
9. Show patient location and hospital suggestions.
10. Assign hospital.
11. Update case status.
12. Show audit/referral history.
```
