# Judge Demo Guide

Step-by-step walkthrough of the end-to-end MatriSense patient triage and health worker referral validation loops:

### 1. Mother Side: Register & Profile
1.  Visit the application homepage.
2.  Click **"Register as Mother"** and complete the form (Name, Age, Gestational Weeks, Phone).
3.  Navigate to the **Profile** dashboard.
4.  Optionally share GPS location or manually assign district/upazila (e.g., Sylhet).

### 2. Mother Side: Report Symptoms
1.  Click **"Start New Triage"**.
2.  In the Bangla text field, describe symptom complaints naturally (e.g., `মাথা ব্যথা এবং চোখে ঝাপসা দেখছি` — headache and blurry vision).
3.  Click **"Submit Symptoms"**.

### 3. AI Extraction & Confirmation
1.  Inspect the extracted structured symptom codes (e.g., `headache` and `blurred_vision`).
2.  Read the LLM Explanation detailing which text segments triggered which symptom codes.
3.  Click **"Confirm Symptoms"**.

### 4. Follow-Up Questions
1.  The clinical engine will dynamically present specific follow-up questions (e.g., "Is there vaginal bleeding?" or "Any facial swelling?").
2.  Submit answers in Bangla; the AI will parse and log the additional symptom records.

### 5. View Triage Result
1.  View the triage output: risk level classification (e.g., **HIGH** risk due to preeclampsia danger signs).
2.  Read the safety-validated care guidance translated into clear, reassuring Bangla.
3.  Inspect the prominent urgent warning signs checklist.

### 6. Health Worker Side: Register & Verify
1.  In a separate browser session/tab, click **"Register as Health Worker"**.
2.  Submit credentials and upload a mock license file. The account enters `pending` status.
3.  *(Admin verification)*: The system administrator verifies the worker, updating status to `active`.

### 7. Health Worker: Dashboard Queue
1.  Log in as the verified health worker.
2.  The home dashboard immediately lists active metrics (e.g., pending cases, referral statuses).
3.  Click **"View Cases"** and filter by district to view the mother's active high-risk case in the triage queue.

### 8. Health Worker: Case Review
1.  Click the mother's record to load the full detail panel.
2.  Review raw symptoms, AI extraction explanations, risk flags, and follow-up responses.
3.  Observe the interactive map locating the patient alongside nearby seeded clinics.

### 9. Health Worker: Hospital Assignment
1.  Click **"Assign Hospital"** on the case file.
2.  The modal queries the seeded hospital database and lists nearby facilities sorted by Haversine distance (closest first).
3.  Select the optimal facility (e.g., Sylhet District Hospital) and click **"Select Hospital"**.

### 10. Health Worker: Deliver Referral
1.  Click **"Deliver Referral to Patient"** on the mother's case details.
2.  Add custom instruction notes and click confirm. The backend pushes the referral note.

### 11. Mother Side: Acknowledge Referral
1.  Switch back to the mother's session/tab.
2.  The dashboard updates dynamically to reveal a **Referral Alert**.
3.  Click the alert to view full facility information (name, type, address, emergency contact numbers, and maternity services).
4.  Tapping **"Acknowledge Referral"** completes the loop.

### 12. Health Worker: Final Follow-Up
1.  The health worker dashboard updates instantly to show the referral is marked as `acknowledged`.
2.  The health worker logs final coordination notes (e.g., "Mother confirmed traveling tomorrow morning").
3.  The case history and system-wide AuditLog log all transactional events for future audits.
