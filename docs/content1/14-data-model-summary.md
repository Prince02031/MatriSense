# Data Model Summary

MatriSense utilizes MongoDB schemas designed for transactional speed, data integrity, and strict role-based access isolation.

### User
*   `userId` (ObjectId, Primary Key)
*   `role` (String: `patient` | `worker` | `admin`)
*   `email` (String, unique)
*   `phone` (String, unique)
*   `fullName` (String)
*   `coverageDistricts[]` (Array of Strings, for health workers)
*   `isVerified` (Boolean, for health workers)
*   `verificationPending` (Boolean)
*   `isActive` (Boolean)
*   `createdAt` / `updatedAt` (Dates)

### Patient
*   `patientId` (ObjectId, Primary Key)
*   `userId` (ref User)
*   `age` (Number)
*   `phoneNumber` (String)
*   `pregnancyInfo` (Embedded object: `{ lmp, edd, previousPregnancies }`)
*   `location` (Embedded object: `{ division, district, upazila, address }`)
*   `gpsCoordinates` (Embedded object: `{ latitude, longitude, accuracy }`)
*   `createdAt` / `updatedAt` (Dates)

### TriageSession
*   `sessionId` (ObjectId, Primary Key)
*   `patientId` (ref Patient)
*   `status` (String: `started` | `in_progress` | `completed` | `referred`)
*   `symptoms` (String, raw input text)
*   `extractedSymptoms` (Array of symptoms: `{ code, severity, duration }`)
*   `riskLevel` (String: `LOW` | `MEDIUM` | `HIGH`)
*   `guidanceCards[]` (Array of retrieved RAG guidance cards)
*   `profileSnapshot` (Immutable snapshot of patient data at session start)
*   `assignedHospitalId` (ref Hospital)
*   `assignedHospitalSnapshot` (Immutable snapshot of facility at referral time)
*   `createdAt` / `updatedAt` (Dates)

### ReferralNote
*   `referralId` (ObjectId, Primary Key)
*   `triageSessionId` (ref TriageSession)
*   `fromWorkerId` (ref User)
*   `toHospitalId` (ref Hospital)
*   `reason` (String, coordinator notes)
*   `status` (String: `pending` | `delivered` | `acknowledged`)
*   `createdAt` / `updatedAt` (Dates)

### Hospital
*   `hospitalId` (ObjectId, Primary Key)
*   `name` (String)
*   `type` (String: `clinic` | `health-center` | `hospital`)
*   `division` / `district` / `upazila` (Strings)
*   `latitude` / `longitude` (Numbers, GPS coordinates)
*   `phone` / `address` (Strings)
*   `services[]` (Array of Strings: `maternity` | `ICU` | `emergency` | etc.)
*   `isActive` (Boolean)
*   `createdAt` (Date)

### DocsConfig
*   `configId` (ObjectId, Primary Key)
*   `isPublic` (Boolean)
*   `availableFrom` (Date)
*   `availableUntil` (Date)
*   `updatedBy` (ref User)
*   `version` (Number)
*   `updatedAt` (Date)

### AuditLog
*   `logId` (ObjectId, Primary Key)
*   `action` (String: `case-opened` | `case-closed` | `referral-sent` | etc.)
*   `userId` (ref User)
*   `resourceId` (ObjectId)
*   `resourceType` (String)
*   `changes` (Embedded object: `{ oldValue, newValue }`)
*   `timestamp` (Date)
