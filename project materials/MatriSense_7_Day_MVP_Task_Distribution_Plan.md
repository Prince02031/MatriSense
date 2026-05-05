# MatriSense 7-Day MVP Development Plan

## Purpose of this document

This document divides the MatriSense MVP development work among **3 team members** for a **7-day preliminary-round build**. The plan assumes the team will use an **agentic workflow heavily**: ChatGPT, Cursor, Claude/Gemini, v0/Lovable if useful, and AI-assisted test generation. The goal is not to build a perfect production system. The goal is to build a **complete, demoable vertical slice**:

```text
Mother profile
→ Bangla symptom input
→ AI symptom extraction
→ confirmation / follow-up questions
→ rule-based triage
→ rule-aware RAG care guidance
→ Bangla result
→ health worker dashboard
→ referral/follow-up note
```

The strongest MVP is not a collection of disconnected pages. It must show one working case moving through the whole system.

---

# 1. Core build principle

The team must freeze the preliminary MVP scope early.

## Build this

```text
1. Mother profile form
2. Bangla symptom input
3. AI symptom extraction
4. Symptom confirmation
5. 2–3 follow-up questions
6. json-rules-engine triage
7. Rule-aware RAG care guidance
8. Bangla patient result page
9. Health worker dashboard
10. Case detail page
11. Referral/follow-up note
12. /docs technical explanation page
```

## Do not build for the 7-day MVP

```text
- full authentication system
- full maps or route optimization
- real SMS/notification pipeline
- voice input/output unless everything else is complete
- full GraphRAG
- real patient data
- medicine recommendation
- diagnosis engine
- complex analytics dashboard
```

These can be presented as roadmap features.

---

# 2. Team role division

## Person 1: AI, rule engine, RAG, and safety lead

This person owns the intelligence layer.

### Main responsibility

```text
Bangla symptom extraction
→ normalized case facts
→ rule engine
→ RAG care guidance
→ LLM explanation
→ safety validator
```

### Key modules owned

```text
/backend/ai
  extractorPrompt.js
  explanationPrompt.js
  healthWorkerSummaryPrompt.js
  promptSchemas.js

/backend/triage
  rules.json
  ruleRunner.js
  decisionBuilder.js
  followUpMap.js
  symptomMap.js
  testCases.json

/backend/rag
  knowledgeCards.json
  evidenceRetriever.js
  ragQueryBuilder.js
  careGuidanceAssembler.js

/backend/safety
  safetyValidator.js
```

### Deliverables

```text
- symptom extraction prompt with JSON schema
- normalized symptom code list
- 10–15 json-rules-engine rules
- 5–6 follow-up question triggers
- 20–30 RAG care-guidance cards
- decision builder
- Bangla explanation prompt
- health-worker summary prompt
- safety validator
- 20–30 synthetic test cases
```

### Success condition

Given a test case like:

```text
Input: আমার মাথা ব্যথা করছে আর চোখে ঝাপসা দেখছি
Profile: third trimester, hypertension history
```

The AI/rule layer should return:

```json
{
  "riskLevel": "HIGH",
  "recommendedAction": "URGENT_CLINIC_VISIT",
  "matchedRules": ["headache_with_blurred_vision_high_risk", "known_hypertension_modifier"],
  "reasons": ["Headache with blurred vision was reported.", "Known hypertension history increases concern."],
  "careGuidance": {
    "stepsNowBn": ["দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।"],
    "urgentWarningBn": ["চোখে ঝাপসা দেখা", "তীব্র মাথাব্যথা", "মুখ বা হাত ফুলে যাওয়া"]
  }
}
```

---

## Person 2: Backend, database, API, and integration lead

This person owns the system backbone.

### Main responsibility

```text
Express API
→ MongoDB schemas
→ triage session storage
→ API contracts
→ integration of AI/rule/RAG services
→ deployment backend
```

### Key modules owned

```text
/backend
  server.js
  app.js
  routes/
    patient.routes.js
    triage.routes.js
    worker.routes.js
    referral.routes.js
    docs.routes.js
  models/
    Patient.js
    TriageSession.js
    ReferralNote.js
    AuditLog.js
    KnowledgeCard.js
  services/
    caseStateBuilder.js
    auditLogger.js
  middleware/
    errorHandler.js
    validateRequest.js
```

### Deliverables

```text
- Express project setup
- MongoDB connection
- Patient model
- TriageSession model
- ReferralNote model
- AuditLog model
- patient APIs
- triage APIs
- worker dashboard APIs
- referral note APIs
- integrated endpoint that runs full triage pipeline
- deployment on Render or similar
```

### Success condition

Frontend can call:

```text
POST /api/triage/start
POST /api/triage/:sessionId/confirm
GET /api/triage/:sessionId/follow-up
POST /api/triage/:sessionId/answers
POST /api/triage/:sessionId/run
GET /api/triage/:sessionId/result
GET /api/worker/cases
GET /api/worker/cases/:sessionId
POST /api/referral-notes
```

And the system stores each case end-to-end.

---

## Person 3: Frontend, UX, dashboard, demo, and docs lead

This person owns the visible product and demo storytelling.

### Main responsibility

```text
Mother UI
→ triage journey
→ result page
→ health worker dashboard
→ case detail
→ /docs page
→ demo polish
```

### Key modules owned

```text
/frontend/src
  pages/
    LandingPage.jsx
    RoleSelectPage.jsx
    MotherProfilePage.jsx
    SymptomInputPage.jsx
    ConfirmSymptomsPage.jsx
    FollowUpPage.jsx
    ResultPage.jsx
    WorkerDashboardPage.jsx
    WorkerCaseDetailPage.jsx
    DocsPage.jsx
  components/
    RiskCard.jsx
    CareGuidanceCard.jsx
    SymptomSummary.jsx
    FollowUpQuestionCard.jsx
    CaseTable.jsx
    CaseTimeline.jsx
    MatchedRulesPanel.jsx
    EvidencePanel.jsx
    ReferralNoteForm.jsx
  api/
    patientApi.js
    triageApi.js
    workerApi.js
```

### Deliverables

```text
- clean landing page
- mother profile flow
- Bangla symptom form
- confirmation page
- follow-up question UI
- result page with care guidance card
- worker dashboard case list
- worker case detail page
- referral note form
- /docs page explaining architecture, AI pipeline, RAG, safety, and demo flow
- deployed frontend on Vercel
```

### Success condition

A judge can open the app and understand the full workflow within 3 minutes.

---

# 3. Time estimate

## Total build estimate

With agentic workflow and frozen scope:

```text
Minimum core MVP: 5 days
Safe polished MVP: 7 days
Total team effort: around 120–150 person-hours
```

This assumes each person contributes roughly:

```text
5–7 focused hours/day × 7 days = 35–49 hours per person
Total = 105–147 hours
```

## Feasibility verdict

A 7-day MVP is realistic if:

```text
- scope is frozen by Day 1
- voice/maps/full auth are deferred
- AI/rule/RAG layer uses structured JSON and agents
- UI uses simple reusable components
- backend APIs are agreed early
- demo data is synthetic
- team integrates every day, not only at the end
```

A 7-day MVP becomes risky if:

```text
- team keeps changing features
- full GraphRAG is attempted
- real clinical validation is attempted
- custom authentication and roles consume too much time
- frontend waits until backend is finished
- no one owns integration
```

---

# 4. Recommended daily schedule

## Day 1: Architecture, setup, and contracts

### Goal

Create the project skeleton, freeze MVP scope, and agree on data contracts.

### Person 1: AI/rule/RAG lead

```text
- finalize symptom code list
- finalize risk levels and action labels
- draft prompt schemas
- draft first 8–10 rule candidates with agents
- draft first 10 knowledge cards
- define sample caseState JSON
```

### Person 2: Backend lead

```text
- create Express project
- connect MongoDB Atlas
- create initial schemas:
  - Patient
  - TriageSession
  - ReferralNote
  - AuditLog
- create base routes
- create API contract file or Postman collection
```

### Person 3: Frontend lead

```text
- create React/Vite project
- set up Tailwind
- set up routing
- create page skeletons
- create reusable layout
- create low-fidelity UI for mother and worker flow
```

### Day 1 integration checkpoint

```text
- frontend can hit backend health route
- backend can connect to database
- all team members agree on caseState structure
```

### Day 1 output

```text
GitHub repo working
Frontend skeleton running
Backend skeleton running
caseState contract finalized
```

---

## Day 2: Mother profile + symptom input + first AI extraction

### Goal

Mother can enter profile and symptom input; backend can store the first triage session.

### Person 1

```text
- build extractor prompt
- create JSON schema for extractor output
- create symptomMap.js
- test extraction with 10 Bangla examples
- create fallback keyword extraction for demo safety
```

### Person 2

```text
- implement POST /api/patients
- implement GET /api/patients/:id
- implement POST /api/triage/start
- save profileSnapshot in TriageSession
- store raw Bangla input
- connect AI extractor service placeholder
```

### Person 3

```text
- build MotherProfilePage
- build SymptomInputPage
- add Bangla labels
- connect profile form to backend
- connect symptom input form to backend
```

### Day 2 integration checkpoint

```text
Mother profile → symptom input → triage session created in MongoDB
```

### Day 2 output

```text
A mother can start a case and raw symptoms are stored.
```

---

## Day 3: Confirmation + follow-up questions + rule engine base

### Goal

The system can extract symptoms, show confirmation, ask follow-up questions, and prepare facts for rules.

### Person 1

```text
- implement 10–12 json-rules-engine rules
- implement followUpMap.js
- create getMissingInfo logic
- create decisionBuilder draft
- create 10 synthetic test cases
```

### Person 2

```text
- implement POST /api/triage/:sessionId/confirm
- implement GET /api/triage/:sessionId/follow-up
- implement POST /api/triage/:sessionId/answers
- implement caseStateBuilder.js
- save confirmed symptoms and follow-up answers
```

### Person 3

```text
- build ConfirmSymptomsPage
- build FollowUpPage
- build question card component
- handle single-choice answers
- show loading and error states
```

### Day 3 integration checkpoint

```text
Symptom input → extraction → confirmation → follow-up questions → answers saved
```

### Day 3 output

```text
The interaction starts building a structured medical record.
```

---

## Day 4: Rule engine decision + RAG care guidance

### Goal

The system can produce a structured decision and retrieve source-grounded care guidance.

### Person 1

```text
- finalize first version of rules.json
- implement ruleRunner.js
- implement decisionBuilder.js
- create 20–30 knowledgeCards.json entries
- implement evidenceRetriever.js
- implement careGuidanceAssembler.js
- test LOW, MEDIUM, HIGH cases
```

### Person 2

```text
- implement POST /api/triage/:sessionId/run
- integrate caseStateBuilder → ruleRunner → decisionBuilder → RAG retriever
- save decision and careGuidanceContext in TriageSession
- add audit logs for triage run
```

### Person 3

```text
- start ResultPage design
- build RiskCard component
- build CareGuidanceCard component
- build WarningSigns component
- prepare LOW/MEDIUM/HIGH visual states
```

### Day 4 integration checkpoint

```text
Follow-up answers → rule engine → decision → RAG care guidance context
```

### Day 4 output

```text
Backend can produce the full structured result, even if frontend is not fully polished yet.
```

---

## Day 5: LLM explanation, safety validator, and patient result page

### Goal

Mother receives a safe Bangla result with step-by-step guidance.

### Person 1

```text
- build explanation prompt using fixed decision + retrieved cards
- build health-worker summary prompt
- implement safetyValidator.js
- test forbidden outputs:
  - diagnosis
  - medicine
  - false reassurance
  - risk downgrade
- create fallback templates
```

### Person 2

```text
- implement GET /api/triage/:sessionId/result
- store LLM-generated output
- store safety validation status
- expose decision, care guidance, and explanation to frontend
- improve error handling
```

### Person 3

```text
- finish ResultPage
- show:
  - risk level
  - why
  - what to do now
  - what to monitor
  - when to contact health worker urgently
  - safety note
- connect result page to backend
```

### Day 5 integration checkpoint

```text
Mother symptom input → full result page works end-to-end
```

### Day 5 output

```text
The mother-side demo flow is complete.
```

---

## Day 6: Health worker dashboard + referral note + docs page

### Goal

The health worker can view cases, inspect reasoning, and add referral/follow-up notes.

### Person 1

```text
- create display-friendly matched rule labels
- create evidence/source labels
- create 3 polished demo cases:
  - low risk nausea/headache
  - medium risk fever/vomiting
  - high risk headache + blurred vision + hypertension
- prepare AI/RAG architecture text for /docs page
```

### Person 2

```text
- implement GET /api/worker/cases
- implement GET /api/worker/cases/:sessionId
- implement POST /api/referral-notes
- implement PUT /api/worker/cases/:sessionId/status
- sort dashboard cases by risk/priority
```

### Person 3

```text
- build WorkerDashboardPage
- build WorkerCaseDetailPage
- build ReferralNoteForm
- build EvidencePanel
- build MatchedRulesPanel
- build /docs page
```

### Day 6 integration checkpoint

```text
Patient result → appears in worker dashboard → worker opens case → adds referral note
```

### Day 6 output

```text
Full mother-to-health-worker workflow is demoable.
```

---

## Day 7: Integration, testing, deployment, and demo preparation

### Goal

Make the MVP stable, deployed, and presentable.

### Person 1

```text
- run all test cases
- check rule outputs
- check RAG retrieval correctness
- check LLM output safety
- prepare AI explanation for submission/demo
- document limitations and roadmap
```

### Person 2

```text
- deploy backend
- deploy database config
- seed demo data
- check environment variables
- test API latency and failures
- fix integration bugs
```

### Person 3

```text
- deploy frontend
- polish UI
- make demo script
- record 3-minute demo video draft
- update /docs page
- prepare screenshots
```

### Final day checklist

```text
- frontend deployed
- backend deployed
- database connected
- demo cases seeded
- no broken routes
- mother flow works
- worker flow works
- /docs works
- demo script ready
- submission text ready
```

---

# 5. Critical path

The critical path is:

```text
caseState contract
→ backend triage session storage
→ AI extraction
→ follow-up answers
→ rule engine decision
→ RAG guidance retrieval
→ result page
→ worker dashboard
```

If any part of this breaks, the demo breaks.

So the team should integrate these daily.

---

# 6. API contract-first development

The backend and frontend should not wait for each other. Define API contracts on Day 1 and use mock data until real APIs are ready.

## Main caseState contract

```json
{
  "patientId": "demo-patient-1",
  "profile": {
    "age": 28,
    "trimester": "third",
    "knownRiskFactors": ["hypertension"],
    "lastCheckupDaysAgo": 70
  },
  "symptoms": ["headache", "blurred_vision"],
  "severity": {
    "headache": "severe"
  },
  "duration": "6_hours_plus",
  "followUpAnswers": {
    "swelling": true,
    "canKeepWaterDown": true
  }
}
```

## Main decision contract

```json
{
  "riskLevel": "HIGH",
  "priority": "URGENT",
  "recommendedAction": "URGENT_CLINIC_VISIT",
  "matchedRules": ["headache_with_blurred_vision_high_risk"],
  "reasons": ["Headache with blurred vision was reported."],
  "evidenceTags": ["headache_vision_danger"],
  "allowedGuidanceType": "URGENT_ESCALATION_ONLY",
  "followUpNeeded": false,
  "llmConstraints": [
    "Do not diagnose",
    "Do not prescribe medicine",
    "Do not downgrade risk level"
  ]
}
```

## Main result contract

```json
{
  "riskLevel": "HIGH",
  "urgency": "Immediate attention needed",
  "motherExplanationBn": "আপনার লক্ষণগুলো ঝুঁকিপূর্ণ হতে পারে।",
  "stepsNowBn": [
    "দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।",
    "লক্ষণ নিজে নিজে সেরে যাওয়ার জন্য অপেক্ষা করবেন না।"
  ],
  "monitorBn": [],
  "urgentWarningBn": [
    "চোখে ঝাপসা দেখা",
    "তীব্র মাথাব্যথা",
    "মুখ বা হাত ফুলে যাওয়া"
  ],
  "safetyDisclaimerBn": "MatriSense রোগ নির্ণয় করে না। এটি জরুরি ঝুঁকি বুঝতে সাহায্য করে।"
}
```

---

# 7. Agentic workflow plan

Because the team is heavily using agents, use them deliberately. Do not just ask agents to “build the app.” Give each agent a narrow task.

## Recommended agents/tasks

### AI/rule agent

```text
Task:
Create 15 maternal danger-sign json-rules-engine rules using only our approved symptom list and risk/action schema. Do not diagnose or prescribe medicine.
```

### RAG card agent

```text
Task:
Create 25 maternal health care-guidance cards. Each card must include symptoms, riskLevelAllowed, guidanceType, stepsBn, escalationTriggersBn, doNotSay, and citation label.
```

### Test-case agent

```text
Task:
Generate 30 synthetic triage test cases. Each must include profile, inputBn, expectedSymptoms, followUpAnswers, expectedRiskLevel, expectedAction, expectedMatchedRules, and expectedGuidanceType.
```

### Frontend agent

```text
Task:
Generate React components for RiskCard, CareGuidanceCard, CaseTable, EvidencePanel, and ReferralNoteForm using Tailwind. Keep components clean and reusable.
```

### Backend agent

```text
Task:
Generate Express route/controller/service structure for Patient, TriageSession, WorkerCases, and ReferralNotes using Mongoose. Keep business logic in services.
```

### Safety review agent

```text
Task:
Review all patient-facing outputs for diagnosis, medicine advice, false reassurance, risk downgrade, unsupported home remedies, and missing escalation triggers.
```

## Agentic workflow rules

```text
1. Give agents schemas before asking for code.
2. Ask agents to generate small files, not the whole system.
3. Review every medical/rule output manually.
4. Keep generated code simple and readable.
5. Run tests after each generated module.
6. Do not merge agent code without human review.
```

---

# 8. Daily coordination rhythm

Use 3 short syncs per day.

## Morning sync: 15 minutes

```text
- What did each person complete yesterday?
- What is today’s deliverable?
- What API/data contract changed?
- What is blocked?
```

## Midday integration check: 20 minutes

```text
- Pull latest code
- Test one shared flow
- Fix contract mismatch
- Update task board
```

## Nightly demo check: 20–30 minutes

```text
- Run the app from frontend
- Use one test patient
- Check if the case reaches worker dashboard
- Record bugs
- Freeze next day’s target
```

---

# 9. Branching and Git workflow

Use simple Git rules.

```text
main        = stable demo branch
dev         = integration branch
feature/ai = Person 1 branch
feature/api = Person 2 branch
feature/ui = Person 3 branch
```

Rules:

```text
- no direct push to main
- merge into dev daily
- deploy from main only
- keep commits small
- write clear commit messages
```

Example commit messages:

```text
feat(ai): add symptom extractor schema
feat(triage): add high-risk bleeding rule
feat(api): create triage session endpoint
feat(ui): add mother symptom input page
fix(rag): filter low-risk cards from high-risk outputs
```

---

# 10. Testing plan

## Minimum tests

```text
1. Symptom extraction tests
2. Rule engine tests
3. RAG retrieval tests
4. Safety validator tests
5. End-to-end demo tests
```

## Test cases to include

```text
Low risk:
- mild nausea + mild headache, no danger signs
- fatigue only, no danger signs

Medium risk:
- fever without severe weakness
- repeated vomiting but can keep some water down
- mild abdominal pain without bleeding

High risk:
- vaginal bleeding
- severe abdominal pain
- headache + blurred vision
- convulsion
- difficulty breathing
- reduced fetal movement in third trimester
```

## Acceptance criteria

```text
- high-risk danger signs never become low risk
- LLM never changes rule-engine risk
- high-risk outputs never show “rest only” advice
- low-risk outputs still include warning signs
- no output diagnoses disease
- no output gives medicine dosage
- health worker can see matched rules and reasons
```

---

# 11. Demo scenario plan

Prepare 3 demo patients.

## Demo Case 1: Low risk

```text
Profile:
Second trimester, no known risk factors

Input:
আমার বমি বমি লাগছে আর মাথা একটু ব্যথা করছে

Follow-up:
No blurred vision, no swelling, not severe, can keep water down

Expected:
LOW risk
Home care and monitor
Step-by-step self-care guidance
Warning signs included
```

## Demo Case 2: Medium risk

```text
Profile:
Second trimester, anemia history

Input:
জ্বর আর দুর্বল লাগছে

Follow-up:
No breathing difficulty, no fainting, fever continuing

Expected:
MEDIUM risk
Contact health worker / clinic check
Monitoring and escalation guidance
```

## Demo Case 3: High risk

```text
Profile:
Third trimester, hypertension history, last checkup 70 days ago

Input:
আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি

Follow-up:
Swelling present

Expected:
HIGH risk
Urgent clinic contact/referral
No home-care-first advice
Appears at top of worker dashboard
```

---

# 12. Final integration architecture

```text
Frontend Mother Flow
  ↓
Patient API
  ↓
Triage Session API
  ↓
AI Extractor
  ↓
Confirmation + Follow-up API
  ↓
Case State Builder
  ↓
json-rules-engine
  ↓
Decision Builder
  ↓
Rule-aware RAG Retriever
  ↓
LLM Explanation + Care Guidance Generator
  ↓
Safety Validator
  ↓
Mother Result Page
  ↓
Worker Dashboard + Referral Notes
```

---

# 13. Risk management

## Risk 1: AI extraction unreliable

Fallback:

```text
Use keyword/symptom checkbox fallback.
```

## Risk 2: RAG takes too long

Fallback:

```text
Use JSON knowledge cards with filtering instead of vector DB.
```

## Risk 3: Backend integration delayed

Fallback:

```text
Frontend uses mock JSON responses while backend catches up.
```

## Risk 4: UI polish delayed

Fallback:

```text
Use simple clean forms and cards. Do not spend time on animations.
```

## Risk 5: LLM output unsafe

Fallback:

```text
Use fixed Bangla templates based on risk level.
```

## Risk 6: Deployment issue

Fallback:

```text
Record local demo video and submit GitHub + screenshots + /docs if live link fails.
```

---

# 14. Must-have files before submission

```text
README.md
.env.example
/docs page in app
architecture.md or docs content
rules.json
knowledgeCards.json
testCases.json
sample-demo-cases.json
submission-fields.md
```

## README should include

```text
- project overview
- problem statement
- system architecture
- AI pipeline
- RAG flow
- rule engine explanation
- safety guardrails
- how to run locally
- demo credentials or demo flow
```

---

# 15. Definition of done

The MVP is done when:

```text
1. A mother can create a profile.
2. A mother can submit Bangla symptoms.
3. AI extracts structured symptoms.
4. The mother confirms symptoms.
5. The system asks 1–3 follow-up questions.
6. Rule engine calculates risk.
7. RAG retrieves appropriate care guidance.
8. LLM generates Bangla result safely.
9. Result page shows risk, steps, warning signs, and disclaimer.
10. Case appears in health worker dashboard.
11. Health worker can open case detail.
12. Health worker can add referral/follow-up note.
13. /docs page explains AI, RAG, rules, safety, and architecture.
14. The app can be demonstrated in under 3 minutes.
```

---

# 16. Submission-friendly wording

Use this wording in the submission or demo:

> MatriSense is a 7-day MVP built as an AI-native maternal triage workflow. The mother enters symptoms in Bangla, the AI extracts structured facts, the mother confirms them, and a rule-based triage engine checks maternal danger signs and personal risk factors. A rule-aware RAG layer retrieves source-grounded care guidance based on the fixed risk decision, and the LLM generates safe Bangla instructions without diagnosing disease or prescribing medicine. High-risk cases are sent to a health worker dashboard with matched rules, evidence, follow-up answers, and referral notes. This makes the system useful for both immediate patient guidance and structured health-worker follow-up.

---

# 17. Final recommendation

The 3-person team should divide work like this:

```text
Person 1 = AI/rule/RAG/safety
Person 2 = backend/database/API/integration
Person 3 = frontend/dashboard/docs/demo
```

The team can finish in 7 days if they build the vertical slice first and keep every non-essential feature as future scope. The most important success factor is daily integration. The second most important success factor is keeping the AI layer structured: LLM for extraction and language, rule engine for risk, RAG for source-grounded care guidance, and safety validator for final output control.
