# MatriSense LLM Integration Layer

## Purpose
A centralized, secure layer for generating natural language explanations for maternal health triage decisions. This layer ensures that all AI-generated content is strictly gated by medical safety rules and RAG context.

## Architecture
- **Provider-Agnostic**: Orchestrated by `llmClient.js`. 
- **Gemini**: Primary provider for cloud-based, high-reasoning Bangla generation.
- **Local (Placeholder)**: Future support for offline/private LLM deployments (e.g., Mistral/Llama via Ollama).
- **Schema-First**: Uses strict JSON schemas in `schemas/explanationSchema.js` to ensure predictable LLM output.

## Environment Variables
Required in `backend/.env`:
```bash
LLM_PROVIDER=gemini # gemini or local
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
LLM_TEMPERATURE=0.2
```

## Explanation Generation Flow
1. **Prompt Build**: `explanationPrompt.js` builds a zero-shot prompt using fixed triage decisions and RAG context.
2. **LLM Call**: `llmClient.js` executes the call to the selected provider.
3. **JS Validation**: `explanationSchema.js` verifies the JSON structure and types.
4. **Safety Validation**: `safetyValidator.js` scrubs output for forbidden patterns, risk downgrades, or unauthorized medical advice.
5. **Fail-Safe**: If any step fails, the system returns a pre-approved `fallbackTemplate`.

## Safety Guardrails
- **No Decisions**: The LLM **does not** decide the risk level; it only explains the decision made by the Rule Engine.
- **No Diagnosis/Medicine**: Forbidden via system instructions and regex blocklists in `safetyRules.js`.
- **Backend Only**: The `GEMINI_API_KEY` must **never** be exposed to the frontend.
- **Validation**: All patient-facing content **must** pass through the safety validator before reaching the user.

## Development & Testing
### Mock Validation (No Network)
Tests the schema and safety logic without calling an API.
```bash
npm run test:ai:mock
```

### Gemini Smoke Test
Verifies live API connectivity and generation quality.
```bash
npm run test:ai:gemini
```

## Switching Providers
To switch to a local model in the future:
1. Update `LLM_PROVIDER=local` in `.env`.
2. Implement the local inference logic in `providers/localProvider.js`.
