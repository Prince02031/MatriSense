# Data Model Summary

MatriSense uses MongoDB/Mongoose-style models to store user accounts, patient profiles, triage sessions, referral records, audit logs, hospitals, and docs configuration where available.

### User
*   `name` or `fullName` — User display name.
*   `email` / `phone` — Login or contact identifiers depending on the implementation.
*   `passwordHash` — Stored credential hash.
*   `role` — `MOTHER`, `HEALTH_WORKER`, or `ADMIN` where uppercase roles are used.
*   `coverageDistricts` / `coverageUpazilas` — Optional worker coverage fields.
*   `canViewAllDistricts` — Optional permission for broader regional case access.
*   `verificationStatus` or `verificationPending` — Health worker certification workflow state if implemented.
*   `isActive` — Account status.

### Patient
*   `userId` — Link to the mother’s user account.
*   `name`, `age`, `phone` — Basic identity and contact fields.
*   `trimester`, `gestationalWeek`, `expectedDeliveryDate`, `lastCheckupDate` — Pregnancy profile context.
*   `knownRiskFactors` — Hypertension, diabetes, anemia, previous high-risk pregnancy, or other known risks.
*   `emergencyContactName`, `emergencyContactPhone` — Emergency contact details.
*   `division`, `district`, `upazilaOrThana`, `addressOrVillage` — Region and address fields.
*   `latitude`, `longitude`, `locationSource` — Optional GPS or location source.
*   `documents` — Optional identity, birth certificate, prescription, or report metadata if the document module is present.

### TriageSession
*   `patientId` / `userId` — Links the session to the mother.
*   `profileSnapshot` — Patient profile and location snapshot at triage start.
*   `initialInputBn` — Original Bangla symptom report.
*   `extractedSymptoms` — AI-extracted symptom codes.
*   `confirmedSymptoms` — Symptoms confirmed or edited by the mother.
*   `followUpQuestions` / `followUpAnswers` — Approved questions and normalized answers.
*   `caseState` — Structured facts sent to the rule engine.
*   `ruleEvents` / `decision` — Matched rules, risk level, reasons, evidence tags, and allowed guidance type.
*   `careGuidanceContext` — Retrieved RAG guidance cards and source labels.
*   `llmOutput` / `safeOutput` — Generated explanation and final safety-validated output.
*   `status` — Case workflow state.
*   `assignedHospitalId`, `assignedHospitalSnapshot`, `hospitalAssignmentHistory` — Hospital assignment fields if regional referral is enabled.

### ReferralNote
*   `triageSessionId` — Linked triage case.
*   `patientId` — Linked patient.
*   `healthWorkerId` — Worker who created the note.
*   `actionTaken` — Contacted, referred, follow-up needed, or other action.
*   `referredTo` — Referral destination if provided.
*   `followUpDate` — Planned follow-up date.
*   `note` — Worker note.
*   `statusAfterNote` — Optional case status after the note.

### Hospital
*   `name` — Facility name.
*   `type` — General hospital, maternal facility, upazila health complex, district hospital, medical college, or other configured type.
*   `division`, `district`, `upazilaOrThana` — Administrative location.
*   `address`, `latitude`, `longitude`, `phone` — Contact and location fields.
*   `services` — Maternal, emergency, delivery, antenatal, blood, NICU, or other supported services.
*   `isActive` — Whether the seeded facility is available for lookup.

### DocsConfig
*   `isPublic` — Whether `/docs` is publicly available.
*   `availableFrom` — Start of docs visibility window.
*   `availableUntil` — End of docs visibility window.
*   `updatedBy` — Admin who changed the config.
*   `updatedAt` — Last update time.

### AuditLog
*   `action` — Event name such as status update, referral note added, hospital assigned, or hospital reassigned.
*   `actorUserId` / `actorRole` — User who performed the action.
*   `sessionId` / `patientId` — Related case and patient.
*   `metadata` — Extra action details.
*   `createdAt` — Timestamp.
