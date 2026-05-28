# Roadmap

Our development strategy is designed to iteratively move from our working clinical MVP to a fully decentralized, clinically validated community health suite.

### Short Term (Months 1-3)
*   **Stabilize MVP:** Complete end-to-end user testing across mock clinics.
*   **Regional Referral Workflow:** Finalize Haversine distance-based local hospital search, selection, and patient acknowledgment notification loops.
*   **Health Worker Verification:** Launch administrative portal for verifying licenses of newly registered clinic workers.
*   **Realistic Seed Data:** Deploy simulated multi-symptom clinical cases across different districts for training demonstrations.
*   **Interactive Documentation:** Overhaul public guides to load dynamically from localized Markdown files.

### Mid Term (Months 4-6)
*   **Vector RAG Integration:** Embed authoritative maternal health guidelines using multilingual embeddings with strict rule pre-filtering.
*   **Analytics Dashboard:** Aggregate case frequencies, danger-sign distributions, and referral audit loops filtered by upazila and district.
*   **Offline Synchronization:** Implement local PouchDB/SQLite sync for Android tablets to record symptoms in deep rural clinics without internet.
*   **Direct Push Notifications:** Integrate cellular SMS gateways for patient notifications and direct alert logs.
*   **Expanded Dialects:** Support local Sylheti and Chittagonian voice translations.

### Long Term (Months 7+)
*   **GraphRAG Reasoning:** Construct a clinical maternal health knowledge graph linking symtoms, warning signs, rules, guidance, and historical outcomes.
*   **Local LLM Inference:** Run quantized, lightweight models (e.g., Llama-3-8B-Instruct or specialized Bangla models) directly offline on clinic tablets.
*   **Multi-Tenant NGO Platform:** Release secure B2B SaaS framework supporting multiple independent healthcare organizations.
*   **Government DHIS2 Integration:** Connect referrals and danger-sign occurrences directly into Bangladesh's national health registry.
