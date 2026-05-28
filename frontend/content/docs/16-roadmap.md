# Roadmap

MatriSense is moving from a working MVP toward a stronger, safer, and more deployable maternal triage and referral platform.

### Short Term
*   **Stabilize MVP:** Keep the patient → triage → health worker flow reliable.
*   **Profile and Records:** Polish patient and health worker profile editors, optional document uploads, and verification-pending states.
*   **Regional Referral:** Complete district/upazila filtering, seeded hospital lookup, and manual hospital assignment.
*   **Docs and Evidence:** Keep `/docs` updated through Markdown files and add public evidence references.
*   **Testing:** Add more synthetic LOW, MEDIUM, and HIGH triage test cases.

### Mid Term
*   **Vector RAG:** Embed guideline chunks or knowledge cards with metadata filters for symptom, risk level, guidance type, and evidence tag.
*   **Analytics:** Add risk distribution, pending cases, referral status, district workload, and follow-up metrics.
*   **Notifications:** Add SMS, voice call handoff, or app notifications for urgent follow-up where feasible.
*   **Privacy Hardening:** Improve consent text, access logging, document permissions, and data retention settings.
*   **Clinical Review:** Add supervised review tools for experts or administrators.

### Long Term
*   **GraphRAG:** Build a knowledge graph connecting symptoms, danger signs, rules, risk levels, actions, and sources.
*   **Offline-Friendly Mode:** Support low-bandwidth or intermittent-connectivity workflows.
*   **Local LLM Experiments:** Explore local or private model inference for sensitive deployments.
*   **Institutional Deployment:** Pilot with clinics, NGOs, or maternal health programs.
*   **Integration:** Explore connection with existing public health reporting or facility systems after governance review.
