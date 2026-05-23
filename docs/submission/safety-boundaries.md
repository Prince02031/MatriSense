# MatriSense Safety Boundaries

## What MatriSense Does

- Understands Bangla symptom reports.
- Extracts structured symptoms.
- Uses rules to detect maternal danger signs.
- Retrieves guideline-backed support through rule-aware RAG.
- Gives safe urgency guidance.
- Sends high-risk cases to health workers.

## What MatriSense Does Not Do

- It does not diagnose disease.
- It does not prescribe medicine or dosage.
- It does not let the LLM decide medical urgency.
- It does not replace a doctor, midwife, or trained health worker.
- It does not downgrade high-risk symptoms based on generative output.

## Fallback Rule

If Vector RAG or Gemini embeddings fail due to quota, API error, or vector search issue, the system must fall back to existing JSON-aware RAG and conservative safety guidance.
