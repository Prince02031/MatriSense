# Regional Referral & Hospital Assignment

A key pillar of MatriSense is bridging the gap between screening in rural clinics and emergency hospital services.

### Health Worker Coverage Mappings
Health workers are assigned specific administrative regions (districts and upazilas) upon registration. This ensures local cases are handled by health workers familiar with local clinics, road conditions, and community challenges.

### GPS & Patient Location Capture
When starting a triage, patients can choose to share their GPS location. If GPS is unavailable, patients select their division, district, and upazila from simple drop-down lists. Location details are saved as an immutable snapshot within the triage session.

### Seeded Regional Hospital Database
The system is pre-populated with active maternal healthcare centers, upazila health complexes, and district hospitals across Bangladesh. Database attributes include name, facility type, administrative region, GPS coordinates, available maternity services (e.g., ICU, emergency C-section, neonatal care), and contact phone numbers.

### Distance-Based Hospital Search
When a health worker marks a case as HIGH risk, they click "Assign Hospital." The dashboard performs a Haversine distance query comparing the patient's saved coordinates with hospitals in the database. Facilities are displayed ordered by proximity.

### Real-Time Referral Delivery
1.  **Selection:** Worker selects the target hospital and adds specific coordinator notes.
2.  **Referral Log:** The backend logs a new `ReferralNote` record.
3.  **Push Delivery:** The patient's dashboard is updated instantly via real-time listeners, displaying the hospital name, type, address, emergency contact, and service details.
4.  **Acknowledgment:** The patient taps "Acknowledge Referral," updating the health worker's dashboard instantly.
