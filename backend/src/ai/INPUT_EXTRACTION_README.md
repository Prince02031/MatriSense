# MatriSense: AI Symptom Extraction & Probing (Objective 5)

## 1. Purpose
This module converts natural Bangla patient descriptions into structured clinical data for the triage rule engine. It eliminates the need for complex forms while maintaining medical precision.

## 2. Safety Architecture: Fact vs. Decision
**Critical Principle**: The LLM ONLY extracts facts. It is strictly forbidden from deciding risk levels, diagnosing diseases, or prescribing medicine.
- **LLM**: Extracts symptoms, duration, and severity.
- **Rule Engine**: Decides if the patient is LOW, MEDIUM, or HIGH risk based on those symptoms.

## 3. Extraction Pipeline
1. **AI Extraction**: Uses Gemini (via `llmClient`) to map Bangla text to approved `symptomCodes`.
2. **Schema Validation**: Ensures the AI output matches our strictly typed JSON schema.
3. **Keyword Fallback**: If the LLM is offline, unconfigured, or invalid, a secondary `fallbackExtractor` uses keyword matching as a fail-safe.
4. **Synonym Merging**: Automatically adds base symptoms (e.g., `headache`) when a specific variation (e.g., `severe_headache`) is found.

## 4. Probing & Normalization
- **Follow-up Selection**: Based on extracted symptoms, the system picks up to 3 prioritized clinical questions (e.g., "Is your vision blurred?").
- **Safety Throttling**: If a high-risk danger sign is already detected, the system reduces follow-up questions to avoid delaying urgent care.
- **Answer Normalization**: Translates patient "Yes/No" or choice answers back into `caseState` updates (e.g., `can_keep_water_down: false` -> `cannot_keep_water_down: true`).

## 5. Case State Update
The `caseStateBuilder` synthesizes:
- Patient Profile Snapshot
- AI Extracted Symptoms
- Follow-up Answers
- History (Checkup gaps, risk factors)

This creates a clean, rule-engine-ready object.

## 6. How to Run Tests
All tests run locally and do not require live API calls unless specified.

| Command | Purpose |
| :--- | :--- |
| `npm run test:extractor` | Verifies extraction and keyword fallback logic. |
| `npm run test:followup` | Tests clinical probing and answer normalization. |
| `npm run test:input-pipeline` | Runs an end-to-end demo of the entire input flow. |
| `npm run test:extractor:gemini` | (Optional) Live smoke test for Gemini API connectivity. |

## 7. Extractor Output Shape
```json
{
  "detectedSymptoms": ["headache", "blurred_vision"],
  "severity": { "headache": "severe" },
  "duration": "6_hours_plus",
  "uncertainFields": [],
  "needsFollowUp": true,
  "source": "llm|fallback"
}
```
