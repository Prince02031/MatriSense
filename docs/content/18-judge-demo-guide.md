# Judge Demo Guide

Step-by-step walkthrough of the MatriSense patient triage and health worker review workflow.

### 1. Mother Side: Login and Profile
1.  Open the application homepage.
2.  Log in or register as a mother using demo credentials.
3.  Open the patient profile page.
4.  Review or fill pregnancy stage, gestational week, known risk factors, emergency contact, and optional district/upazila/address.
5.  If document support is enabled, show optional identity or previous report fields without making them required for emergency triage.

### 2. Mother Side: Report Symptoms
1.  Click **Start New Triage**.
2.  Enter a Bangla symptom report, for example: `আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি`.
3.  Submit the symptoms.

### 3. AI Extraction and Confirmation
1.  Show the extracted structured symptoms, such as `headache`, `severe_headache`, or `blurred_vision` depending on extraction.
2.  Explain that the LLM extracts symptoms but does not decide medical risk.
3.  Confirm or edit the extracted symptoms.

### 4. Follow-Up Questions
1.  Answer the short follow-up questions selected from the approved question bank.
2.  For headache, likely follow-ups include blurred vision, swelling, or severity.
3.  Submit the answers.

### 5. View Triage Result
1.  Show the result page.
2.  Expected result for headache with blurred vision should be HIGH risk or urgent escalation depending on the current rule configuration.
3.  Show the Bangla explanation, urgent next steps, warning signs, and safety disclaimer.
4.  Point out that HIGH-risk guidance does not show home-care-first advice.

### 6. Health Worker Side: Login
1.  Log in as a health worker using demo credentials.
2.  If verification is enabled, explain the verification-pending design and how admin verification is planned or handled.
3.  Open the health worker dashboard.

### 7. Health Worker Dashboard
1.  Show the patient list and triage case list.
2.  Filter or sort by risk level, status, or district if available.
3.  Confirm that the high-risk case appears in the queue.

### 8. Health Worker Case Review
1.  Open the mother’s case detail page.
2.  Review the patient profile snapshot, original Bangla input, extracted symptoms, follow-up answers, risk level, matched rules, reasons, RAG evidence labels, and guidance shown to the patient.
3.  Explain that the health worker sees structured information instead of starting from zero.

### 9. Status Update or Referral Note
1.  Update the case status, for example `CONTACTED`, `REFERRED`, `FOLLOW_UP_NEEDED`, or the statuses supported by the current backend.
2.  Add a referral or follow-up note if available.
3.  Show that the change persists after refresh.

### 10. Regional Referral and Hospital Assignment
1.  If regional referral is enabled, show district/upazila, address, and optional GPS snapshot.
2.  Show same-district or nearby seeded hospitals.
3.  Assign or reassign a hospital with a reason.
4.  Show assignment history and audit events if implemented.

### 11. Patient History
1.  Return to the patient side.
2.  Open patient triage history.
3.  Show that previous triage sessions are stored and can be reviewed.

### 12. Key Message for Judges
MatriSense is not a generic chatbot. It is a structured maternal triage and referral workflow: LLM for Bangla extraction and explanation, rule engine for risk decision, RAG for source-grounded guidance, safety validator for guardrails, and health workers for final human-led action.
