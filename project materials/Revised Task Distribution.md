Below is a **rewritten task distribution plan** where each member owns complete modules end-to-end, instead of only doing “frontend person / backend person / AI person.” This fits your request better because each person will handle the **frontend, backend, database, testing, and integration** for their assigned modules.

I am assuming a **3-member team**, because the original plan was based on 3 members. The original MVP goal is still the same: one complete vertical slice from **mother profile → Bangla symptom input → AI extraction → confirmation/follow-up → rule triage → RAG guidance → Bangla result → health worker dashboard → referral note**.

---

# Revised MatriSense MVP Task Distribution Plan

## Core principle

The previous task plan divided people by technical layer:

```text
Person 1 = AI / rule / RAG
Person 2 = backend / database
Person 3 = frontend / dashboard
```

That is clean, but it creates a problem: one feature depends on all three people before it works.

The new plan should divide work by **product module ownership**:

```text
Each person owns one complete product area:
UI + API + database + validation + testing + deployment notes.
```

So each member can build and test their own module independently, then integrate through agreed API contracts.

The MVP still follows the planned system flow:

```text
Role/Auth
→ Mother Profile
→ Bangla Symptom Input
→ AI Extraction
→ Confirmation
→ Follow-up
→ Case State
→ Rule Engine
→ Rule-aware RAG
→ LLM Explanation
→ Safety Validator
→ Mother Result
→ Health Worker Dashboard
→ Referral Notes
→ Audit Log
```

This matches the updated MatriSense development flow and backend API design in the uploaded plan.

---

# Important change: authentication is now included

The original MVP plan recommended skipping **full authentication** to save time.

But since you have already added authentication, keep it simple and useful:

```text
Use JWT + bcrypt role-based authentication.
Do not build complex production auth.
Do not build email verification, OTP, password reset, or refresh-token rotation unless time remains.
```

## MVP auth roles

Use only these roles:

```text
MOTHER
HEALTH_WORKER
ADMIN optional, only if needed
```

## Auth behavior

```text
Mother:
- can register/login
- can create/update her own profile
- can submit symptoms
- can view her own result

Health worker:
- can login
- can view all submitted cases
- can open case details
- can add referral/follow-up notes
- can update case status

Admin optional:
- can seed demo data
- can view docs/admin stats
```

---

# Team Member 1: Identity, Mother Profile, and Mother Intake Flow Owner

## Main responsibility

This person owns the **mother-facing starting journey**:

```text
Authentication
→ role-based routing
→ mother registration/login
→ mother profile
→ Bangla symptom input
→ session creation
```

This member makes sure a mother can enter the system and start a triage case.

---

## Modules owned

```text
1. Authentication module
2. Role-based app shell
3. Mother profile module
4. Bangla symptom input module
5. Initial triage session creation
```

---

## Frontend pages owned

```text
/frontend/src/pages
  LandingPage.jsx
  LoginPage.jsx
  RegisterPage.jsx
  RoleSelectPage.jsx
  MotherProfilePage.jsx
  SymptomInputPage.jsx
```

## Frontend components owned

```text
/frontend/src/components/auth
  LoginForm.jsx
  RegisterForm.jsx
  ProtectedRoute.jsx
  RoleGuard.jsx

/frontend/src/components/mother
  MotherProfileForm.jsx
  RiskFactorCheckboxGroup.jsx
  EmergencyContactInput.jsx
  BanglaSymptomTextarea.jsx
  DurationSelector.jsx
  SeveritySelector.jsx
  DangerSignCheckboxes.jsx
```

## Frontend API files owned

```text
/frontend/src/api
  authApi.js
  patientApi.js
  triageStartApi.js
```

## Frontend state/context owned

```text
/frontend/src/context
  AuthContext.jsx
```

This should store:

```js
{
  user,
  token,
  role,
  login(),
  logout(),
  isAuthenticated
}
```

---

## Backend routes owned

```text
/backend/routes
  auth.routes.js
  patient.routes.js
```

## Backend controllers owned

```text
/backend/controllers
  auth.controller.js
  patient.controller.js
```

## Backend services owned

```text
/backend/services
  auth.service.js
  patient.service.js
```

## Middleware owned

```text
/backend/middleware
  authMiddleware.js
  roleMiddleware.js
```

---

## Database models owned

### User model

```js
User {
  _id,
  name,
  phone,
  email,
  passwordHash,
  role, // MOTHER or HEALTH_WORKER
  isActive,
  createdAt,
  updatedAt
}
```

### Patient model

```js
Patient {
  _id,
  userId,
  name,
  age,
  phone,
  trimester,
  gestationalWeek,
  expectedDeliveryDate,
  lastCheckupDate,
  knownRiskFactors,
  emergencyContactName,
  emergencyContactPhone,
  addressOrVillage,
  createdAt,
  updatedAt
}
```

### TriageSession initial fields

Member 1 should create only the first part of the session:

```js
TriageSession {
  _id,
  patientId,
  userId,
  profileSnapshot,
  initialInputBn,
  duration,
  severity,
  checkedDangerSigns,
  status: "STARTED",
  createdAt
}
```

The AI triage owner will extend this later.

---

## APIs owned

### Auth APIs

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout optional
```

### Patient APIs

```text
POST /api/patients
GET /api/patients/me
GET /api/patients/:id
PUT /api/patients/:id
```

### Initial triage API

```text
POST /api/triage/start
```

Payload:

```json
{
  "patientId": "patient_id",
  "inputTextBn": "আমার মাথা ব্যথা করছে আর চোখে ঝাপসা দেখছি",
  "duration": "1_6_hours",
  "severity": "medium",
  "checkedDangerSigns": ["blurred_vision"]
}
```

Output:

```json
{
  "sessionId": "triage_session_id",
  "nextStep": "AI_EXTRACTION"
}
```

---

## Validation owned

Use Zod or Joi.

### Register validation

```text
name required
phone or email required
password minimum 6 characters
role must be MOTHER or HEALTH_WORKER
```

### Patient profile validation

```text
age required
trimester required
knownRiskFactors array
emergency contact optional but recommended
lastCheckupDate optional
```

### Symptom input validation

```text
inputTextBn required
duration optional
severity optional
checkedDangerSigns array
```

---

## DevOps responsibility

This member should add:

```text
JWT_SECRET
CLIENT_URL
AUTH_TOKEN_EXPIRY
```

to:

```text
/backend/.env.example
```

Also ensure protected frontend routes work after deployment.

---

## Tests owned

```text
- register mother
- login mother
- register health worker
- wrong password fails
- mother can create profile
- mother can start triage session
- unauthenticated user cannot access protected APIs
- mother cannot access worker dashboard route
```

---

## Acceptance criteria

This module is done when:

```text
1. A mother can register and login.
2. A health worker can register/login or use seeded credentials.
3. A mother can create/update her profile.
4. A mother can submit Bangla symptoms.
5. A triage session is created in MongoDB.
6. The triage session stores profileSnapshot and raw Bangla input.
7. Role-based frontend navigation works.
```

---

# Team Member 2: AI Triage, Rule Engine, RAG, Result Flow, and Safety Owner

## Main responsibility

This person owns the **core intelligence module**:

```text
AI extraction
→ confirmation
→ follow-up
→ case state builder
→ json-rules-engine
→ decision builder
→ rule-aware RAG
→ LLM explanation
→ safety validator
→ mother result
```

This is the most important technical module because the docs clearly say MatriSense should not behave like a free-form chatbot. The LLM should extract and explain, while the rule engine controls risk and RAG grounds care guidance.

---

## Modules owned

```text
1. AI symptom extraction
2. Symptom confirmation
3. Follow-up question logic
4. Case state builder
5. json-rules-engine triage
6. Decision builder
7. Rule-aware RAG care guidance
8. LLM Bangla explanation
9. Safety validator
10. Mother result page
11. AI test cases
```

---

## Frontend pages owned

```text
/frontend/src/pages
  ConfirmSymptomsPage.jsx
  FollowUpPage.jsx
  ResultPage.jsx
```

## Frontend components owned

```text
/frontend/src/components/triage
  ExtractedSymptomSummary.jsx
  ConfirmSymptomsCard.jsx
  FollowUpQuestionCard.jsx
  RiskCard.jsx
  CareGuidanceCard.jsx
  WarningSignsCard.jsx
  MatchedReasonsCard.jsx
  SafetyDisclaimer.jsx
  ResultActionCard.jsx
```

## Frontend API files owned

```text
/frontend/src/api
  triageApi.js
```

Functions:

```js
extractSymptoms(sessionId)
confirmSymptoms(sessionId, confirmedSymptoms)
getFollowUpQuestions(sessionId)
submitFollowUpAnswers(sessionId, answers)
runTriage(sessionId)
getTriageResult(sessionId)
```

---

## Backend routes owned

```text
/backend/routes
  triage.routes.js
  rag.routes.js
```

## Backend controllers owned

```text
/backend/controllers
  triage.controller.js
  rag.controller.js
```

## Backend services owned

```text
/backend/services
  caseStateBuilder.js
```

## AI files owned

```text
/backend/ai
  llmClient.js
  extractorPrompt.js
  explanationPrompt.js
  healthWorkerSummaryPrompt.js
  promptSchemas.js
  aiExtractorService.js
  explanationService.js
```

## Triage files owned

```text
/backend/triage
  symptomMap.js
  followUpMap.js
  rules.json
  engine.js
  ruleRunner.js
  decisionBuilder.js
  testCases.json
```

## RAG files owned

```text
/backend/rag
  knowledgeCards.json
  evidenceRetriever.js
  ragQueryBuilder.js
  ragReranker.js
  careGuidanceAssembler.js
```

## Safety files owned

```text
/backend/safety
  safetyValidator.js
  fallbackTemplates.js
```

---

## Database model fields owned

This member extends `TriageSession`:

```js
TriageSession {
  extractedSymptoms,
  extractionRawJson,
  confirmedSymptoms,
  followUpQuestions,
  followUpAnswers,
  caseState,
  ruleEvents,
  decision,
  careGuidanceContext,
  llmOutput,
  safeOutput,
  safetyValidation,
  status,
  completedAt
}
```

### Optional KnowledgeCard model

If knowledge cards are stored in MongoDB:

```js
KnowledgeCard {
  cardId,
  sourceName,
  sourceType,
  condition,
  symptoms,
  riskLevelAllowed,
  guidanceType,
  stepsBn,
  monitorBn,
  escalationTriggersBn,
  doNotSay,
  citation,
  evidenceTag,
  createdAt
}
```

For speed, use JSON first. The updated plan allows JSON knowledge cards as the practical MVP version, with vector retrieval as an upgrade.

---

## APIs owned

```text
POST /api/triage/:sessionId/extract
POST /api/triage/:sessionId/confirm
GET /api/triage/:sessionId/follow-up
POST /api/triage/:sessionId/answers
POST /api/triage/:sessionId/run
GET /api/triage/:sessionId/result
POST /api/rag/retrieve-guidance
GET /api/rag/knowledge-cards
GET /api/evidence/:tag
```

---

# Step-by-step AI Triage Development Plan

This is the detailed build plan for the AI triage module.

---

## Step 1: Freeze the internal symptom code list

Create:

```text
/backend/triage/symptomMap.js
```

Use fixed internal codes:

```js
export const SYMPTOM_CODES = [
  "headache",
  "severe_headache",
  "blurred_vision",
  "swelling",
  "vaginal_bleeding",
  "abdominal_pain",
  "severe_abdominal_pain",
  "fever",
  "severe_weakness",
  "vomiting",
  "vomiting_repeated",
  "cannot_keep_water_down",
  "dizziness",
  "fainting",
  "convulsion",
  "difficulty_breathing",
  "reduced_fetal_movement",
  "nausea",
  "fatigue"
];
```

Also map Bangla synonyms:

```js
export const BANGLA_SYMPTOM_SYNONYMS = {
  vaginal_bleeding: ["রক্তপাত", "রক্ত যাচ্ছে", "ব্লিডিং", "blood যাচ্ছে"],
  headache: ["মাথা ব্যথা", "মাথাব্যথা"],
  blurred_vision: ["চোখে ঝাপসা", "ঝাপসা দেখা", "চোখ ঝাপসা"],
  swelling: ["হাত ফুলে", "পা ফুলে", "মুখ ফুলে", "শরীর ফুলে"],
  abdominal_pain: ["পেট ব্যথা", "পেটে ব্যথা"],
  difficulty_breathing: ["শ্বাসকষ্ট", "শ্বাস নিতে কষ্ট"],
  convulsion: ["খিঁচুনি", "ফিট"],
  reduced_fetal_movement: ["বাচ্চার নড়াচড়া কম", "নড়াচড়া কম"]
};
```

Why this matters: the rule engine should never process raw Bangla text directly. It should receive normalized facts.

---

## Step 2: Define risk levels and action labels

Create:

```text
/backend/triage/constants.js
```

```js
export const RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  UNKNOWN: "UNKNOWN"
};

export const ACTIONS = {
  REST_AND_MONITOR: "REST_AND_MONITOR",
  HOME_CARE_AND_MONITOR: "HOME_CARE_AND_MONITOR",
  CONTACT_HEALTH_WORKER: "CONTACT_HEALTH_WORKER",
  VISIT_CLINIC: "VISIT_CLINIC",
  URGENT_CLINIC_VISIT: "URGENT_CLINIC_VISIT",
  URGENT_REFERRAL: "URGENT_REFERRAL"
};

export const GUIDANCE_TYPES = {
  SELF_CARE: "SELF_CARE",
  MONITORING: "MONITORING",
  CONTACT_HEALTH_WORKER: "CONTACT_HEALTH_WORKER",
  URGENT_ESCALATION: "URGENT_ESCALATION",
  WARNING_SIGNS: "WARNING_SIGNS"
};
```

---

## Step 3: Build the extractor prompt

Create:

```text
/backend/ai/extractorPrompt.js
```

The prompt should instruct the LLM:

```text
You only extract symptoms.
You do not diagnose.
You do not decide risk.
You do not prescribe medicine.
Return JSON only.
Use allowed symptom codes only.
Mark uncertain fields clearly.
```

Expected output:

```json
{
  "detectedSymptoms": ["headache", "blurred_vision"],
  "severity": {
    "headache": "unknown"
  },
  "duration": "unknown",
  "uncertainFields": ["swelling", "headache_severity"],
  "needsFollowUp": true
}
```

Also create:

```text
/backend/ai/promptSchemas.js
```

Validate the extractor output before saving.

---

## Step 4: Add keyword fallback extraction

Create:

```text
/backend/ai/fallbackExtractor.js
```

This protects the demo if the LLM fails.

Example logic:

```js
export function keywordFallbackExtract(inputTextBn, checkedDangerSigns = []) {
  const symptoms = new Set(checkedDangerSigns);

  for (const [symptom, words] of Object.entries(BANGLA_SYMPTOM_SYNONYMS)) {
    if (words.some(word => inputTextBn.includes(word))) {
      symptoms.add(symptom);
    }
  }

  return {
    detectedSymptoms: Array.from(symptoms),
    severity: {},
    duration: "unknown",
    uncertainFields: [],
    needsFollowUp: symptoms.size > 0
  };
}
```

The original risk plan already recommends fallback extraction if AI extraction becomes unreliable.

---

## Step 5: Implement extraction route

API:

```text
POST /api/triage/:sessionId/extract
```

Process:

```text
1. Load triage session.
2. Read initialInputBn and checkedDangerSigns.
3. Call LLM extractor.
4. Validate JSON.
5. If invalid, use keyword fallback.
6. Save extractedSymptoms and extractionRawJson.
7. Return extracted summary to frontend.
```

Output:

```json
{
  "sessionId": "abc",
  "extractedSymptoms": ["headache", "blurred_vision"],
  "needsConfirmation": true
}
```

---

## Step 6: Build symptom confirmation

Frontend page:

```text
/mother/confirm/:sessionId
```

API:

```text
POST /api/triage/:sessionId/confirm
```

Payload:

```json
{
  "confirmedSymptoms": ["headache", "blurred_vision"],
  "editedByUser": false
}
```

Backend saves:

```js
confirmedSymptoms
status = "CONFIRMED"
```

This is important because the docs include human confirmation as a safer step before triage.

---

## Step 7: Build follow-up question logic

Create:

```text
/backend/triage/followUpMap.js
```

Example:

```js
export const FOLLOW_UP_MAP = {
  headache: [
    {
      id: "blurred_vision",
      questionBn: "চোখে ঝাপসা দেখছেন কি?",
      type: "single_choice",
      options: [
        { labelBn: "হ্যাঁ", value: true },
        { labelBn: "না", value: false }
      ]
    },
    {
      id: "swelling",
      questionBn: "হাত, পা বা মুখ ফুলে গেছে কি?",
      type: "single_choice",
      options: [
        { labelBn: "হ্যাঁ", value: true },
        { labelBn: "না", value: false }
      ]
    },
    {
      id: "headache_severity",
      questionBn: "মাথা ব্যথা কি খুব তীব্র?",
      type: "single_choice",
      options: [
        { labelBn: "হালকা", value: "mild" },
        { labelBn: "মাঝারি", value: "moderate" },
        { labelBn: "তীব্র", value: "severe" }
      ]
    }
  ],

  abdominal_pain: [
    {
      id: "abdominal_pain_severity",
      questionBn: "পেটব্যথা কতটা তীব্র?",
      type: "single_choice",
      options: [
        { labelBn: "হালকা", value: "mild" },
        { labelBn: "মাঝারি", value: "moderate" },
        { labelBn: "তীব্র", value: "severe" }
      ]
    },
    {
      id: "vaginal_bleeding",
      questionBn: "রক্তপাত হচ্ছে কি?",
      type: "single_choice",
      options: [
        { labelBn: "হ্যাঁ", value: true },
        { labelBn: "না", value: false }
      ]
    }
  ]
};
```

Limit to 2–3 questions for the MVP, as the original plan requires.

---

## Step 8: Implement follow-up APIs

```text
GET /api/triage/:sessionId/follow-up
POST /api/triage/:sessionId/answers
```

`GET` should:

```text
1. Load confirmedSymptoms.
2. Detect missing fields.
3. Select max 3 questions.
4. Save questions to session.
5. Return questions.
```

`POST` should:

```text
1. Save answer.
2. Normalize value.
3. Update session.followUpAnswers.
4. Mark status = FOLLOW_UP_COMPLETED.
```

---

## Step 9: Build caseStateBuilder

Create:

```text
/backend/services/caseStateBuilder.js
```

Input:

```text
Patient profile
+ TriageSession
+ confirmed symptoms
+ follow-up answers
```

Output:

```json
{
  "patientId": "demo-patient-1",
  "profile": {
    "age": 28,
    "trimester": "third",
    "knownRiskFactors": ["hypertension"],
    "lastCheckupDaysAgo": 70
  },
  "symptoms": ["headache", "blurred_vision", "swelling"],
  "severity": {
    "headache": "severe"
  },
  "duration": "6_hours_plus",
  "followUpAnswers": {
    "swelling": true,
    "blurred_vision": true
  }
}
```

The uploaded docs identify this case-state object as the critical bridge between the frontend flow and rule engine.

---

## Step 10: Build json-rules-engine rules

Install:

```bash
npm install json-rules-engine
```

Create:

```text
/backend/triage/rules.json
```

Rule groups:

```text
A. HIGH danger-sign rules
B. MEDIUM warning rules
C. Risk modifier rules
D. Follow-up-needed rules
```

Minimum high-risk rules:

```text
1. vaginal_bleeding_high_risk
2. severe_abdominal_pain_high_risk
3. headache_with_blurred_vision_high_risk
4. convulsion_high_risk
5. difficulty_breathing_high_risk
6. reduced_fetal_movement_third_trimester_high_risk
7. fainting_high_risk
8. fever_with_severe_weakness_high_risk
```

Minimum medium-risk rules:

```text
1. fever_medium_risk
2. repeated_vomiting_medium_risk
3. mild_abdominal_pain_medium_risk
4. dizziness_medium_risk
5. headache_without_danger_sign_medium_or_followup
```

Modifiers:

```text
1. hypertension_history_modifier
2. anemia_history_modifier
3. previous_high_risk_pregnancy_modifier
4. long_gap_since_checkup_modifier
5. third_trimester_modifier_for_fetal_movement
```

---

## Step 11: Build ruleRunner

Create:

```text
/backend/triage/engine.js
/backend/triage/ruleRunner.js
```

Required custom operator:

```js
engine.addOperator("contains", (factValue, jsonValue) => {
  if (!Array.isArray(factValue)) return false;
  return factValue.includes(jsonValue);
});
```

Run:

```js
const { events } = await engine.run(caseState);
```

Output:

```json
[
  {
    "type": "HIGH_RISK",
    "params": {
      "riskLevel": "HIGH",
      "recommendedAction": "URGENT_CLINIC_VISIT",
      "reason": "Headache with blurred vision was reported.",
      "evidenceTag": "headache_vision_danger"
    }
  }
]
```

---

## Step 12: Build decisionBuilder

Create:

```text
/backend/triage/decisionBuilder.js
```

It should merge events into:

```json
{
  "riskLevel": "HIGH",
  "priority": "URGENT",
  "recommendedAction": "URGENT_CLINIC_VISIT",
  "matchedRules": ["headache_with_blurred_vision_high_risk"],
  "reasons": ["Headache with blurred vision was reported."],
  "evidenceTags": ["headache_vision_danger"],
  "allowedGuidanceType": "URGENT_ESCALATION",
  "followUpNeeded": false,
  "llmConstraints": [
    "Do not diagnose",
    "Do not prescribe medicine",
    "Do not downgrade risk level",
    "Use simple Bangla"
  ]
}
```

Core rule:

```text
If any HIGH_RISK event fires, final risk is HIGH.
Modifiers can increase risk, but never reduce it.
LLM cannot downgrade risk.
```

---

## Step 13: Create RAG knowledge cards

Create:

```text
/backend/rag/knowledgeCards.json
```

Minimum 20–30 cards.

Card categories:

```text
1. High-risk danger sign cards
2. Medium-risk contact-health-worker cards
3. Low-risk self-care cards
4. General warning sign cards
5. Safety disclaimer cards
```

Card structure:

```json
{
  "id": "headache_vision_danger",
  "sourceName": "Maternal warning sign guidance",
  "sourceType": "danger_sign_guidance",
  "condition": "headache_with_vision_changes",
  "riskLevelAllowed": ["HIGH"],
  "symptoms": ["headache", "blurred_vision", "swelling"],
  "guidanceType": "URGENT_ESCALATION",
  "stepsBn": [
    "দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।",
    "লক্ষণ নিজে নিজে সেরে যাওয়ার জন্য অপেক্ষা করবেন না।",
    "পরিবারের কাউকে সঙ্গে রাখুন।"
  ],
  "escalationTriggersBn": [
    "চোখে ঝাপসা দেখা",
    "তীব্র মাথাব্যথা",
    "মুখ বা হাত ফুলে যাওয়া",
    "অজ্ঞান বা খিঁচুনি"
  ],
  "doNotSay": [
    "rest only",
    "low risk",
    "take painkiller without doctor"
  ],
  "citation": "Maternal warning sign guidance"
}
```

The submission docs specifically recommend rule-aware RAG cards with riskLevelAllowed, guidanceType, symptoms, source, escalation triggers, and prohibited advice.

---

## Step 14: Build evidenceRetriever

Create:

```text
/backend/rag/evidenceRetriever.js
```

Logic:

```js
export function retrieveCareGuidance(decision, knowledgeCards) {
  return knowledgeCards.filter(card => {
    const riskAllowed = card.riskLevelAllowed.includes(decision.riskLevel);

    const symptomMatch = card.symptoms?.some(symptom =>
      decision.symptoms?.includes(symptom)
    );

    const evidenceTagMatch = decision.evidenceTags?.includes(card.id);

    const guidanceAllowed =
      card.guidanceType === decision.allowedGuidanceType ||
      card.guidanceType === "WARNING_SIGNS";

    return riskAllowed && guidanceAllowed && (symptomMatch || evidenceTagMatch);
  });
}
```

Special rule:

```text
If risk = HIGH, do not retrieve LOW self-care-only cards.
```

That is one of the most important safety controls. The docs clearly state high-risk outputs should not provide home-care-first advice.

---

## Step 15: Build careGuidanceAssembler

Create:

```text
/backend/rag/careGuidanceAssembler.js
```

Output:

```json
{
  "retrievedCards": ["headache_vision_danger"],
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
  "sources": ["Maternal warning sign guidance"],
  "blockedAdvice": [
    "diagnosis",
    "medicine dosage",
    "false reassurance"
  ]
}
```

---

## Step 16: Build explanation prompt

Create:

```text
/backend/ai/explanationPrompt.js
```

Input to LLM:

```json
{
  "decision": {
    "riskLevel": "HIGH",
    "recommendedAction": "URGENT_CLINIC_VISIT",
    "reasons": ["Headache with blurred vision was reported."]
  },
  "careGuidanceContext": {
    "stepsNowBn": [
      "দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।"
    ],
    "urgentWarningBn": [
      "চোখে ঝাপসা দেখা",
      "তীব্র মাথাব্যথা"
    ]
  },
  "constraints": [
    "Do not diagnose",
    "Do not prescribe medicine",
    "Do not add steps outside retrieved guidance",
    "Do not downgrade risk level",
    "Use simple Bangla"
  ]
}
```

Expected output:

```json
{
  "motherExplanationBn": "আপনার দেওয়া লক্ষণগুলো ঝুঁকিপূর্ণ হতে পারে।",
  "stepsNowBn": [
    "দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।"
  ],
  "monitorBn": [],
  "urgentWarningBn": [
    "চোখে ঝাপসা দেখা",
    "তীব্র মাথাব্যথা"
  ],
  "healthWorkerSummaryBn": "রোগী মাথাব্যথা ও চোখে ঝাপসা দেখার কথা জানিয়েছেন। সিস্টেম জরুরি ক্লিনিক যোগাযোগের পরামর্শ দিয়েছে।",
  "safetyDisclaimerBn": "MatriSense রোগ নির্ণয় করে না। এটি জরুরি ঝুঁকি বুঝতে সাহায্য করে।"
}
```

---

## Step 17: Build safety validator

Create:

```text
/backend/safety/safetyValidator.js
```

Block:

```text
- diagnosis
- medicine dosage
- certainty claims
- false reassurance
- risk downgrade
- unsupported home remedies
- HIGH risk with home-care-first advice
```

Forbidden Bangla patterns:

```js
const forbiddenPatterns = [
  "আপনার রোগ হলো",
  "নিশ্চিতভাবে",
  "এই ওষুধ খান",
  "ডোজ",
  "চিন্তার কিছু নেই",
  "শুধু বাসায় থাকুন",
  "ডাক্তার দেখানোর দরকার নেই"
];
```

Validator checks:

```text
1. Output risk level must match decision risk level.
2. Output must not contain forbidden patterns.
3. Output steps must come from careGuidanceContext.
4. HIGH risk must not include self-care-first language.
5. LOW risk must include warning signs.
6. Safety disclaimer must exist.
```

If invalid, use fallback templates.

The updated RAG plan requires safety validation to block diagnosis, medicine dosage, false reassurance, and contradictions with the rule-engine decision.

---

## Step 18: Implement run triage API

API:

```text
POST /api/triage/:sessionId/run
```

Process:

```text
1. Load session.
2. Load patient profile.
3. Build caseState.
4. Run json-rules-engine.
5. Build final decision.
6. Retrieve RAG care guidance.
7. Generate LLM explanation.
8. Run safety validator.
9. Save decision, careGuidanceContext, llmOutput, safeOutput.
10. Mark session COMPLETED.
11. Return result.
```

---

## Step 19: Implement result API

```text
GET /api/triage/:sessionId/result
```

Return:

```json
{
  "sessionId": "abc",
  "riskLevel": "HIGH",
  "priority": "URGENT",
  "recommendedAction": "URGENT_CLINIC_VISIT",
  "motherExplanationBn": "আপনার লক্ষণগুলো ঝুঁকিপূর্ণ হতে পারে।",
  "stepsNowBn": [],
  "monitorBn": [],
  "urgentWarningBn": [],
  "reasons": [],
  "sources": [],
  "safetyDisclaimerBn": ""
}
```

---

## Step 20: Build ResultPage

Frontend must show:

```text
Risk level
Urgency label
Why this result was given
What to do now
What to monitor
Urgent warning signs
Safety disclaimer
Sources/evidence label
Button: Back to home / View submitted case
```

---

## Step 21: Build AI triage tests

Create:

```text
/backend/triage/testCases.json
```

Minimum tests:

```text
LOW:
- mild nausea + mild headache, no danger signs
- fatigue only

MEDIUM:
- fever without severe weakness
- vomiting but can keep water down
- mild abdominal pain without bleeding

HIGH:
- vaginal bleeding
- severe abdominal pain
- headache + blurred vision
- convulsion
- difficulty breathing
- reduced fetal movement in third trimester
```

The original task plan also defines these same low/medium/high test groups as minimum acceptance tests.

---

# Team Member 3: Health Worker Dashboard, Referral, Audit, Docs, and Deployment Owner

## Main responsibility

This person owns the **health worker side and demo delivery**:

```text
worker dashboard
→ case list
→ case detail
→ referral note
→ status update
→ audit log
→ /docs page
→ deployment coordination
→ demo data
```

This is what proves MatriSense is not only a patient chatbot, but a full triage-to-follow-up system.

---

## Modules owned

```text
1. Health worker dashboard
2. Worker case detail
3. Referral/follow-up notes
4. Case status update
5. Audit log module
6. Static clinic/referral destination support
7. /docs technical page
8. Demo seed data
9. Deployment coordination
```

---

## Frontend pages owned

```text
/frontend/src/pages
  WorkerDashboardPage.jsx
  WorkerCaseDetailPage.jsx
  ReferralNotePage.jsx
  DocsPage.jsx
```

## Frontend components owned

```text
/frontend/src/components/worker
  CaseTable.jsx
  CasePriorityBadge.jsx
  CaseTimeline.jsx
  PatientProfilePanel.jsx
  MatchedRulesPanel.jsx
  EvidencePanel.jsx
  FollowUpAnswersPanel.jsx
  ReferralNoteForm.jsx
  StatusUpdateDropdown.jsx
  WorkerSummaryCard.jsx

/frontend/src/components/docs
  ArchitectureDiagram.jsx
  AiPipelineSection.jsx
  RagFlowSection.jsx
  SafetyGuardrailsSection.jsx
  DemoCredentialsSection.jsx
```

## Frontend API files owned

```text
/frontend/src/api
  workerApi.js
  referralApi.js
  docsApi.js
```

---

## Backend routes owned

```text
/backend/routes
  worker.routes.js
  referral.routes.js
  audit.routes.js
  docs.routes.js
```

## Backend controllers owned

```text
/backend/controllers
  worker.controller.js
  referral.controller.js
  audit.controller.js
  docs.controller.js
```

## Backend services owned

```text
/backend/services
  workerCase.service.js
  referral.service.js
  auditLogger.js
  seedDemoData.js
```

---

## Database models owned

### ReferralNote model

```js
ReferralNote {
  _id,
  triageSessionId,
  patientId,
  healthWorkerId,
  actionTaken,
  referredTo,
  followUpDate,
  note,
  statusAfterNote,
  createdAt
}
```

### AuditLog model

```js
AuditLog {
  _id,
  action,
  actorUserId,
  actorRole,
  sessionId,
  patientId,
  metadata,
  createdAt
}
```

### Optional static Clinic model

```js
Clinic {
  _id,
  name,
  type,
  district,
  phone,
  address,
  isEmergencyCapable
}
```

For MVP, static JSON clinic data is enough. The development plan says clinic/referral support can be simple and should not become full map/navigation.

---

## APIs owned

### Worker APIs

```text
GET /api/worker/cases
GET /api/worker/cases/:sessionId
PUT /api/worker/cases/:sessionId/status
```

### Referral APIs

```text
POST /api/referral-notes
GET /api/referral-notes/:sessionId
```

### Audit APIs

```text
GET /api/audit/:sessionId
```

Optional; can be internal only.

### Docs API optional

```text
GET /api/docs/system-summary
```

The `/docs` page can also be static frontend content.

---

## Worker dashboard behavior

Dashboard columns:

```text
Patient name
Age
Trimester
Main symptoms
Risk level
Priority
Recommended action
Status
Submitted time
Action button
```

Sort order:

```text
HIGH first
MEDIUM second
LOW last
Newest first within each risk group
```

Status values:

```text
NEW
VIEWED
CONTACTED
REFERRED
FOLLOW_UP_NEEDED
RESOLVED
```

---

## Worker case detail content

Show:

```text
Patient profile
Original Bangla input
Extracted symptoms
Confirmed symptoms
Follow-up questions and answers
Risk level
Recommended action
Matched rules
Reasons
RAG evidence/sources
Bangla mother guidance shown
Health-worker summary
Referral notes
Audit timeline
```

The MVP definition of done requires that the case appears in the worker dashboard, the worker can open case detail, and the worker can add referral/follow-up notes.

---

## /docs page sections

The docs page should include:

```text
1. Problem
2. Solution flow
3. System architecture
4. AI pipeline
5. Rule-aware RAG and care-guidance design
6. Rule engine design
7. Safety guardrails
8. Data lifecycle
9. Demo credentials
10. Team
```

This exact `/docs` structure is recommended in the submission planning document.

---

## DevOps responsibility

This member coordinates deployment:

```text
Frontend: Vercel
Backend: Render / Railway
Database: MongoDB Atlas
Environment variables: shared .env.example
Demo data: seed script
Production build check
README run instructions
```

Deployment files owned:

```text
README.md
.env.example
render.yaml optional
vercel.json optional
/backend/scripts/seedDemoData.js
```

README should include:

```text
project overview
problem statement
system architecture
AI pipeline
RAG flow
rule engine explanation
safety guardrails
how to run locally
demo credentials or demo flow
```

This is already listed as a required submission file in the task plan.

---

## Tests owned

```text
- worker can login
- worker can view case list
- high-risk cases appear first
- worker can open case detail
- worker can add referral note
- worker can update status
- referral note appears in case timeline
- audit log records important actions
- /docs page loads
```

---

# Shared Integration Contracts

These must be agreed on Day 1.

## Main case state contract

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
  "allowedGuidanceType": "URGENT_ESCALATION",
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

# 7-Day Development Plan Using the New Module Ownership

## Day 1: Architecture, contracts, repo setup

### Member 1

```text
- Set up auth flow structure.
- Create login/register pages.
- Create AuthContext.
- Create User and Patient model drafts.
- Create auth API contract.
- Create mother profile UI skeleton.
```

### Member 2

```text
- Finalize symptom codes.
- Finalize risk/action/guidance constants.
- Draft extractor prompt schema.
- Draft caseState contract.
- Create triage folder structure.
- Create first 5 rule candidates.
```

### Member 3

```text
- Create worker dashboard skeleton.
- Create case detail skeleton.
- Create referral note form skeleton.
- Create /docs skeleton.
- Prepare deployment plan and .env.example draft.
```

### Integration checkpoint

```text
- Repo structure finalized.
- API contracts agreed.
- Frontend routes agreed.
- MongoDB models agreed.
- Roles agreed: MOTHER and HEALTH_WORKER.
```

---

## Day 2: Auth + profile + symptom start

### Member 1

```text
- Complete register/login backend.
- Complete JWT middleware.
- Complete mother profile CRUD.
- Complete symptom input page.
- Implement POST /api/triage/start.
```

### Member 2

```text
- Complete LLM extractor service.
- Complete keyword fallback extractor.
- Complete POST /api/triage/:sessionId/extract.
- Test 10 Bangla symptom inputs.
```

### Member 3

```text
- Build worker login route compatibility.
- Build empty dashboard state.
- Build demo data structure.
- Start README and docs architecture sections.
```

### Integration checkpoint

```text
Mother can register/login → create profile → submit Bangla symptom → triage session created → extraction returns symptoms.
```

---

## Day 3: Confirmation + follow-up

### Member 1

```text
- Add protected mother routes.
- Connect symptom start page to extraction route.
- Route mother to confirmation page.
```

### Member 2

```text
- Build ConfirmSymptomsPage.
- Build POST /api/triage/:sessionId/confirm.
- Build followUpMap.js.
- Build GET follow-up questions.
- Build POST follow-up answers.
- Save confirmed symptoms and answers.
```

### Member 3

```text
- Build worker case list API draft using available sessions.
- Build auditLogger utility.
- Log symptom submitted, extracted, confirmed, follow-up answered.
```

### Integration checkpoint

```text
Symptom input → AI extraction → confirmation → follow-up questions → answers saved.
```

---

## Day 4: Rule engine + RAG v1

### Member 1

```text
- Ensure patient profile fields are correctly stored.
- Ensure profileSnapshot is passed into triage session.
- Fix auth-related integration bugs.
```

### Member 2

```text
- Complete rules.json with 10–15 rules.
- Complete ruleRunner.
- Complete decisionBuilder.
- Complete 20–30 knowledgeCards.json.
- Complete evidenceRetriever.
- Complete careGuidanceAssembler.
- Implement POST /api/triage/:sessionId/run.
```

### Member 3

```text
- Build worker dashboard case sorting by risk.
- Build MatchedRulesPanel and EvidencePanel.
- Add status labels.
```

### Integration checkpoint

```text
Follow-up answers → caseState → rule engine → decision → RAG guidance.
```

---

## Day 5: Explanation + safety + result page

### Member 1

```text
- Polish mother navigation.
- Add loading/error states.
- Add Bangla UI labels.
```

### Member 2

```text
- Complete explanationPrompt.
- Complete explanationService.
- Complete safetyValidator.
- Complete fallback templates.
- Complete GET /api/triage/:sessionId/result.
- Build ResultPage.
```

### Member 3

```text
- Build worker case detail page.
- Show patient profile, symptoms, follow-up answers, decision, evidence, summary.
- Add audit timeline display.
```

### Integration checkpoint

```text
Mother can complete full triage and see safe Bangla result.
```

---

## Day 6: Referral + docs + demo cases

### Member 1

```text
- Final auth polish.
- Add seeded demo mother and worker accounts.
- Ensure protected route behavior works after refresh.
```

### Member 2

```text
- Create 25–30 synthetic AI triage test cases.
- Test LOW, MEDIUM, HIGH outputs.
- Fix rule and RAG edge cases.
- Make sure HIGH never shows home-care-first advice.
```

### Member 3

```text
- Complete referral note API.
- Complete referral note frontend.
- Complete status update.
- Complete /docs page.
- Seed 3 demo cases:
  1. low-risk nausea/headache
  2. medium-risk fever/weakness
  3. high-risk headache + blurred vision + hypertension
```

### Integration checkpoint

```text
Mother result → appears in worker dashboard → worker opens case → adds referral note → status updates.
```

---

## Day 7: Testing, deployment, demo polish

### Member 1

```text
- Test auth and mother flow on deployed frontend.
- Fix mobile responsiveness for mother pages.
- Prepare demo credentials section.
```

### Member 2

```text
- Run AI test cases.
- Check safety validator.
- Check RAG retrieval correctness.
- Prepare AI architecture explanation for README/docs.
```

### Member 3

```text
- Deploy backend.
- Deploy frontend.
- Seed database.
- Finalize README.
- Finalize /docs.
- Prepare demo script and screenshots.
```

### Final checkpoint

```text
1. Mother login works.
2. Mother profile works.
3. Bangla symptom input works.
4. AI extraction works.
5. Confirmation works.
6. Follow-up works.
7. Rule engine works.
8. RAG guidance works.
9. Bangla result works.
10. Worker dashboard works.
11. Case detail works.
12. Referral note works.
13. Auth protection works.
14. /docs works.
15. Demo can be shown in under 3 minutes.
```

---

# Recommended Git Branches

Because each member now owns full modules:

```text
main
dev
feature/auth-mother-flow
feature/ai-triage-rag
feature/worker-dashboard-docs
```

Merge rule:

```text
All branches merge into dev daily.
Only stable dev merges into main.
Deploy from main.
```

---

# Final task ownership summary

## Member 1: Identity + Mother Intake

```text
Owns:
- auth
- role routing
- mother profile
- Bangla symptom input
- initial triage session creation

Builds:
- frontend pages
- backend auth/patient/session-start APIs
- User and Patient schemas
- protected routes
- auth tests
```

## Member 2: AI Triage + RAG + Result

```text
Owns:
- AI extraction
- confirmation
- follow-up
- case state
- json-rules-engine
- decision builder
- RAG guidance
- LLM explanation
- safety validator
- result page

Builds:
- frontend triage/result pages
- backend AI/triage/RAG APIs
- TriageSession AI fields
- knowledgeCards
- testCases
- safety tests
```

## Member 3: Worker + Referral + Docs + Deployment

```text
Owns:
- health worker dashboard
- case detail
- referral notes
- case status
- audit log
- docs page
- demo data
- deployment coordination

Builds:
- frontend worker/docs pages
- backend worker/referral/audit APIs
- ReferralNote and AuditLog schemas
- seed scripts
- README
- deployment setup
```

---

# Best practical advice

Since you added authentication, keep it **small and stable**. Authentication should support the demo, not consume the whole hackathon.

The technical priority should remain:

```text
A working mother-to-health-worker triage case.
```

The strongest MVP is still the one defined in the documents: a complete, demoable vertical slice, not many disconnected features.