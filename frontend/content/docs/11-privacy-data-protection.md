# Privacy & Data Protection

MatriSense handles sensitive maternal health information, so privacy must be part of the product design from the beginning.

### Patient Data Collected
*   **Profile Data:** Name, age, phone number, pregnancy stage, gestational week, expected delivery date, last checkup date, known risk factors, and emergency contact.
*   **Triage Records:** Bangla symptom input, extracted symptoms, confirmed symptoms, follow-up answers, rule decision, RAG guidance, safety output, and triage history.
*   **Location Data:** Division, district, upazila/thana, village/address, and optional GPS coordinates when the user gives permission.
*   **Optional Documents:** National ID, birth certificate, previous prescriptions, medical reports, and related documents may be uploaded only if the user chooses.

### Health Worker Records
*   **Worker Profile:** Name, email or phone, assigned region or coverage area, and profile information.
*   **Certification Data:** Health worker certification or supporting documents may be required, but the MVP can keep the account as verification pending until admin review.
*   **Worker Actions:** Status updates, referral notes, hospital assignments, and audit events can be linked to the worker account.

### Access and Control
*   **Role-Based Access:** Mothers should only access their own profile, triage history, and results. Health workers should access assigned or permitted cases. Admin access should be limited and auditable.
*   **Optional GPS:** GPS must be permission-based and should never be required to complete emergency triage.
*   **Optional Patient Documents:** Identity and medical documents should support case review and referral decisions, but they should not be mandatory for emergency symptom reporting.
*   **Regional Access:** District/upazila-based case filtering is planned or in progress to reduce unnecessary exposure of patient records.
*   **Audit Logs:** Important actions such as status changes, referral notes, hospital assignment, and verification updates should be logged.

### MVP Privacy Position
The hackathon demo should use synthetic or test data. Real patient deployment would require stronger consent language, data retention policy, access review, storage protection, and clinical/governance approval.
