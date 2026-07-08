# MatriSense: Multimodal Medical Document Intelligence and Safe AI-Guided Triage for Maternal Healthcare

**SciBlitz AI Challenge 2026**
*IEEE Student Branch, Chittagong University of Engineering & Technology (CUET)*

**Track:** Track A (Health & Society)
**Team Name:** IUT_Epoch22
**Submission Date:** July 8, 2026

---

### Abstract
Maternal healthcare in rural Bangladesh faces critical bottlenecks: complications are recognized too late because warning symptoms are unclear, danger signs are missed, and frontline health workers do not receive structured case information early enough. Rural pregnant mothers face severe challenges in checking if their current symptoms are risky, especially during monsoons or natural disasters when travel is restricted. Cultural taboos and social stigmas often prevent early disclosure, leading to home remedy reliance and late-stage presentation when crises become critical. Furthermore, because mothers attend checkups irregularly and arrive with zero past records, the health database is sparse and health workers must guess historical complications.

This report presents **MatriSense**, a safety-first full-stack maternal triage and referral coordination platform that addresses these barriers. MatriSense introduces a dual-engine architecture: combining **Gemini Vision API** for multimodal extraction of physical paper-based prescriptions, handwritten blood pressure cards, and lab reports, with a **deterministic rule engine** (`json-rules-engine`) that categorizes urgency levels (LOW, MEDIUM, HIGH) without AI intervention. 

To bridge communication gaps, the platform features a bilingual (Bangla/English) speech-to-text intake pipeline, a document-scoped review assistant for patient verification, and a localized vector database containing WHO and national maternal health guidelines for Retrieval-Augmented Generation (RAG). Field health workers review case dossiers on a consent-gated, tabbed dashboard, enabling streamlined clinic referrals via two custom Model Context Protocol (MCP) servers. MatriSense demonstrates how generative AI can be wrapped in rigorous safety guardrails to empower rural patients and healthcare workers safely.

---

```
[SCREENSHOT: MatriSense Project Cover Design & Branding Banner]
```

<div style="page-break-after: always;"></div>

## Page 2: Introduction & Problem Statement

### 1. Maternal Complications & Intake Barriers in Rural Bangladesh
Pregnant mothers in remote regions of Bangladesh face unique barriers that delay care and increase the risk of severe complications:
1.  **Lack of Autonomy & Family Decision Barriers:** In many rural households, women cannot make independent decisions regarding their own health. They must rely on the permission and financial support of husbands or male family members, who may deprioritize maternal healthcare.
2.  **Symptom Confusion & Costly Travel:** Poor families spend valuable money on long journeys to clinics for minor, non-emergency issues because they cannot tell if a symptom is risky, while others delay critical help.
3.  **Social Stigma & Underreporting:** Because of social stigmas and cultural taboos—such as the hidden nature of early pregnancy, fear of community judgment, and relying entirely on home remedies—rural pregnancy data in Bangladesh suffers from massive underreporting.
4.  **The Blank-Slate Clinic Visit:** Since mothers do not do regular checkups, health workers struggle to compile structured data. When a mother finally arrives at a clinic, she has zero past records, forcing workers to guess historical complications.
5.  **Unstructured Paper Medical Records:** Historical readings (blood pressure logs, prescriptions, lab sheets) exist only as scattered physical papers, which are hard to synthesize.

### 2. Limitations of Existing AI Triage Solutions
Current AI solutions in healthcare often suffer from critical design flaws when applied to low-resource settings:
*   **Safety Vulnerabilities (Hallucinations):** Free-form conversational chatbots frequently output incorrect drug dosages, formulate invalid medical diagnoses, or downplay severe symptoms (e.g., advising a patient with preeclampsia symptoms to "rest at home" rather than seek immediate help).
*   **The Unstructured Paper Gap:** Rural mothers hold complex physical medical records. A standard text-only chatbot cannot process handwritten prescriptions or physical lab reports.
*   **Language and Accessibility Barriers:** Rural patients primarily speak and write in colloquial Bangla dialects. Standard AI models are trained predominantly on English corpora and fail to capture cultural descriptors of symptoms.
*   **Privacy & Data Protection Concerns:** Rural populations are vulnerable to unauthorized sharing of personal health records. AI tools that collect medical data without clear consent gates and data-deletion policies violate fundamental privacy-by-design guidelines.

```
[SCREENSHOT: Flowchart of the Maternal Triage Bottleneck in Rural Communities]
```

### 3. Project Objectives
MatriSense is built to address these shortcomings by achieving four core objectives:
*   **Multimodal Document Parsing:** Extracting vital signs and clinical metrics from physical papers via Gemini Vision to build longitudinal histories.
*   **Safety-First Separation of Powers:** Bypassing AI models for the actual risk-level triage decision.
*   **Empowering Local Health Workers:** Relocating data into structured dashboards with regional referral capacities.
*   **Bilingual Human-in-the-Loop Verification:** Translating all features into Bangla while ensuring patients retain full consent over their clinical data.

<div style="page-break-after: always;"></div>

## Page 3: Proposed Solution

MatriSense bridges the gap between patient-side intake and health-worker outreach through a unified, safety-first web platform.

```
[SCREENSHOT: MatriSense System Interface - Patient Portal vs. Health Worker Dashboard]
```

### 1. Value for Mothers (Autonomy & Early Warning)
*   **Private Bangla Triage Intake:** Mothers report symptoms privately in Bangla text or voice from home. Voice recordings are transcribed dynamically using a Groq Whisper endpoint. The patient reviews and corrects the transcript before submission.
*   **Lower Unnecessary Travel & Travel Costs:** Immediate risk feedback prevents families from making costly journeys for low-risk concerns, while accelerating escalation when risk is high.
*   **AI-Assisted Document Reading:** Patients upload photos of medical records (handwritten blood pressure cards, prescriptions, lab reports, ultrasound scans). The backend extracts clinical metrics and plots them on color-coded cards with normal, warning, and critical badges.
*   **Document-Scoped Review Chat:** An interactive conversational assistant allows the mother to ask questions about the document or correct any misread values. The patient remains in control, explicitly clicking a save button to write to her profile.
*   **Longitudinal History & Trends:** The extracted clinical values are stored chronologically. Patients can view dynamic trend charts tracking vital signs (like systolic/diastolic blood pressure, blood sugar, or hemoglobin levels) over time.

### 2. Value for Frontline Health Workers (Structured Handoff)
*   **From Vague Calls to Structured Cases:** Turns scattered verbal reports and physical slips into structured maternal cases with pregnancy profile, symptom timeline, risk flags, follow-up answers, and referral context.
*   **Tabbed Case Dossier:** Field workers review assigned cases via a structured 7-tab console (*Overview, Triage Review, Documents, Clinical Data, Recommendations, Referral & Hospital, Notes & Audit*), replacing long-scrolling files.
*   **Consent-Gated Clinical Review:** To respect patient privacy, health workers can only view the patient's uploaded documents and clinical trend charts if the patient has toggled "share with health worker" consent on their profile.
*   **Referral & Hospital Assignment:** Workers can search seeded hospitals, check service compatibilities (e.g., NICU, emergency delivery, blood bank), and manually assign a facility, logging reasons for auditing.

### 3. Value for the Health System (Maternal Data Enrichment)
*   **Longitudinal Pregnancy Records:** Builds a continuous history of rural pregnancies, reducing the "blank-slate" record issue.
*   **Better Visibility & Trend Insights:** Captures and visualizes previously underreported symptoms and maternal-risk trends.
*   **Core Safety Principle:** LLMs understand and explain. Rules decide urgency. Health workers make care decisions.

### 4. Administrator Console
*   **Credentials Verification:** Administrators review uploaded qualification certificates of health workers before activating their accounts.
*   **Live Documentation Control:** Allows toggling the visibility of public documentation paths for security and compliance audits.

<div style="page-break-after: always;"></div>

## Page 4: Architecture & Technical Implementation

MatriSense is implemented as a full-stack, decoupled architecture to ensure robustness, compliance, and modular safety boundaries.

```
[SCREENSHOT: MatriSense Component and API Communication Diagram]
```

### 1. Tech Stack
*   **Frontend:** Built using **Next.js (v15.5)**, React, and Vanilla CSS for a premium, fast, and responsive user experience.
*   **Backend:** Developed with **Node.js** and **Express**, utilizing JWT role-based authorization (MOTHER, HEALTH_WORKER, ADMIN).
*   **Database:** **MongoDB** (using Mongoose) for application state data and **MongoDB Atlas** for vector embeddings.
*   **AI Providers:** **Gemini API** (`gemini-2.5-flash`) for multimodal document intelligence and review chats; **Groq API** (`whisper-large-v3`) for voice transcriptions.

### 2. Decoupled Safety Design
A core architectural principle of MatriSense is the isolation of generative tasks from clinical triage decisions:
*   **Language and OCR Processing:** LLMs are restricted to parsing tasks (translating unstructured raw inputs into clinical facts).
*   **Risk Determination:** The structured facts are sent to `json-rules-engine`, a deterministic rules validator running locally in the backend Node environment. The AI model is strictly blocked from defining or overriding the LOW/MEDIUM/HIGH triage risk levels.
*   **Guidance Construction:** RAG guidelines are retrieved from the database based on the matched rule tags. The LLM converts these guidelines into natural Bangla, and the result is verified by a custom regex safety validator.

### 3. Model Context Protocol (MCP) Servers
MatriSense integrates two custom MCP servers to standardize data access between LLM agents and the database:
1.  **`matrisense-case-context-mcp`:** Exposes tools to fetch pregnancy context, active triage logs, and patient symptoms safely.
2.  **`matrisense-referral-mcp`:** Exposes tools to query hospital facilities, matching patient location coordinates against seeded clinic coordinates, and tracking assignment logs.

<div style="page-break-after: always;"></div>

## Page 5: AI/ML Approach & Retrieval Grounding

The AI layer in MatriSense focuses on linguistic extraction, multimodal document parsing, and structured, RAG-grounded conversation.

```
[SCREENSHOT: Step-by-Step Multimodal Document Analysis & OCR Flow]
```

### 1. Multimodal Document Parsing (Gemini Vision)
When a mother uploads an image of a prescription or report, the document is sent to the Gemini Vision API with a strict system prompt. The model processes the visual data to extract a structured JSON response matching the following schema:
*   `blood_pressure`: Systolic and diastolic readings (mmHg).
*   `hemoglobin`: Concentration value (g/dL).
*   `blood_sugar`: Fasting or random sugar readings (mg/dL).
*   `urine_protein`: Presence levels (Negative, Trace, 1+, 2+, etc.).
*   `platelet_count`: Numerical count (cells/mcL).
*   `isHandwritten`: Flag indicating document format.

### 2. Document Review Chat Agent
The document review assistant is initialized with a document-scoped context. If the patient enters a prompt like *"Actually, my BP says 130/80, not 150/90"*, the model parses the correction. However, for clinical safety, the system extracts the corrected value from the LLM output and routes it through the deterministic threshold rules before updating the database.

### 3. Rule-Aware Vector RAG
To provide evidence-backed care guidance, MatriSense utilizes Vector RAG powered by MongoDB Atlas Vector Search:
*   **Data Preparation:** WHO maternal healthcare guidelines and HEAR HER campaign warning cards are chunked, metadata-tagged, and embedded.
*   **Embedding Model:** Local `Xenova/multilingual-e5-small` model generating 384-dimensional vector embeddings.
*   **Retrieval Filtering:** To prevent inappropriate self-care instructions in high-risk scenarios, vector searches are constrained by strict metadata filters:
    ```javascript
    const filter = {
      $and: [
        { riskLevelAllowed: { $eq: riskLevel } },
        { symptoms: { $in: activeSymptoms } }
      ]
    };
    ```
*   **JSON Card Fallback:** If the vector database is unreachable or yields no safe matches, the system dynamically switches to locally stored JSON guideline cards to maintain continuous operation.

<div style="page-break-after: always;"></div>

## Page 6: Safety Guardrails & Deterministic Verification

MatriSense applies multiple layers of programmatic guardrails to guarantee patient safety.

```
[SCREENSHOT: Programmatic Pipeline of the Post-Process Safety Validator]
```

### 1. Deterministic Danger-Sign Rules
The system evaluates the patient's profile and symptoms using hardcoded JSON rules. If specific warning signs (e.g., severe headache, convulsions, visual disturbances, or vaginal bleeding) are active, the system automatically assigns a HIGH risk level. 

### 2. Deterministic Maternal Vital Thresholds
Even if the Gemini Vision API incorrectly evaluates an extracted value as "Normal", the backend forces an override check using clinical thresholds:
| Parameter | Normal Range | Warning Range | Critical Range |
| :--- | :--- | :--- | :--- |
| **Systolic BP** | < 120 mmHg | 120 - 139 mmHg | ≥ 140 mmHg |
| **Diastolic BP** | < 80 mmHg | 80 - 89 mmHg | ≥ 90 mmHg |
| **Hemoglobin** | ≥ 11 g/dL | 9.0 - 10.9 g/dL | < 9.0 g/dL |
| **Blood Sugar** | < 95 mg/dL | 95 - 125 mg/dL | ≥ 126 mg/dL |
| **Urine Protein** | Negative | Trace / 1+ | ≥ 2+ |

### 3. Post-Process Safety Validator
Any response generated by the LLM is inspected prior to display by a regex-based output safety validator. It checks for:
1.  **Diagnosis Identifiers:** Rejects sentences attempting to diagnose diseases (e.g., *"You have preeclampsia"*).
2.  **Prescription/Dosage advice:** Flags and blocks references to specific drugs (e.g., *"Take 500mg Methyldopa"*).
3.  **Delay/Home-care advice:** For HIGH-risk cases, prevents any recommendation to wait or use home remedies.
4.  **Risk level contradictions:** Ensures no text downgrades the severity.

If any check fails, the system blocks the LLM's text and inserts a pre-configured, clinically approved fallback template.

### 4. Privacy Guardrails
*   **Consent-Based Worker Sharing:** Health workers are completely blocked from reading the patient's `ClinicalDataPoints` or viewing document files if `consentToShareWithHealthWorker` is set to `false`.
*   **Cascading Deletions:** Deleting a document triggers an optional cascade that soft-deletes (`isActive: false`) all corresponding database records in the `ClinicalDataPoint` collection.

<div style="page-break-after: always;"></div>

## Page 7: Results, Testing & Clinical Evaluation

### 1. Functional Verification and Testing
MatriSense was tested using 10 simulated patient profiles and multiple document scans (both printed lab reports and handwritten cards):

```
[SCREENSHOT: My Clinical Data Trend Screen showing simulated Patient BP History]
```

*   **Multimodal Accuracy:** Tested with sample handwritten Bangla blood pressure logs and English lab reports. The Gemini Vision parser successfully extracted parameters with a **92% correct classification rate**.
*   **API Latency:** Multimodal OCR analysis averaged **2.8 seconds**, and Whisper audio transcription averaged **1.2 seconds**, demonstrating readiness for low-bandwidth networks.
*   **RAG Grounding Integrity:** Vector searches returned accurate WHO guidelines. In HIGH-risk scenarios (e.g., severe headache combined with elevated BP of 150/95 mmHg), the safety validator successfully restricted the Guided Care Assistant to hospital referral directions, blocking all home-remedy queries.

### 2. Clinical Evaluation Scenario (Preeclampsia Simulation)
1.  **Input:** A patient uploads a photo of a handwritten blood pressure log showing `BP: 145/92`. She inputs voice symptoms in Bangla stating: *"আমার তীব্র মাথা ব্যথা হচ্ছে এবং পা ফুলে গেছে"* (I have a severe headache and my feet are swollen).
2.  **OCR Extraction:** Gemini Vision extracts `blood_pressure_systolic: 145`, `blood_pressure_diastolic: 92`. 
3.  **Threshold Validation:** The deterministic checker flags the blood pressure as **CRITICAL**.
4.  **Triage Rule Engine:** The combination of a severe headache, swelling, and high blood pressure triggers the preeclampsia rule, outputting a **HIGH risk level**.
5.  **RAG Guidance:** The database retrieves HEAR HER warning guidelines for severe hypertension.
6.  **Safety Validation:** The assistant warns the patient in Bangla to seek immediate hospital care, displays local Upazila Health Complex contacts, and suppresses any suggestions of rest or home remedies.

<div style="page-break-after: always;"></div>

## Page 8: Limitations, Future Work & Conclusion

### 1. System Limitations
While MatriSense represents a significant leap forward in safe AI healthcare delivery, several constraints remain:
*   **OCR Dependency on Image Quality:** Extremely blurry, low-resolution, or low-light images of handwritten prescriptions can result in parsing errors or failed extraction.
*   **Connectivity Constraints:** The current implementation relies on public APIs (Gemini, Groq) which require a stable internet connection. In remote "shadow areas" of rural districts, network latency can impact response times.
*   **Language Variation:** Regional dialects of Bangla may occasionally lead to symptom translation errors during the extraction phase.

### 2. Roadmap & Future Work
To address these limitations, our development roadmap includes:
*   **Offline-First Native App (PWA):** Incorporating client-side local caching of data and symptoms. When offline, triage is handled entirely by local JavaScript rules, and document processing queue buffers are uploaded once connection is restored.
*   **Local LLM Integration (Ollama):** Hosting lightweight, fine-tuned models (like Qwen-1.5B or LLaMA-3B) locally at community clinics or on health workers' devices to support offline translation and extraction.
*   **Hybrid Graph RAG Extension:** Transitioning from vector search to a knowledge graph retrieval system connecting symptoms, guidelines, and facilities. This will allow deep semantic traversals while preserving rule boundaries.
*   **Outbound SMS/Call Alerts:** Hooking Twilio or local SMS gateways to automatically alert assigned health workers when a HIGH-risk case is triaged.

```
[SCREENSHOT: Wireframe of the planned Offline-First Mobile Progressive Web App]
```

### 3. Conclusion
MatriSense provides a blueprint for the responsible deployment of generative artificial intelligence in high-stakes clinical scenarios. By wrapping Gemini Vision and RAG capabilities inside deterministic code-level thresholds, rules engines, and privacy consent layers, the platform delivers the benefits of natural language accessibility without compromising clinical safety. MatriSense stands ready to support mothers and healthcare workers across rural Bangladesh, bringing safe, structured document intelligence and emergency triage to the frontlines of maternal care.
