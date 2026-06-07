# matrisense-referral-mcp

This is a Model Context Protocol (MCP) server integration responsible for mediating localized patient referral decisions and regional health-worker assignments without exposing private internal records.

## Features
- **Privacy First:** Restricts all assignments to defined healthcare-worker geo-regions using rigorous Access Control Layers. Precise GPS maps are erased from LLM outputs to prevent hallucinated physical vectors.
- **Role-based Actions:** Distinctly breaks 15 explicit functions between `PATIENT`, `HEALTH_WORKER`, and `ADMIN`. It natively ensures patient-preferred assignments enter formal PENDING states strictly waiting for Health Worker review.
- **Hospital Assignments:** Handles rule-engine severity mappings. Will immediately escalate text warnings regarding `HIGH` risks out-of-band directly to patients overriding standard wait protocols.

## Env Configuration
Store inside `.env`:
```env
ENABLE_REFERRAL_MCP=true
REFERRAL_MCP_ENABLE_HTTP=true
REFERRAL_MCP_INTERNAL_TOKEN=changeme_demo_token
REFERRAL_MCP_DEBUG=false
REFERRAL_MCP_ALLOW_STDIO_DEMO=true
```

## Running the Server
### Stdio Local Demo Configuration
Used dynamically inside applications that orchestrate background `stdio` tunnels.
```bash
npm run mcp:referral
```
*(Fails explicitly unless `REFERRAL_MCP_ALLOW_STDIO_DEMO` is safely true)*

### Optional HTTP Mode Configuration
While disabled by default to prevent unauthorized network exposure, HTTP mode can be enabled for internal microservice communication by explicitly setting `REFERRAL_MCP_ENABLE_HTTP=true` in `.env`. Endpoint behaves in a closed, fail-safe manner if this is not explicitly passed.

### Running the Test Suite
There is a 15-case verification script guaranteeing safety logic bindings using native node environments connecting to a local DB sandbox structure dynamically:
```bash
npm run mcp:referral:test
```

## Tooling
### 🏥 Patient Safe Actions
Patients are restricted structurally directly through `referralAccessPolicy.js`. They cannot act on out-of-session targets.
- `referral_find_hospital_options`: Gathers suitable locations bounded manually to rule-engine logic.
- `referral_create_patient_preference`: Locks an intention directly against a target hospital placing it in a Worker-Only review buffer safely. 
- *`referral_get_assigned_hospital`*, *`referral_get_referral_status`*, *`referral_cancel_patient_preference`*, *`referral_get_hospital_details`*

**Sample Tool Input/Output:**
```json
// Input (referral_find_hospital_options)
{ "sessionId": "...", "patientId": "...", "district": "Dhaka", "riskLevel": "HIGH", "requester": { "role": "PATIENT" } }
// Output
{ "options": [...], "safetyNote": "CRITICAL WARNING...", "patientLocationSummary": "District: Dhaka" }
```

### 🩺 Health Worker Safe Actions
These tools actuate final regional states inside MatriSense. Workers attempting actions on clinics sitting physically outside of their registered arrays (`coverageDistricts`) will suffer immediate MCP connection blocks to prevent rogue routing.
- `referral_accept_patient_preference`
- `referral_assign_hospital` (also forces manual reassignment seamlessly)
- `referral_update_referral_status`, `referral_add_referral_note`, `referral_validate_assignment`, `referral_get_assignment_history`

**Sample Tool Input/Output:**
```json
// Input (referral_accept_patient_preference)
{ "sessionId": "...", "preferenceId": "...", "requester": { "role": "HEALTH_WORKER", "workerId": "..." } }
// Output
{ "success": true, "assignedHospitalId": "..." }
```

## Demo Walkthrough Requirements
Follow these bounds when rendering end-to-end demonstrations internally:

1. Patient interacts inside the Assistant interface: _“আমার কাছাকাছি কোন হাসপাতালে যেতে পারি?”_ (Where can I go locally?).
2. LLM routes the function via `referral_find_hospital_options`. The payload surfaces 5 distinct endpoints ranked physically by Haversine Distance mathematically rounded to nearest 1Km dynamically for mapping without LLM hallucinating vectors.
3. Patient triggers UI action creating preference using `referral_create_patient_preference`.
4. Regional Worker accesses their unified Dashboard Panel viewing the `PENDING` requirement.
5. Worker runs acceptance loop explicitly marking assigned configurations. All metadata paths inherently lock down explicit Worker UUID and Hospital bindings natively updating local `hospitalAssignmentHistory`.

## Limitations
- **Worker District Visibility**: Inter-district referrals are strictly blocked for workers unless granted an admin override.
- **Location Fences**: Accurate spatial mapping inherently relies on capturing patient coordinates from their UI. If unavailable, broad district fallbacks are executed.
- **Session Lifecycles**: A preference must be acted upon before another preference is logged. Patients can only hold a single pending preference globally per session.
