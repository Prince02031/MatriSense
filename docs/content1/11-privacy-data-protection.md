# Privacy & Data Protection

MatriSense prioritizes the absolute security and privacy of sensitive maternal health data.

### Patient Data Collected
*   **Profile Data:** Full name, age, phone number, village address, gestational weeks.
*   **Pregnancy Details:** Last Menstrual Period (LMP), Expected Date of Delivery (EDD), count of previous pregnancies.
*   **Triage Records:** Natural language symptom input (Bangla), AI-extracted symptom codes, triage risk level, follow-up answers, and retrieved guidance.
*   **Location Snapshot:** GPS coordinates (if enabled) captured at triage start to filter nearby hospitals.
*   **Medical Files:** Optional uploads of previous prescriptions, clinical reports, or national identity documents for profile verification.

### Health Worker Records
*   **Verification Profile:** Name, email, mobile phone, assigned district and upazilas, uploaded professional license photo, account status (pending/verified).
*   **Action Log:** Immutable record of case reviews, status changes, and hospital referral deliveries.

### Data Security Controls
*   **Role-Based Access (RBAC):** Patients only view their own triage history. Health workers only access active cases mapped within their primary coverage district and upazilas. Admins manage system settings but do not browse medical history without audit tracking.
*   **Regional Access Isolation:** Strict query boundaries prevent a health worker registered in Sylhet from viewing case logs originating in Dhaka or Chittagong.
*   **Audit Logging:** Critical state alterations (such as assigning a hospital, changing case status, or overriding health worker verification) are permanently stored in an immutable `AuditLog` database table including action details, user references, and double-entry changes.
*   **Data in Transit and Rest:** All network packets are encrypted via HTTPS (SSL/TLS). Persistent databases are encrypted at rest using industry-standard AES-256 protocols.
