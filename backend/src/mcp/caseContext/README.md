# matrisense-case-context-mcp

## Architecture Structure
The `matrisense-case-context-mcp` is a secure micro-service boundary strictly exposing triage intelligence.
- **Tools via Zod**: Arguments strongly typed and explicitly parsed through Zod for robust failure handling.
- **Service Layers (`caseContextService.js` and `caseAccessPolicy.js`)**: Handle sanitization mapping to isolate Database schemas from standard REST models logic.

## Usage Environments
### Local `stdio` demo
```bash
npm run mcp:case
```
Provides the standard MCP protocol over `stdin` and `stdout`. Crucial for developmental local-LLM agents (e.g., Claude Desktop, cursor) and for final-round judges verifying the standalone toolset behaviors.

### HTTP usage 
The internal express endpoint `POST /mcp/case/messages` is available if explicit environment flags are set:
`ENABLE_CASE_CONTEXT_MCP=true` and `CASE_MCP_ENABLE_HTTP=true`.
Protects production environments requiring explicit `CASE_MCP_INTERNAL_TOKEN` attached in headers.

## Data Policies & Integration Parameters
- **PATIENT-SAFE FIELDS**: Name drops, geolocation explicit strings, and administrative variables are erased. Only abstracted clinical elements (`status`, `matchedRules`, `riskLevel`) and logical `documentUploadSummary` metrics are available to patients to respect privacy bounds.
- **WORKER-ONLY FIELDS**: Complete contextual snapshots mapping exact symptoms, assigned hospital IDs, raw text notes, and extraction audits provided. Enforced via DB role verification mapping districts or specifically assigned profiles.
- **DOCUMENT POLICY**: `MCP_EXPOSE_DOCUMENT_FILES=false` inherently enforced in DTO. The system strictly parses MongoDB schemas to produce `documentsUploaded: boolean`, `documentCount: number`. Raw PDFs, URLs, and OCR strings are safely excised.

## Internal Integrations
1. **Triage Loop Enforcement**: Native HTTP internal routing natively intercepts before rules evaluation (via `getTriageProfileContext` injected directly into `caseState`).
2. **Guided Care Integration**: Evaluates inputs (via `getGuidedCareContext`) providing explicit boundaries ensuring LLMs cannot hallucinate diagnostics, downgrade risk, or define drug dosage.

### SAFETY WARNING:
**This MCP does NOT decide urgency.** The deterministic rule engine strictly dictates `LOW / MEDIUM / HIGH` classifications. Using MCP to rewrite logic is strongly forbidden.
