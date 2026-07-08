# MatriSense: AI-Augmented Maternal Triage & Referral Support System

MatriSense is a safe, Bangla-first, AI-augmented maternal triage and regional referral support system designed for rural Bangladesh. It enables pregnant mothers to report symptoms in colloquial Bangla, parses the input into structured clinical facts using LLMs, and triages urgency using a deterministic, rule-based clinical engine. Safe, source-grounded care steps and warning signs are retrieved via a rule-aware Hybrid RAG pipeline and displayed in accessible Bangla. For high-risk cases, the system routes structured patient records to a regional Health Worker Dashboard for human-led referral and hospital assignment.

---

## 🚀 Key Features

*   **Bangla Symptom Parser:** Natural language extraction that maps colloquial Bangla symptoms to structured clinical identifiers.
*   **Deterministic Triage Engine:** Powered by `json-rules-engine` to check maternal warning signs based on WHO/CDC guidelines.
*   **Rule-Aware Hybrid RAG:** Fetches validated pregnancy self-care and warning-sign guidelines dynamically filtered by risk-level allowances.
*   **Clinical Safety Validator:** post-generation filter preventing LLM diagnoses, drug prescriptions, or false reassurance.
*   **Health Worker Dashboard:** Priority case queueing, detailed audit trails, follow-up scheduling, and interactive Leaflet maps with spatial hospital locator databases.
*   **6-Hour GPS Caching:** Robust local storage location caching for offline capability and strict user privacy.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework:** Next.js (App Router), React.js
*   **Styling:** Tailwind CSS (curated high-contrast accessible color palette)
*   **Maps:** Leaflet & OpenStreetMap (for maternity clinic finder)
*   **Forms/Validation:** React Hook Form & Zod

### Backend
*   **Environment:** Node.js, Express.js
*   **Database:** MongoDB Atlas, Mongoose
*   **Rules Engine:** `json-rules-engine`
*   **RAG Embeddings:** local inference with `Xenova/multilingual-e5-small`

### AI & LLM Integration
*   **Model:** Google Gemini 1.5 Flash (via official Google Gen AI SDK)

---

## 📖 Third-Party Attributions

As per Section 10.2 of the SciBlitz AI Challenge Rulebook, here are the third-party resources, models, and libraries used in this project:

### Models
*   **Google Gemini 1.5 Flash:** Used for zero-shot structured symptom extraction and natural language translation/explanation.
*   **Xenova/multilingual-e5-small:** Hugging Face embedding model used locally for semantic document chunk search.

### Datasets & Guidelines
*   **WHO Antenatal Care Guidelines (2016):** Clinical basis for maternal risk rules and danger-sign detection.
*   **CDC HEAR HER Campaign:** Source guidelines for urgent warning signs and symptom checklists.
*   **NHS UK Pregnancy Guide:** Source guidelines for low-risk maternal self-care recommendations.

### Key Libraries
*   `json-rules-engine` (MIT) — Rule-based clinical triage evaluation.
*   `leaflet` (BSD-2) & `react-leaflet` (MIT) — Geolocation and interactive hospital map search.
*   `mongoose` (MIT) — MongoDB object modeling.
*   `jsonwebtoken` (MIT) & `bcryptjs` (MIT) — User auth security.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Atlas Connection URI
*   Google Gemini API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```

---

## 👥 Demo Accounts

You can log in and test both panels using the seeded mock credentials:

*   **Mother Panel (Patient Side):**
    *   **Email:** `mother@demo.com`
    *   **Password:** `password`
*   **Health Worker Dashboard:**
    *   **Email:** `worker1@demo.com`
    *   **Password:** `password`
