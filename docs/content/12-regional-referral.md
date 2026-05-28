# Regional Referral & Hospital Assignment

Regional referral is designed to make MatriSense feel like a real maternal care coordination workflow, not only a triage chatbot.

### Health Worker Coverage Mappings
Health workers can be associated with coverage districts and upazilas. This helps workers focus on cases from their assigned region and prevents dashboards from becoming overloaded with unrelated cases.

### Patient Location Snapshot
When a triage session starts, the system can store a snapshot of the mother’s profile and location. This can include district, upazila/thana, address or village, and optional GPS coordinates. Emergency triage must still work if location is missing.

### Seeded Hospital Database
The MVP uses seeded facility data instead of live hospital discovery. A hospital record can include name, type, division, district, upazila/thana, address, latitude, longitude, phone, services, and active status.

### Hospital Lookup
If GPS is available, the system can sort facilities by approximate distance using Haversine distance. If GPS is not available, it can return same-district or same-upazila hospitals. Missing location should show a helpful empty state rather than crashing.

### Manual Hospital Assignment
A health worker manually assigns or reassigns a hospital from the case detail page. The system stores the assigned hospital snapshot, assignment time, worker ID, reason, and assignment history.

### Audit Trail
Hospital assignment and reassignment should create audit events when audit logging is available. The goal is transparency, not automation. MatriSense should not automatically choose the hospital or replace the health worker’s judgment.
