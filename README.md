# MatriSense: AI-native Bangla Maternal Triage and Health Referral System

**SciBlitz AI Challenge 2026**  
*Track A (Health & Society)*  
**Team:** IUT_Epoch22  

---

### 🚀 Live Deployment & Resource Links
*   **Frontend Application:** [https://matri-sense.vercel.app/](https://matri-sense.vercel.app/)
*   **Backend API Services:** [http://matrisense-production.up.railway.app](http://matrisense-production.up.railway.app)
*   **Demo Video:** [Link to Demo Video]() *(Placeholder)*
*   **System Architecture Diagram:** [ai_architecture_final_2_clear.png](docs/report/ai_architecture_final_2_clear.png)

---

## 📌 Project Overview
Maternal healthcare in rural Bangladesh suffers from critical delays in symptom recognition, lack of structured triage, and fragmented health-worker communication. **MatriSense** is a safety-first, Bangla-first maternal triage and referral coordination system designed to close this gap.

By combining Groq Whisper and Gemini APIs, the platform translates informal Bangla symptom reports and physical paper-based records (prescriptions, blood pressure cards, lab sheets) into structured, validated clinical metrics. Crucially, actual risk classification is driven by a deterministic local rules engine, bypassing LLM clinical judgment. Confirmed cases route to a consent-gated Health Worker Dashboard for Upazila-level facility routing.

---

## 🗺️ System Architecture
MatriSense is built with a strictly decoupled architecture, separating language processing and document extraction (generative AI) from clinical triage decisions (deterministic rules).

![MatriSense System Architecture Diagram](docs/report/ai_architecture_final_2_clear.png)

### Core Separation of Concerns:
1.  **AI Extraction Layer:** Groq Whisper transcribes spoken Bangla. Gemini 2.5 Flash extracts clinical metrics from text and physical paper uploads (prescriptions, blood pressure cards, lab reports).
2.  **Deterministic Rules Engine:** Extracted clinical data (systolic/diastolic blood pressure, hemoglobin, blood sugar, urine protein) is routed through `json-rules-engine` locally in the Node.js backend. **No AI model calculates the triage risk level.**
3.  **Rule-Aware RAG retrieval:** Guidelines from WHO and the HEAR HER campaign are stored in MongoDB Atlas and retrieved based on the patient's exact triage risk level and symptoms. High-risk patients cannot retrieve home-care guidance.
4.  **Post-Process Safety Validator:** All LLM responses are parsed by a regex-based output validator to block drug dosage recommendations, diagnoses, and home-care suggestions for high-risk cases.

---

## 🛠️ Technical Stack
*   **Frontend:** Next.js 15.5, React, Vanilla CSS (Deployed on Vercel)
*   **Backend:** Node.js, Express, JWT security (Deployed on Railway)
*   **Database:** MongoDB, Mongoose, MongoDB Atlas Vector Search
*   **AI Providers:** Gemini API (`gemini-2.5-flash`), Groq API (`whisper-large-v3`)
*   **Triage Engine:** Local `json-rules-engine`
*   **Embeddings:** Local `Xenova/multilingual-e5-small` (384-dim vectors)
*   **Interoperability:** Model Context Protocol (MCP) servers

---

## ✨ Key Features

### For Mothers (Private Intake & Document Intelligence)
*   🗣️ **Voice Triage in Bangla:** Mothers speak in colloquial Bangla. Groq Whisper transcribes the audio, displaying it as editable text for the patient to verify.
*   📸 **AI-Assisted Document Upload:** Patients upload photos of medical records. Gemini Vision extracts metrics and tags them with color-coded severity badges.
*   💬 **Document Review Chat:** A document-scoped assistant explains the medical record values in Bangla and allows mothers to correct any OCR extraction errors.
*   📈 **Clinical Data History:** Longitudinal trend charts track vital indicators (BP, hemoglobin, blood sugar) across the pregnancy.

### For Health Workers (Structured Outreach & Referrals)
*   📋 **Triage Case Console:** Prioritized list of active maternal cases with complete case details (pregnancy week, risk flag, symptoms, audit logs).
*   🔒 **Consent-Gated Privacy:** Patient document scans and trend charts are completely locked unless the patient explicitly toggles sharing consent on.
*   🏥 **Facility Referral Matching:** A dedicated referral panel allows searching for regional Upazila and district hospitals based on service capabilities (NICU, emergency delivery, blood bank).

### For Administrators (Auditing & Quality Control)
*   🔑 **Health Worker Verification:** Admins audit qualifications and activate health-worker accounts.
*   🛡️ **Live Documentation Control:** Control public visibility of API documentation for compliance audits.

---

## 🛡️ Safety & Quality Guardrails

### 1. Deterministic Maternal Vital Thresholds
Backend code overrides all OCR outputs to run them through absolute clinical thresholds:
| Parameter | Normal Range | Warning Range | Critical Range |
| :--- | :--- | :--- | :--- |
| **Systolic BP** | < 120 mmHg | 120 - 139 mmHg | ≥ 140 mmHg |
| **Diastolic BP** | < 80 mmHg | 80 - 89 mmHg | ≥ 90 mmHg |
| **Hemoglobin** | ≥ 11 g/dL | 9.0 - 10.9 g/dL | < 9.0 g/dL |
| **Blood Sugar** | < 95 mg/dL | 95 - 125 mg/dL | ≥ 126 mg/dL |
| **Urine Protein** | Negative | Trace / 1+ | ≥ 2+ |

### 2. Output Validator Regex Filters
Before displaying LLM text, a regex validator checks and intercepts:
*   **Diagnosis attempts:** E.g. *"You have preeclampsia."*
*   **Prescription/Dosages:** E.g. *"Take 500mg Methyldopa."*
*   **Home-care suggestions for high-risk patients:** Forces fallback to immediate referral templates.

---

## 🔌 Model Context Protocol (MCP) Servers
MatriSense includes two custom MCP servers to standardized data-sharing with clinical agents:
1.  **`matrisense-case-context-mcp`:** Accesses active patient triage details and pregnancy parameters.
2.  **`matrisense-referral-mcp`:** Facilitates GIS-based searches for hospitals with specialized capacities.

---

## 🏃 Local Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   MongoDB Instance (Local or Atlas)
*   Gemini API Key
*   Groq API Key

### Backend Setup
1.  Navigate to `/backend`
2.  Create a `.env` file from `.env.example`:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/matrisense
    JWT_SECRET=your_jwt_secret
    GEMINI_API_KEY=your_gemini_key
    GROQ_API_KEY=your_groq_key
    ```
3.  Install dependencies and start:
    ```bash
    npm install
    npm run dev
    ```

### Frontend Setup
1.  Navigate to `/frontend`
2.  Create a `.env.local` file:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:5000
    ```
3.  Install dependencies and start:
    ```bash
    npm install
    npm run dev
    ```
