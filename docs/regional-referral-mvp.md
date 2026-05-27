# MatriSense Regional Referral & Hospital Assignment MVP Documentation

This document outlines the architecture, database schema updates, and endpoint designs for the district-based Regional Referral & Hospital Assignment system.

## 1. Schema Extensions

### Patient Schema (`Patient.js`)
Stores maternal patient geographic identifiers:
* `division` (String, optional) - Division name (e.g., "Dhaka")
* `district` (String, optional) - District name (e.g., "Dhaka")
* `upazilaOrThana` (String, optional) - Upazila or Thana name (e.g., "Mirpur")
* `addressOrVillage` (String, optional) - Full address details
* `latitude` (Number, optional) - Geolocation coordinate
* `longitude` (Number, optional) - Geolocation coordinate
* `locationSource` (String, optional) - Enum: `['PROFILE', 'GPS', 'TRIAGE_INPUT']`

### User Schema (`User.js`)
Restricts Health Workers to specific geographic regions:
* `coverageDistricts` (Array of Strings) - Districts the worker covers
* `coverageUpazilas` (Array of Strings) - Upazilas the worker covers
* `canViewAllDistricts` (Boolean) - Allows workers to view all cases nationwide

### TriageSession Schema (`TriageSession.js`)
Stores a geographic snapshot at the time of triage:
* `profileSnapshot` (Object) - Captures a snapshot of all user location fields on triage start.
* `assignedHospitalId` (ObjectId) - References the assigned `Hospital`
* `assignedHospitalSnapshot` (Object) - Snapshot of assigned hospital properties to prevent data loss on deletion
* `assignedByWorkerId` (ObjectId) - The health worker who performed the referral
* `assignedAt` (Date) - Referral execution timestamp
* `hospitalAssignmentHistory` (Array) - History log tracking each assignment action (`ASSIGNED` or `REASSIGNED`) with reason, worker ID, and date.

### Hospital Schema (`Hospital.js`)
Defines registered referral clinics:
* `name` (String, required)
* `type` (String, required) - Enum: `['upazila_health_complex', 'district_hospital', 'maternal_clinic', 'medical_college_hospital', 'private_clinic']`
* `division` (String, required)
* `district` (String, required)
* `upazilaOrThana` (String, required)
* `address` (String)
* `latitude` (Number, required)
* `longitude` (Number, required)
* `phone` (String)
* `services` (Array of Strings)
* `isActive` (Boolean)

---

## 2. API Routes

### Hospital Routes (`/api/hospitals`)
* `POST /api/hospitals/seed-demo` - Seeds 10 regional hospitals across Bangladesh if empty.
* `GET /api/hospitals` - Query list of hospitals by query filters (`district`, `upazilaOrThana`, `type`, `service`).
* `GET /api/hospitals/nearby` - Returns active hospitals sorted by Haversine distance if `latitude`/`longitude` parameters are provided. Falls back to matching `district` name otherwise.

### Case Assignments (`/api/worker/cases`)
* `PUT /api/worker/cases/:sessionId/hospital` - Manually refer and assign a hospital to the session. Creates audit trail inside the assignment history array and logs action in `AuditLog`.

---

## 3. Verification & Seeding

Health workers can easily view and manage referrals from the Worker Dashboard. To initialize mock data:
1. Trigger `POST /api/hospitals/seed-demo` to seed demo hospital locations.
2. Filter cases on the dashboard by District.
3. Access a triage session, input an assignment reason, and click **Refer & Assign** to assign a nearby hospital.
