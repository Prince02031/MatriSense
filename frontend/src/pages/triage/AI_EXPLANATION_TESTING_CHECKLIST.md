# 🧪 AI Triage Lab Smoke Test Checklist

This checklist is for manual verification of the **MatriSense AI Triage Lab** at `/triage/ai-explanation` or `/admin/ai-explanation`.

## 1. Initial Load & Setup
- [ ] **Page Loads**: Navigation to the route works without white-screen errors.
- [ ] **Presets**:
    - [ ] Click **LOW Case**: Profile fills (2nd trimester), Input fills (বমি বমি লাগছে), results clear.
    - [ ] Click **MEDIUM Case**: Profile fills (Anemia), Input fills (জ্বর), results clear.
    - [ ] Click **HIGH Case**: Profile fills (3rd trimester, Hypertension, 70 days ago), Input fills (মাথা খুব ব্যথা).

## 2. Input & Validation
- [ ] **Validation (Empty Input)**: Clear symptoms, click "Analyze My Story" -> Shows error alert.
- [ ] **Validation (Profile)**: Set trimester to "Unknown", gestational week to 0 -> Shows error alert.
- [ ] **Bangla Support**: Input accepts complex Bangla characters and preserves them during extraction.

## 3. Pipeline Execution (Guided Flow)
- [ ] **Extraction**: Click "Analyze My Story" -> Loading state shows -> Symptom chips appear (Review Step).
- [ ] **Symptom Removal**: Clicking the 'X' on a symptom chip removes it from the confirmed list.
- [ ] **Follow-up Selection**: Click "Confirm Symptoms" -> Correct clinical questions appear (Probing Step).
- [ ] **Answer Submission**: 
    - [ ] Answer buttons respond (colors change on selection).
    - [ ] Clicking "Submit" before answering all questions shows validation error.
- [ ] **Final Decision**: Click "Submit and Get Result" -> Loading state shows -> Result card appears.

## 4. Clinical & Safety Audit
- [ ] **Risk Badge**: Correct risk color/label appears (e.g., Rose for HIGH, Teal for LOW).
- [ ] **SafeOutput**: 
    - [ ] Bangla explanation is readable.
    - [ ] **HIGH case check**: Ensure the primary advice is "Go to Hospital" and NOT "Try home remedies first."
    - [ ] **No Diagnosis**: Verify no specific disease labels (e.g., "You have Preeclampsia") appear.
    - [ ] **No Medicine**: Verify no drug names or dosages appear.
- [ ] **Fallback Logic**: (If Gemini key missing) Verify the "Fallback safety template used" note appears in the result banner.

## 5. Pipeline Inspector (Debug)
- [ ] **JSON Rendering**: All 13 panels show valid, pretty-printed JSON when populated.
- [ ] **Collapsing**: Panels toggle correctly; Decision and SafeOutput are open by default.
- [ ] **Copy to Clipboard**: Clicking "Copy" on a panel successfully copies the JSON.

## 6. Responsiveness
- [ ] **Desktop**: Two-column layout with sticky sidebar on the right.
- [ ] **Mobile**: Stacked layout with Chat Flow on top and Inspector below.

---
**Status**: Ready for Clinical Sign-off
**Developer**: MatriSense Core Team
