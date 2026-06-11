# Product Overview

### Mother Side & Interactive Chatbot Referral
A mother or family caregiver creates a basic pregnancy profile, reports symptoms in Bangla, and confirms extracted symptoms before receiving a rule-based triage risk level (LOW/MEDIUM/HIGH). Post-triage, she can interact with the **AI Guided Care Assistant**, a stateful chatbot that:
*   Explains triage urgency and recommended next steps without diagnosing.
*   Enables location-based hospital searches directly within the chat.
*   Allows the mother to select and submit a preferred hospital for regional referral coordination.
*   Presents a visual map showing facility locations, services, and distances.

### Health Worker Side & Outreach
Field-level health workers access a structured dashboard, bypassing unstructured messaging. They can view triage logs, historical cases, risk tags, and original Bangla reports. Health workers can audit case justifications, view matching RAG evidence, review patient-preferred hospital selections, and assign or reassign facilities based on real-time capacities.

### Security, Consent & Privacy
To protect rural mothers, MatriSense enforces strict privacy-by-design guidelines:
*   **Consent-Based Uploads:** Uploading medical certificates, NID/birth cards, or prescriptions is entirely optional and consent-based. These files support worker verification and are never used to train models.
*   **Voice Privacy:** Voice-to-text symptom reporting transcribes audio on-the-fly via secure Groq Whisper endpoints, discarding raw audio files immediately.
*   **Access Control:** Strict role-based JWT authentication isolates patient profiles, health worker dashboards, and administrator pages.
*   **Verification Gatekeeping:** Health-worker account activations require manual document verification by system administrators before clinical case data can be viewed.

### Regional Referral Workflow
Regional referral support is driven by a custom Model Context Protocol (MCP) server that hooks into MongoDB. It enables real-time lookup of regional hospitals, filters patients by upazila/district, and records audit logs for hospital assignments. The frontend map client matches patient geolocations to seeded clinics to recommend the closest eligible facility.
