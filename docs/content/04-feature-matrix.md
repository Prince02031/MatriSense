# Feature Matrix

### Implemented & Finalized
*   **Patient Registration & Profile Management:** Basic pregnancy profiles and personal details.
*   **Bangla Voice/Text Input:** Symptoms recorded in native Bangla (voice transcribed dynamically).
*   **AI Symptom Extraction:** Converts Bangla input into standardized clinical symptom facts.
*   **Deterministic Rule-Based Triage:** Classifies urgency (LOW/MEDIUM/HIGH) via danger signs, bypassing LLMs for safety-critical decisions.
*   **Rule-Aware RAG Guidance:** Dual Vector and JSON/Card retrieval grounding, constrained by active urgency levels.
*   **Output Safety Validator:** Layer checking for forbidden inputs (diagnoses, dosages, risk downgrades, or unsafe delay advice).
*   **AI Guided Care Assistant:** Chatbot assisting with triage queries, emotional support, and emergency escalations.
*   **Interactive Chatbot Referrals:** Allows patients to search nearby facilities, view them on a map, and submit clinic preferences.
*   **Regional Referral System:** Location-based lookup, district/upazila filtering, and manual hospital assignments by health workers.
*   **Health Worker Verification Workflows:** Verification upload portal for certification files, checked by system admins.
*   **Model Context Protocol (MCP) Integration:** Dual custom MCP servers (`matrisense-case-context-mcp` and `matrisense-referral-mcp`) exposing standard tool suites.
*   **Local LLM Integration:** Local deployment scripts and setup instructions for Ollama and Qwen for offline-ready setups.
*   **Evidence Library:** Core evidence library database connected to source guidelines, PDFs, and Markdown.
*   **Admin Documentation Controls:** Live config controls for system docs visibility.

### In Progress / Integration Stage
*   **Hybrid Graph RAG Extension:** Graph traversal hooks linking symptom-risk-source nodes together.
*   **In-App Notification Center:** Alert system for health workers on new assigned high-risk cases.

### Planned
*   **SMS & Outbound Telephony Alerts:** Direct mobile SMS notification alerts when high-risk triage sessions are submitted.
*   **Program Monitoring & Analytics Dashboard:** District-level charts tracking maternal symptom trends, referral rates, and hospital capacities.
*   **Offline-First Native App:** Progressive Web App (PWA) supporting offline symptom-cache buffering for remote field workers.
