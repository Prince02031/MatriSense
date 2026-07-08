# Feature Proposal: Multimodal Medical Document Intelligence

## Overview

A new AI-powered feature that lets mothers **photograph medical documents** (prescriptions, lab reports, blood pressure readings, ultrasound reports) and have MatriSense automatically extract clinically relevant data, flag maternal danger thresholds, and feed the results into the triage pipeline.

This uses **Gemini Vision** (multimodal AI) — the same Gemini SDK we already use for text, but now for images.

---

## The Problem It Solves

Rural mothers in Bangladesh frequently carry **paper documents** from local pharmacies, village doctors, or clinic visits:
- Handwritten prescriptions
- Printed blood test results (hemoglobin, blood sugar)
- Blood pressure readings scribbled on a card
- Urine test results (protein levels — critical for pre-eclampsia detection)

**They often can't read or interpret these documents.** A blood pressure reading of 150/95 mmHg means nothing to a mother who doesn't know the danger threshold is 140/90 during pregnancy. These critical values sit on paper and never reach anyone who can act on them.

---

## What the Feature Does

### Patient Side (Mother)
1. Mother opens her active triage session or profile page
2. Taps **"Upload Medical Document"** (camera or gallery)
3. Takes a photo of the prescription/lab report
4. AI analyzes the image and shows extracted values:
   ```
   ✅ Document Type: Lab Report
   📊 Extracted Values:
      • Blood Pressure: 150/95 mmHg  ⚠️ ABOVE MATERNAL THRESHOLD
      • Hemoglobin: 9.2 g/dL  ⚠️ BELOW NORMAL (anemia risk)
      • Blood Sugar (Fasting): 92 mg/dL  ✅ Normal
   
   ⚠️ Warning: Blood pressure reading exceeds the maternal safety 
      threshold (≥140/90). This is a known pre-eclampsia risk factor.
   ```
5. Mother confirms the extraction ("Is this correct?")
6. Confirmed values are saved as **risk factors** on her patient profile and/or active triage session

### Health Worker Side
1. Worker opens the case detail page
2. Sees a new **"Uploaded Documents"** section showing:
   - Thumbnail of the original image
   - Extracted values with flags
   - Confidence scores
   - Which values were auto-added as risk factors
3. Worker can verify, correct, or dismiss extracted values

---

## How It Works (Architecture)

```
Mother uploads photo
       │
       ▼
┌──────────────────────────────┐
│  POST /api/documents/analyze  │   ← New API endpoint
│  (image file + sessionId)     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  documentAnalysisService.js (NEW)     │
│                                       │
│  1. Send image to Gemini Vision API   │
│     with structured extraction prompt │
│  2. Parse JSON response               │
│  3. Compare values against maternal   │
│     danger thresholds                 │
│  4. Generate flags + warnings         │
│  5. Return structured result          │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────────┐  ┌─────────────────────────┐
│ Save to     │  │ Update Patient profile  │
│ Uploaded    │  │ knownRiskFactors        │
│ Document    │  │ and/or TriageSession    │
│ (existing   │  │ caseState.riskFactors   │
│  model)     │  │ (existing models)       │
└─────────────┘  └─────────────────────────┘
```

### What We Already Have (don't need to build)
- **`UploadedDocument.js` model** — ownership, document type, verification status, file storage
- **`document.routes.js`** — role-based access control, file streaming, audit logging
- **Gemini SDK** — already initialized in `careAssistantAgenticService.js`
- **`Patient.js`** — has `knownRiskFactors` field (Mixed type, accepts anything)
- **`TriageSession.js`** — has `caseState.riskFactors` (Mixed type)
- **`caseContextService.js`** — already has `getDocumentSummary()` function

### What We Need to Build
1. **`documentAnalysisService.js`** — the core AI analysis service (Gemini Vision call + threshold mapping)
2. **New API route** — `POST /api/documents/analyze` (accepts multipart image upload)
3. **New MCP tool** — `case_analyze_medical_document` (so the agentic assistant can also reference document analysis)
4. **Frontend upload component** — camera/gallery picker on patient dashboard
5. **Frontend results display** — extracted values + flags on both patient and worker pages

---

## The Gemini Vision Prompt

This is the core of the feature. We send the image to Gemini with this system instruction:

```
You are a medical document analyzer for MatriSense, a maternal health triage system.

Analyze the uploaded medical document image. Extract ALL medical values you can identify.

IMPORTANT CONTEXT:
- The patient is a pregnant woman
- Documents may be in Bangla, English, or mixed
- Documents may be handwritten or printed
- Apply MATERNAL-SPECIFIC thresholds (pregnancy changes normal ranges)

MATERNAL DANGER THRESHOLDS:
- Blood Pressure Systolic: ≥140 mmHg → hypertension/pre-eclampsia risk
- Blood Pressure Diastolic: ≥90 mmHg → hypertension/pre-eclampsia risk  
- Hemoglobin: <11 g/dL → anemia; <7 g/dL → severe anemia
- Fasting Blood Sugar: >95 mg/dL → gestational diabetes risk
- Urine Protein: positive/trace+ → pre-eclampsia risk
- Platelet Count: <150,000 → HELLP syndrome risk

Return ONLY this JSON structure:
{
  "documentType": "prescription" | "lab_report" | "ultrasound_report" | "blood_pressure_card" | "other",
  "language": "bn" | "en" | "mixed",
  "isReadable": true/false,
  "extractedValues": [
    {
      "parameter": "blood_pressure_systolic",
      "displayName": "Blood Pressure (Systolic)",
      "displayNameBn": "রক্তচাপ (সিস্টোলিক)",
      "value": 150,
      "unit": "mmHg",
      "isAbnormal": true,
      "severity": "WARNING" | "CRITICAL" | "NORMAL",
      "maternalThreshold": "≥140 mmHg indicates hypertension risk in pregnancy",
      "confidence": 0.92
    }
  ],
  "medications": [
    {
      "name": "...",
      "dosage": "...",
      "frequency": "..."
    }
  ],
  "riskFactorsDetected": [
    "hypertension",
    "anemia"
  ],
  "summary": "Lab report shows elevated blood pressure and low hemoglobin. These are risk factors for pre-eclampsia and anemia during pregnancy.",
  "summaryBn": "রিপোর্টে উচ্চ রক্তচাপ এবং কম হিমোগ্লোবিন দেখা গেছে। গর্ভাবস্থায় এগুলো প্রি-একলাম্পসিয়া এবং রক্তস্বল্পতার ঝুঁকি।",
  "rawTextDetected": "..."
}
```

---

## Maternal Danger Thresholds (Reference)

| Parameter | Normal (Pregnancy) | Warning | Critical |
|-----------|-------------------|---------|----------|
| BP Systolic | <140 mmHg | 140–159 | ≥160 |
| BP Diastolic | <90 mmHg | 90–109 | ≥110 |
| Hemoglobin | ≥11 g/dL | 7–10.9 | <7 |
| Fasting Blood Sugar | ≤95 mg/dL | 96–125 | >125 |
| Urine Protein | Negative | Trace/1+ | 2+ or higher |
| Platelet Count | ≥150,000/µL | 100k–150k | <100k |

These thresholds are based on WHO and ACOG guidelines for pregnancy.

---

## Build Plan (8–9 hours)

### Phase 1: Backend Core Service (3 hours)
**Owner: Backend developer**

1. Create `backend/src/services/documentAnalysisService.js`
   - Function: `analyzeDocument(imageBuffer, mimeType, sessionId)`
   - Sends image to Gemini Vision API with the structured prompt above
   - Parses JSON response
   - Applies maternal threshold validation (double-check AI's abnormal flags)
   - Returns structured analysis result

2. Create `POST /api/documents/analyze` route
   - Uses `multer` for multipart image upload (or base64 body)
   - Auth-gated (patient or worker)
   - Calls `analyzeDocument()`
   - Saves result to `UploadedDocument` record
   - Optionally updates `Patient.knownRiskFactors` or `TriageSession.caseState.riskFactors`
   - Returns analysis result to frontend

### Phase 2: MCP Tool Registration (1 hour)
**Owner: Backend developer**

3. Add new tool to `caseContext` MCP server:
   ```javascript
   {
     name: "case_analyze_medical_document",
     description: "Analyzes an uploaded medical document and extracts health data",
     inputSchema: { ... }
   }
   ```
4. Add corresponding service function in `caseContextService.js`
5. Add tool handler in `server.js` CallToolRequestSchema handler

### Phase 3: Frontend — Patient Upload UI (2.5 hours)
**Owner: Frontend developer**

6. New component: `MedicalDocumentUpload.jsx`
   - Camera button + gallery picker
   - Image preview before submission
   - Loading state while AI analyzes
   - Results display: extracted values with color-coded flags (green/amber/red)
   - Bangla summary text
   - "Confirm" button to save extracted risk factors

7. Place component on patient dashboard (e.g., in the profile section or active triage session)

### Phase 4: Frontend — Worker View (1.5 hours)
**Owner: Frontend developer**

8. Add "Uploaded Documents" section to worker case detail page (`[sessionId]/page.jsx`)
   - Show thumbnail of uploaded image
   - Show extracted values table with flags
   - Show confidence scores
   - "Verify" / "Dismiss" buttons for each extracted value

### Phase 5: Testing & Demo Prep (1 hour)
**Owner: Both**

9. Test with sample images:
   - A printed lab report (English)
   - A handwritten BP card (Bangla)
   - A pharmacy prescription
   - A blurry/unreadable image (should gracefully report low confidence)
10. Record demo screenshots / video segment

---

## Demo Script (for the 3–5 minute video)

> "Now we'll show MatriSense's experimental multimodal AI feature. A rural mother has just visited a local pharmacy and received a blood test report. She can't read it, but she photographs it and uploads it to MatriSense..."
>
> [Show: mother taps "Upload Medical Document" → takes photo → uploads]
>
> "Gemini Vision analyzes the document and extracts all medical values. It identifies that her blood pressure is 150/95 — above the maternal danger threshold of 140/90 — and her hemoglobin is 9.2, indicating anemia risk."
>
> [Show: extracted values with red/amber flags, Bangla summary]
>
> "These values are automatically added to her risk profile. When she runs triage next, the rule engine will factor in hypertension and anemia as known risk factors, potentially elevating her risk level."
>
> [Show: health worker case detail with document section showing extracted data]
>
> "This feature is experimental — it works in controlled testing but would need clinical validation before deployment. It demonstrates how multimodal AI can turn paper documents into actionable digital health data in rural Bangladesh."

---

## Why This Feature Wins at SciBlitz

1. **Innovation (25%)**: No maternal health app does multimodal document parsing → clinical risk integration. Judges will recognize this as genuinely novel.

2. **Technical Implementation (25%)**: Demonstrates multimodal LLM, structured extraction, threshold validation, MCP tool extension, existing pipeline integration. Not just an API call — it feeds into the deterministic safety pipeline.

3. **Real-world Impact (20%)**: Directly addresses rural Bangladesh reality where medical data exists on paper but never reaches digital systems.

4. **Demo Quality (20%)**: The upload → AI extraction → flagged values → risk update flow is visceral and immediate. Judges can see it working in real-time.

5. **"Experimental" Framing**: Perfect for an AI challenge — "this works but needs extensive clinical testing to deploy." Shows research awareness and responsible AI thinking.

---

## Safety Boundaries

- Extracted values **feed into the existing rule engine** — they don't bypass it
- The AI cannot diagnose conditions from documents (only extracts values and flags thresholds)
- Health workers can verify, correct, or dismiss any extracted value
- Low-confidence extractions are flagged with a warning
- The system never tells the mother to change medication based on document analysis
- All document uploads are audit-logged with timestamps
