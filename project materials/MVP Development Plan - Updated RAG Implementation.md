Yes — now we should zoom out from only the AI triage assistant and define the **whole MVP system**.

For the preliminary round, MatriSense should be a **small but complete vertical slice**:

```text
Mother profile
→ Bangla symptom input
→ AI extraction
→ confirmation / follow-up questions
→ rule-based triage
→ Bangla result
→ health worker dashboard
→ referral/follow-up note
```

This matches the BuildFest preliminary strategy we already defined: a focused demo showing **Bangla symptom input → AI triage → risk classification → next action → health worker follow-up**, not a full product.

Below is the MVP section-by-section.

---

# 0. MVP system goal

The MVP should prove one complete workflow:

> A rural pregnant mother reports symptoms in Bangla, MatriSense structures the case, checks danger signs, gives a safe urgency result, and sends the case to a health worker for follow-up.

The MVP is not trying to build every feature. The official BuildFest guide rewards clear AI thinking, basic system flow, Bangla/localization, feasibility, and a demo/prototype rather than a perfect finished system.

So every module should support this one flow.

---

# 1. Role entry / app shell module

## Purpose

This is the starting point of the app. It lets the demo user choose which side of the system they want to enter.

For MVP, you can keep this simple:

```text
Select role:
- Mother
- Health Worker
```

You do **not** need full authentication in the preliminary MVP unless your team finishes early.

## Screens

```text
/                 → Landing page
/select-role      → Mother / Health Worker selection
/mother           → Mother flow starts
/worker           → Health worker dashboard
```

## Why this module matters

It helps the demo flow feel like a real system with two user groups:

```text
Mother side = symptom reporting and result
Health worker side = case review and follow-up
```

## MVP implementation

Use React Router:

```text
/role/mother
/role/worker
```

Use a simple role state:

```js
const selectedRole = "mother"; 
```

Later, this can become JWT-based login.

## Connected modules

```text
Role Entry
  ├── Mother Profile Module
  └── Health Worker Dashboard Module
```

---

# 2. Mother profile module

## Purpose

This module stores the mother’s basic pregnancy information. This is important because symptoms should not be interpreted alone. The same symptom can have different urgency depending on pregnancy stage, known risk factors, and past history.

Your project outline already treats the maternal profile as the system memory for pregnancy stage, expected delivery date, last checkup date, known risk factors, and emergency contact.

## MVP fields

Keep it small:

```text
- Name
- Age
- Phone number
- Pregnancy stage / trimester
- Expected delivery date
- Last checkup date
- Known risk factors
- Emergency contact
```

Known risk factors can be checkboxes:

```text
- Hypertension
- Diabetes
- Anemia
- Previous C-section
- Previous miscarriage
- Previous high-risk pregnancy
- None
```

## Screen

```text
/mother/profile
```

## Frontend components

```text
MotherProfileForm
RiskFactorCheckboxGroup
EmergencyContactInput
SaveAndContinueButton
```

## Backend API

```text
POST /api/patients
GET /api/patients/:id
PUT /api/patients/:id
```

## MongoDB collection

```js
Patient {
  _id,
  name,
  age,
  phone,
  trimester,
  expectedDeliveryDate,
  lastCheckupDate,
  knownRiskFactors,
  emergencyContact,
  createdAt,
  updatedAt
}
```

## Output of this module

After the profile is saved, the frontend should hold:

```js
patientId
```

That `patientId` will be passed to the symptom module.

## Connected modules

```text
Mother Profile
  ↓
Symptom Input
  ↓
Triage Session
```

---

# 3. Bangla symptom input module

## Purpose

This is where the mother reports her current problem.

For the preliminary MVP, **Bangla text input is mandatory**. Voice input can be optional or demo-only because unstable voice input may waste time.

The official project outline emphasizes Bangla text input/output as very important for rural usability, and voice can be added if time allows.

## MVP fields

```text
- Symptom description in Bangla
- Symptom duration
- Severity
- Optional danger sign checkboxes
```

Example UI:

```text
আপনার সমস্যা লিখুন:
[আমার মাথা ব্যথা করছে এবং বমি বমি লাগছে]

কতক্ষণ ধরে হচ্ছে?
[১ ঘণ্টার কম] [১–৬ ঘণ্টা] [৬ ঘণ্টার বেশি]

ব্যথা/সমস্যার মাত্রা:
[হালকা] [মাঝারি] [তীব্র]
```

Danger sign checkboxes:

```text
- রক্তপাত হচ্ছে
- তীব্র পেটব্যথা
- চোখে ঝাপসা দেখা
- হাত/পা/মুখ ফুলে যাওয়া
- জ্বর
- বাচ্চার নড়াচড়া কম
- শ্বাসকষ্ট
- অজ্ঞান/খিঁচুনি
```

## Screen

```text
/mother/symptoms
```

## Frontend components

```text
BanglaSymptomTextarea
DurationSelector
SeveritySelector
DangerSignCheckboxes
SubmitSymptomsButton
```

## Backend API

```text
POST /api/triage/start
```

Payload:

```json
{
  "patientId": "123",
  "inputTextBn": "আমার মাথা ব্যথা করছে এবং বমি বমি লাগছে",
  "duration": "1_6_hours",
  "severity": "medium",
  "checkedDangerSigns": []
}
```

## Output of this module

This creates a `triageSession`.

```js
triageSessionId
```

## Connected modules

```text
Symptom Input
  ↓
AI Symptom Extraction Module
  ↓
Human Confirmation Module
```

---

# 4. AI symptom extraction and normalization module

## Purpose

This module converts messy Bangla input into structured facts that the rule engine can understand.

This is where the LLM is useful.

The LLM should not decide risk. It should extract:

```text
- symptoms
- severity
- duration
- uncertain fields
- possible follow-up needs
```

Your implementation guide already defines this pattern: Bangla input goes to LLM extraction, then follow-up questions, then the rule engine calculates urgency.

## Example

Mother writes:

```text
আমার মাথা ব্যথা করছে আর চোখে ঝাপসা দেখছি
```

LLM extraction returns:

```json
{
  "detectedSymptoms": ["headache", "blurred_vision"],
  "severity": {
    "headache": "unknown"
  },
  "duration": "unknown",
  "uncertainFields": ["headache_severity", "swelling"],
  "needsFollowUp": true
}
```

## Internal symptom codes

Use fixed symptom codes:

```text
headache
blurred_vision
swelling
vaginal_bleeding
abdominal_pain
fever
vomiting
vomiting_repeated
dizziness
fainting
convulsion
difficulty_breathing
reduced_fetal_movement
```

## Why normalization matters

A mother may write the same symptom in different ways:

```text
রক্তপাত হচ্ছে
রক্ত যাচ্ছে
ব্লিডিং হচ্ছে
blood যাচ্ছে
```

All should become:

```text
vaginal_bleeding
```

## Backend service

```text
aiExtractorService.js
```

Function:

```js
extractSymptoms(inputTextBn, checkedDangerSigns)
```

## Backend API

This can be internal only. But if you want a separate route:

```text
POST /api/triage/:sessionId/extract
```

## Output of this module

```js
extractedFacts = {
  symptoms: ["headache", "blurred_vision"],
  severity: {},
  duration: "unknown",
  uncertainFields: ["swelling", "headache_severity"]
}
```

## Connected modules

```text
AI Symptom Extraction
  ↓
Human Confirmation
  ↓
Follow-up Question Module
```

---

# 5. Human confirmation module

## Purpose

Before running final triage, the mother should confirm that the system understood her symptoms correctly.

This is important because the app is dealing with health information. The official project outline includes human-in-the-loop confirmation to reduce misunderstanding and support safer AI use.

## Screen

```text
/mother/confirm-symptoms
```

## Example UI

```text
আমরা যা বুঝেছি:

- মাথা ব্যথা
- চোখে ঝাপসা দেখা

এগুলো কি ঠিক?

[হ্যাঁ, ঠিক আছে] [না, সংশোধন করবো]
```

## Frontend components

```text
ExtractedSymptomSummary
ConfirmButton
EditButton
```

## Backend API

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

## Output

A confirmed case state.

## Connected modules

```text
Human Confirmation
  ↓
Follow-up Question Module
  ↓
Rule Engine
```

---

# 6. Follow-up question module

## Purpose

This module asks only the missing questions needed for triage.

For example, if the mother says “headache,” the system should ask about:

```text
- blurred vision
- swelling
- severity
- duration
```

Your implementation guide already says follow-up answers should be stored in the same triage session and should update the case state before the rule engine recalculates risk.

## MVP rule

Limit follow-up questions:

```text
Maximum 2–3 questions
```

This prevents the demo from becoming too long.

## Example

Input:

```text
মাথা ব্যথা করছে
```

Follow-up questions:

```text
1. চোখে ঝাপসা দেখছেন কি?
2. হাত, পা বা মুখ ফুলে গেছে কি?
3. মাথা ব্যথা কি খুব তীব্র?
```

## Frontend screen

```text
/mother/follow-up
```

## Frontend components

```text
QuestionCard
SingleChoiceOptions
NextQuestionButton
```

## Backend API

```text
GET /api/triage/:sessionId/follow-up
POST /api/triage/:sessionId/answers
```

## Data saved

```js
FollowUpAnswer {
  sessionId,
  questionId,
  questionBn,
  answer,
  normalizedValue,
  answeredAt
}
```

## Output

Updated `caseState`.

```js
caseState = {
  symptoms: ["headache", "blurred_vision"],
  severity: {
    headache: "severe"
  },
  followUpAnswers: {
    swelling: false,
    blurredVision: true
  }
}
```

## Connected modules

```text
Follow-up Questions
  ↓
Case State Manager
  ↓
json-rules-engine
```

---

# 7. Triage session / case state manager module

## Purpose

This is one of the most important backend modules.

It collects everything into one case object:

```text
profile + history + symptoms + follow-up answers
```

The rule engine should not receive random pieces of data. It should receive one clean structured object.

## Main responsibility

Build this:

```js
caseState = {
  patientId,
  profile: {},
  history: {},
  symptoms: [],
  severity: {},
  duration: {},
  followUpAnswers: {},
  knownRiskFactors: [],
  lastCheckupDaysAgo
}
```

## Why this matters

This is how MatriSense becomes more than a chatbot.

It builds a medical record from the interaction, which later helps the health worker see:

```text
- what the mother reported
- what the system asked
- what the mother answered
- what danger signs were checked
- what risk was assigned
- why it was assigned
```

## Backend service

```text
caseStateBuilder.js
```

Function:

```js
buildCaseState(patient, triageSession, followUpAnswers)
```

## MongoDB collection

```js
TriageSession {
  _id,
  patientId,
  profileSnapshot,
  initialInputBn,
  extractedSymptoms,
  confirmedSymptoms,
  followUpAnswers,
  caseState,
  decision,
  status,
  createdAt,
  completedAt
}
```

## Connected modules

```text
Patient Profile
Symptom Input
Follow-up Answers
        ↓
Case State Manager
        ↓
Rule Engine
```

---

# 8. json-rules-engine triage module

## Purpose

This is the clinical safety decision layer.

It checks danger signs and produces a structured decision package.

For the preliminary MVP, use:

```text
json-rules-engine
```

The engine receives structured facts, not raw Bangla text.

## Input

```json
{
  "symptoms": ["headache", "blurred_vision"],
  "trimester": "third",
  "knownRiskFactors": ["hypertension"],
  "headacheSeverity": "severe",
  "lastCheckupDaysAgo": 70
}
```

## Output events

The engine may trigger multiple events:

```json
[
  {
    "type": "HIGH_RISK",
    "params": {
      "reason": "Headache with blurred vision was reported.",
      "recommendedAction": "URGENT_CLINIC_VISIT",
      "evidenceTag": "WHO_CDC_HEADACHE_VISION_WARNING"
    }
  },
  {
    "type": "RISK_MODIFIER",
    "params": {
      "modifierScore": 2,
      "reason": "Known hypertension history increases concern."
    }
  }
]
```

## Backend files

```text
/backend/triage
  rules.json
  engine.js
  ruleRunner.js
  decisionBuilder.js
```

## What this module decides

```text
- risk level
- urgency
- recommended action
- matched rules
- reasons
- missing information
- evidence tags
- LLM constraints
```

## Important

The rule engine does **not** generate the final Bangla paragraph. It generates the structured decision.

## Connected modules

```text
Case State Manager
  ↓
json-rules-engine
  ↓
Decision Builder
  ↓
RAG / Knowledge Layer
  ↓
LLM Explanation Generator
```

---

# 9. Decision builder module

## Purpose

`json-rules-engine` may trigger many events. The decision builder merges them into one final decision.

Example:

```text
Rule 1: headache + blurred vision → HIGH
Rule 2: hypertension history → modifier +2
Rule 3: long gap since checkup → modifier +1
```

The final decision should be:

```json
{
  "riskLevel": "HIGH",
  "priority": "URGENT",
  "recommendedAction": "URGENT_CLINIC_VISIT",
  "reasons": [
    "Headache with blurred vision was reported.",
    "Known hypertension history increases concern.",
    "Long gap since last checkup."
  ],
  "matchedRules": [
    "headache_with_blurred_vision_high_risk",
    "known_hypertension_modifier",
    "long_gap_since_checkup"
  ],
  "evidenceTags": [
    "WHO_CDC_HEADACHE_VISION_WARNING"
  ],
  "followUpNeeded": false,
  "llmConstraints": [
    "Do not diagnose",
    "Do not prescribe medicine",
    "Do not downgrade risk level"
  ]
}
```

## Backend file

```text
decisionBuilder.js
```

## Connected modules

```text
Rule Engine Events
  ↓
Decision Builder
  ↓
Triage Result Storage
  ↓
Explanation Generator
```

---

# 10. Rule-aware RAG / care guidance module

## Purpose

This module should no longer be treated as only a lightweight evidence lookup. For the improved MVP, the RAG layer should provide **source-grounded care guidance** for the mother and **evidence support** for the health worker.

The main idea is:

```text
Rule engine = decides urgency and allowed advice type
RAG = retrieves safe, source-grounded care steps and warning signs
LLM = explains the fixed decision in simple Bangla
Safety validator = blocks diagnosis, medicine advice, and contradictions
```

This makes MatriSense more useful than a simple triage label. Instead of only saying “rest” or “go to clinic,” the system can provide practical, guideline-grounded steps such as what to monitor, what to avoid, and when to escalate.

## Why this matters for the MVP

A pregnant mother may want immediate steps she can follow. If MatriSense only says:

```text
Rest and drink water.
```

that feels generic. But if the rule engine first confirms there are no danger signs, and RAG retrieves safe care steps from trusted guidance, the output can become:

```text
- Take small sips of water often.
- Eat small, light meals instead of one large meal.
- Rest in a quiet place.
- Monitor whether headache becomes severe.
- Contact a health worker urgently if vision becomes blurry, swelling appears, vomiting continues, or you cannot keep water down.
```

This is more useful while still staying within ethical boundaries.

## What this module retrieves

The RAG layer should retrieve four kinds of information:

```text
1. Safe self-care steps
2. Danger-sign / escalation triggers
3. Source-backed explanation snippets
4. Health-worker evidence summaries
```

It should not retrieve or generate:

```text
- diagnosis
- medicine dosage
- treatment plans
- false reassurance
- unsupported home remedies
```

## MVP knowledge structure

For the preliminary round, the simplest safe design is to use **curated knowledge cards**. These can be stored in JSON, MongoDB, or a small vector database.

Each knowledge card should contain:

```text
- card id
- source name
- source type
- related symptoms
- allowed risk levels
- guidance type
- patient-safe steps
- escalation triggers
- prohibited output types
- source/citation label
```

## Example knowledge card: mild nausea self-care

```json
{
  "id": "nausea_mild_selfcare",
  "sourceName": "Public pregnancy guidance",
  "sourceType": "maternal_health_guidance",
  "condition": "nausea_vomiting_pregnancy",
  "riskLevelAllowed": ["LOW", "MEDIUM"],
  "symptoms": ["nausea", "vomiting"],
  "guidanceType": "SELF_CARE",
  "stepsBn": [
    "অল্প অল্প করে পানি পান করুন।",
    "একবারে বেশি না খেয়ে অল্প অল্প করে হালকা খাবার খান।",
    "যে খাবার বা গন্ধে বমি বমি লাগে তা এড়িয়ে চলুন।",
    "পর্যাপ্ত বিশ্রাম নিন।"
  ],
  "escalationTriggersBn": [
    "বারবার বমি হলে",
    "পানি রাখতে না পারলে",
    "মাথা ঘোরা বা দুর্বলতা বাড়লে"
  ],
  "doNotSay": [
    "take medicine",
    "diagnose disease",
    "guarantee normal"
  ],
  "citation": "Public pregnancy self-care guidance"
}
```

## Example knowledge card: headache with vision warning

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
    "পরিবারের কাউকে সঙ্গে রাখুন।",
    "জরুরি যোগাযোগ নম্বর প্রস্তুত রাখুন।"
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

## Rule-aware retrieval flow

The RAG query should not be based only on the raw user message. It should use the **decision package** created by the rule engine.

Example rule-engine decision:

```json
{
  "symptoms": ["nausea", "headache"],
  "riskLevel": "LOW",
  "recommendedAction": "HOME_CARE_AND_MONITOR",
  "allowedGuidanceType": "SELF_CARE_STEPS",
  "dangerSignsAbsent": [
    "blurred_vision",
    "swelling",
    "severe_headache",
    "repeated_vomiting"
  ],
  "evidenceTags": [
    "nausea_mild_selfcare",
    "headache_monitoring",
    "maternal_warning_signs"
  ]
}
```

The retriever should use:

```text
- riskLevel
- symptoms
- evidenceTags
- allowedGuidanceType
- matched rules
- pregnancy stage if relevant
```

Then it should retrieve only cards that match the allowed risk level and guidance type.

## Risk-based RAG behavior

### LOW risk

Allowed output:

```text
- self-care steps
- monitoring advice
- escalation triggers
- safety note
```

Example allowed guidance:

```text
Take small sips of water, eat small light meals, rest, avoid triggers, and monitor headache.
```

### MEDIUM risk

Allowed output:

```text
- contact health worker
- visit clinic soon if symptoms continue
- safe temporary steps while waiting
- warning signs
```

Example allowed guidance:

```text
Contact a health worker today. While waiting, take small sips of water and rest. If vomiting continues or headache worsens, seek urgent care.
```

### HIGH risk

Allowed output:

```text
- urgent clinic/referral instruction
- do not delay
- keep someone with the mother
- prepare emergency contact
- source-backed danger-sign explanation
```

Not allowed:

```text
- “try home remedies first”
- “rest and see”
- “probably normal”
```

## Backend files

```text
/backend/rag
  knowledgeCards.json
  evidenceRetriever.js
  ragQueryBuilder.js
  ragReranker.js
  careGuidanceAssembler.js
```

Purpose of each file:

```text
knowledgeCards.json
- stores source-grounded maternal guidance cards

evidenceRetriever.js
- retrieves matching cards using evidenceTags, symptoms, riskLevel, and guidanceType

ragQueryBuilder.js
- builds a retrieval query from the rule-engine decision package

ragReranker.js
- prioritizes cards that match the triggered rule and risk level

careGuidanceAssembler.js
- prepares the final context packet for the LLM explanation module
```

## MVP retrieval logic

For the first implementation, you can use JSON filtering:

```js
function retrieveCareGuidance(decision, knowledgeCards) {
  return knowledgeCards.filter(card => {
    const riskAllowed = card.riskLevelAllowed.includes(decision.riskLevel);
    const symptomMatch = card.symptoms.some(symptom =>
      decision.symptoms.includes(symptom)
    );
    const guidanceAllowed =
      card.guidanceType === decision.allowedGuidanceType ||
      card.guidanceType === "WARNING_SIGNS" ||
      card.guidanceType === "URGENT_ESCALATION";

    return riskAllowed && symptomMatch && guidanceAllowed;
  });
}
```

If time allows, upgrade it to vector retrieval:

```text
- embed guideline chunks
- store in Supabase pgvector or MongoDB Atlas Vector Search
- retrieve top-k chunks
- filter by metadata: symptoms, riskLevelAllowed, guidanceType
- rerank cards that match the rule-engine evidenceTags
```

## Output of this module

The module should return a `careGuidanceContext` object:

```json
{
  "retrievedCards": [
    "nausea_mild_selfcare",
    "headache_monitoring",
    "maternal_warning_signs"
  ],
  "stepsBn": [
    "অল্প অল্প করে পানি পান করুন।",
    "অল্প অল্প করে হালকা খাবার খান।",
    "শান্ত জায়গায় বিশ্রাম নিন।"
  ],
  "monitorBn": [
    "মাথাব্যথা বাড়ছে কি না",
    "চোখে ঝাপসা দেখছেন কি না",
    "বমি বেড়ে যাচ্ছে কি না"
  ],
  "urgentWarningBn": [
    "মাথাব্যথা তীব্র হলে",
    "চোখে ঝাপসা দেখলে",
    "বারবার বমি হলে বা পানি রাখতে না পারলে"
  ],
  "sources": [
    "Public pregnancy self-care guidance",
    "Maternal warning sign guidance"
  ],
  "blockedAdvice": [
    "diagnosis",
    "medicine dosage",
    "false reassurance"
  ]
}
```

## Connected modules

```text
Decision Builder
  ↓
Rule-aware RAG Retriever
  ↓
Care Guidance Context
  ↓
LLM Explanation Generator
  ↓
Safety Validator
  ↓
Mother Result Page + Health Worker Case Detail
```

# 11. LLM explanation and summary module

## Purpose

This module turns the structured decision and RAG-retrieved care guidance into simple Bangla output.

It should generate three outputs:

```text
1. Mother-facing explanation
2. Mother-facing step-by-step care guidance
3. Health-worker handover summary
```

The LLM should receive:

```text
- fixed risk level
- fixed recommended action
- reasons from the rule engine
- relevant profile context
- retrieved RAG care guidance cards
- safe steps from source-grounded guidance
- escalation triggers
- safety constraints
```

It should not decide the risk itself. It also should not invent steps outside the retrieved guidance cards.

## Input

```json
{
  "riskLevel": "LOW",
  "recommendedAction": "HOME_CARE_AND_MONITOR",
  "reasons": [
    "No emergency danger signs were reported after follow-up questions."
  ],
  "careGuidanceContext": {
    "stepsBn": [
      "অল্প অল্প করে পানি পান করুন।",
      "অল্প অল্প করে হালকা খাবার খান।",
      "শান্ত জায়গায় বিশ্রাম নিন।"
    ],
    "monitorBn": [
      "মাথাব্যথা বাড়ছে কি না",
      "চোখে ঝাপসা দেখছেন কি না",
      "বমি বেড়ে যাচ্ছে কি না"
    ],
    "urgentWarningBn": [
      "মাথাব্যথা তীব্র হলে",
      "চোখে ঝাপসা দেখলে",
      "বারবার বমি হলে বা পানি রাখতে না পারলে"
    ],
    "sources": [
      "Public pregnancy self-care guidance",
      "Maternal warning sign guidance"
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

## Output

```json
{
  "motherExplanationBn": "আপনার উত্তর অনুযায়ী এখন কোনো জরুরি বিপদ সংকেত পাওয়া যায়নি। তবে লক্ষণগুলো খেয়াল রাখা জরুরি।",
  "stepsNowBn": [
    "অল্প অল্প করে পানি পান করুন।",
    "একবারে বেশি না খেয়ে অল্প অল্প করে হালকা খাবার খান।",
    "শান্ত জায়গায় বিশ্রাম নিন।"
  ],
  "monitorBn": [
    "মাথাব্যথা বাড়ছে কি না",
    "চোখে ঝাপসা দেখছেন কি না",
    "বমি বেড়ে যাচ্ছে কি না"
  ],
  "urgentWarningBn": [
    "মাথাব্যথা তীব্র হলে",
    "চোখে ঝাপসা দেখলে",
    "বারবার বমি হলে বা পানি রাখতে না পারলে"
  ],
  "healthWorkerSummaryBn": "রোগী বমি বমি ভাব ও মাথাব্যথার কথা জানিয়েছেন। ফলো-আপে জরুরি বিপদ সংকেত পাওয়া যায়নি। সিস্টেম ঘরে পর্যবেক্ষণ ও সতর্ক লক্ষণ দেখা দিলে স্বাস্থ্যকর্মীর সঙ্গে যোগাযোগের পরামর্শ দিয়েছে।",
  "safetyDisclaimerBn": "MatriSense রোগ নির্ণয় করে না। এটি জরুরি ঝুঁকি বুঝতে এবং নিরাপদ পরবর্তী পদক্ষেপ নিতে সাহায্য করে।"
}
```

## High-risk output behavior

If risk is HIGH, the LLM should not generate home-care-first advice. It should only format urgent escalation steps from the retrieved high-risk guidance cards.

Example high-risk output:

```text
Risk level: HIGH

আপনার লক্ষণগুলো ঝুঁকিপূর্ণ হতে পারে। মাথাব্যথার সঙ্গে চোখে ঝাপসা দেখা বা শরীর ফুলে যাওয়া গর্ভাবস্থায় সতর্কতার লক্ষণ হতে পারে।

এখন করণীয়:
1. দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
2. লক্ষণ নিজে নিজে সেরে যাওয়ার জন্য অপেক্ষা করবেন না।
3. পরিবারের কাউকে সঙ্গে রাখুন।
4. জরুরি যোগাযোগ নম্বর প্রস্তুত রাখুন।
```

## Backend file

```text
explanationService.js
```

## Connected modules

```text
Decision Builder + Rule-aware RAG Retriever
  ↓
LLM Explanation + Care Guidance Generator
  ↓
Safety Validator
  ↓
Mother Result Page + Health Worker Dashboard
```

# 12. Safety validator module

## Purpose

This module checks the LLM output before showing it to the patient.

It prevents unsafe wording and also checks that the LLM only used guidance allowed by the rule engine and retrieved RAG cards.

## Things to block

```text
- diagnosis
- medicine dosage
- certainty claims
- “you are fine” false reassurance
- changing risk level
- unsupported home remedies
- steps not present in retrieved RAG guidance
- low-risk self-care advice when the rule engine says HIGH
```

## Example forbidden patterns

```text
আপনার রোগ হলো
নিশ্চিতভাবে
এই ওষুধ খান
ডোজ
চিন্তার কিছু নেই
শুধু বাসায় থাকুন
```

## Additional RAG safety checks

The validator should check:

```text
1. Does the output risk level match the rule-engine risk level?
2. Does the output include medicine or diagnosis?
3. Are the patient steps present in the retrieved careGuidanceContext?
4. If risk is HIGH, did the output avoid home-care-first advice?
5. If risk is LOW, did the output still include escalation triggers?
6. Did the output include the safety disclaimer?
```

## Backend file

```text
safetyValidator.js
```

## Input

```js
llmOutput
decision
careGuidanceContext
```

## Output

```js
safeOutput
```

If unsafe:

```text
Use fallback template based on risk level
```

Example high-risk fallback:

```text
আপনার দেওয়া লক্ষণগুলো ঝুঁকিপূর্ণ হতে পারে। দয়া করে দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রের সঙ্গে যোগাযোগ করুন। MatriSense রোগ নির্ণয় করে না।
```

Example low-risk fallback:

```text
আপনার উত্তর অনুযায়ী এখন জরুরি বিপদ সংকেত পাওয়া যায়নি। অল্প অল্প করে পানি পান করুন, বিশ্রাম নিন, এবং লক্ষণ বাড়লে বা নতুন সতর্ক লক্ষণ দেখা দিলে স্বাস্থ্যকর্মীর সঙ্গে যোগাযোগ করুন। MatriSense রোগ নির্ণয় করে না।
```

## Connected modules

```text
LLM Explanation + Care Guidance
  ↓
Safety Validator
  ↓
Final Result Storage
  ↓
Patient Result Page
```

# 13. Mother result and action module

## Purpose

This is the final result shown to the mother.

It should be more useful than just “go to doctor,” but still safe. With the improved RAG flow, this page should show a **care guidance card** generated from:

```text
rule-engine decision + source-grounded RAG guidance + safety validation
```

## Screen

```text
/mother/result/:sessionId
```

## Result components

```text
- Risk level card
- Urgency label
- Short Bangla explanation
- Reasons
- Recommended next action
- What you can do now
- What to monitor
- When to contact health worker urgently
- Safety disclaimer
- Source/evidence label
- Send/view health worker status
```

## Example: low-risk nausea and headache

```text
Risk Level: LOW
Action: Home care and monitor

Why:
Your answers do not currently show emergency danger signs.

What you can do now:
1. Take small sips of water often.
2. Eat small, light meals instead of one large meal.
3. Rest in a quiet place.
4. Avoid foods or smells that make nausea worse.

Monitor:
- whether headache becomes severe
- whether vision becomes blurry
- whether vomiting increases
- whether you can keep water down

Contact a health worker urgently if:
- headache becomes severe or does not go away
- vision becomes blurry
- face or hands swell
- vomiting continues or you cannot keep water down
- fainting, fever, confusion, breathing difficulty, or convulsion occurs

Safety note:
MatriSense does not diagnose disease. It gives guideline-grounded safety guidance and helps identify urgency.
```

## Example: high-risk headache with blurred vision

```text
Risk Level: HIGH
Action: Urgent clinic visit

Why:
Headache with blurred vision and swelling during pregnancy can be warning signs.

What to do now:
1. Contact your health worker or nearest clinic urgently.
2. Do not wait for the symptoms to go away by themselves.
3. Keep a family member with you.
4. Keep your emergency contact ready.

Safety note:
MatriSense does not diagnose disease. It helps identify urgent warning signs and supports faster referral.
```

## Backend API

```text
GET /api/triage/:sessionId/result
```

## Connected modules

```text
Safety Validator
  ↓
Mother Result Page
  ↓
Health Worker Dashboard
```

# 14. Health worker dashboard module

## Purpose

This is the second half of the MVP. It proves that MatriSense is not only giving patient advice; it is building structured cases for health workers.

The official project outline describes the dashboard as a panel where the community health worker can view patient lists, prioritize high-risk cases, update status, and track follow-ups.

## Screen

```text
/worker/dashboard
```

## Dashboard list columns

```text
- Patient name
- Pregnancy stage
- Main symptoms
- Risk level
- Priority
- Recommended action
- Status
- Submitted time
```

## Status values

```text
NEW
CONTACTED
REFERRED
FOLLOW_UP_NEEDED
RESOLVED
```

## MVP behavior

High-risk cases should appear at the top.

## Backend API

```text
GET /api/worker/cases
```

Optional query:

```text
GET /api/worker/cases?riskLevel=HIGH
```

## Connected modules

```text
Triage Result Storage
  ↓
Health Worker Dashboard
  ↓
Case Detail Module
```

---

# 15. Health worker case detail module

## Purpose

This screen shows the full structured case.

## Screen

```text
/worker/cases/:sessionId
```

## What health worker sees

```text
Patient profile:
- name
- age
- trimester
- expected delivery date
- known risk factors
- emergency contact

Current case:
- original Bangla symptom input
- extracted symptoms
- follow-up questions and answers
- risk level
- priority
- recommended action
- matched rules
- reasons
- evidence/source
- AI-generated summary
```

This is where your “medical record building up from interaction” becomes visible.

## Backend API

```text
GET /api/worker/cases/:sessionId
```

## Connected modules

```text
Health Worker Dashboard
  ↓
Case Detail
  ↓
Referral / Follow-up Notes
```

---

# 16. Referral and follow-up notes module

## Purpose

This module lets the health worker record what they did.

The project outline includes referral and case notes so the health worker can record advice, referral, emergency escalation, and follow-up date.

## Fields

```text
- Action taken
- Referral destination
- Follow-up date
- Note
- Status update
```

## Example

```text
Action taken: Contacted mother
Referral: Upazila Health Complex
Follow-up date: Tomorrow 10 AM
Note: Family advised to take patient to clinic urgently.
Status: Referred
```

## Backend API

```text
POST /api/referral-notes
PUT /api/worker/cases/:sessionId/status
```

## MongoDB collection

```js
ReferralNote {
  _id,
  triageSessionId,
  healthWorkerId,
  actionTaken,
  referredTo,
  followUpDate,
  note,
  createdAt
}
```

## Connected modules

```text
Case Detail
  ↓
Referral Notes
  ↓
Case Status Updated
  ↓
Dashboard Refresh
```

---

# 17. Data storage module

## Purpose

This module stores all important data.

Use MongoDB Atlas for MVP.

## Main collections

```text
Patients
TriageSessions
ReferralNotes
KnowledgeCards
AuditLogs
```

## How they connect

```text
Patient
  └── has many TriageSessions

TriageSession
  └── has one or many ReferralNotes

KnowledgeCards
  └── referenced by evidenceTags

AuditLogs
  └── linked to TriageSession
```

## Minimal schema relationship

```text
Patient._id
  ↓
TriageSession.patientId

TriageSession._id
  ↓
ReferralNote.triageSessionId
```

---

# 18. Audit log module

## Purpose

For MVP, this can be simple but valuable.

It records important events:

```text
- profile created
- symptom submitted
- symptoms extracted
- follow-up answered
- rule engine completed
- result shown
- health worker viewed case
- referral note added
```

## Why this matters

It helps you explain responsible AI and transparency.

## MongoDB example

```js
AuditLog {
  action,
  sessionId,
  patientId,
  metadata,
  createdAt
}
```

## Connected modules

All important backend actions can write to the audit log.

---

# 19. Optional clinic/referral support module

For the preliminary MVP, do not build full maps.

But you can include a simple referral destination field.

Example:

```text
Suggested referral:
- Nearest Upazila Health Complex
- Community Clinic
- Maternal Care Center
```

This keeps care access visible without turning the app into a navigation platform.

The original outline says clinic lookup should be referral support, not full navigation.

## MVP version

Use static clinic data:

```json
[
  {
    "name": "Kaliganj Upazila Health Complex",
    "type": "Government hospital",
    "phone": "01XXXXXXXXX"
  }
]
```

## Connected modules

```text
High-risk decision
  ↓
Suggested referral destination
  ↓
Health worker note
```

---

# 20. Full MVP module interconnection

Here is the complete system flow:

```text
[Role Entry]
      ↓
[Mother Profile Module]
      ↓
[Bangla Symptom Input Module]
      ↓
[AI Symptom Extraction Module]
      ↓
[Human Confirmation Module]
      ↓
[Follow-up Question Module]
      ↓
[Triage Session / Case State Manager]
      ↓
[json-rules-engine Triage Module]
      ↓
[Decision Builder]
      ↓
[Rule-aware RAG / Care Guidance Module]
      ↓
[LLM Explanation + Care Guidance Module]
      ↓
[Safety Validator]
      ↓
[Mother Result Page]
      ↓
[Health Worker Dashboard]
      ↓
[Case Detail]
      ↓
[Referral / Follow-up Notes]
      ↓
[Status Update + Audit Log]
```

This gives you a clean end-to-end workflow.

---

# 21. Backend API summary

## Patient APIs

```text
POST /api/patients
GET /api/patients/:id
PUT /api/patients/:id
```

## Triage APIs

```text
POST /api/triage/start
POST /api/triage/:sessionId/confirm
GET /api/triage/:sessionId/follow-up
POST /api/triage/:sessionId/answers
POST /api/triage/:sessionId/run
GET /api/triage/:sessionId/result
```

## Health worker APIs

```text
GET /api/worker/cases
GET /api/worker/cases/:sessionId
PUT /api/worker/cases/:sessionId/status
```

## Referral APIs

```text
POST /api/referral-notes
GET /api/referral-notes/:sessionId
```

## RAG / care guidance APIs

```text
GET /api/evidence/:tag
POST /api/rag/retrieve-guidance
GET /api/rag/knowledge-cards
```

For the MVP, `POST /api/rag/retrieve-guidance` can receive the rule-engine decision package and return source-grounded self-care steps, monitoring points, escalation triggers, and evidence labels.

---

# 22. Frontend page summary

```text
/                       Landing page
/select-role             Role selection
/mother/profile          Mother profile form
/mother/symptoms         Bangla symptom input
/mother/confirm          Symptom confirmation
/mother/follow-up        Follow-up questions
/mother/result/:id       Triage result
/worker/dashboard        Health worker case list
/worker/cases/:id        Case details
/worker/cases/:id/note   Referral/follow-up note
```

---

# 23. What each team member can build

## Student 1: Frontend mother flow

```text
- role selection
- mother profile form
- symptom input
- confirmation screen
- follow-up screen
- result page
```

## Student 2: Backend + database

```text
- Express server
- MongoDB schemas
- patient APIs
- triage session APIs
- health worker APIs
- referral note APIs
```

## Student 3: AI + rule engine + dashboard logic

```text
- LLM symptom extraction prompt
- json-rules-engine rules
- decision builder
- rule-aware RAG knowledge cards
- evidence retriever and care guidance assembler
- LLM explanation + care guidance prompt
- safety validator with RAG consistency checks
- health worker dashboard data structure
```

This division is realistic for 8–9 days.

---

# 24. Absolute minimum demo version

If time gets tight, build only these:

```text
1. Mother profile form
2. Bangla symptom input
3. LLM extraction or mock extraction
4. Confirmation screen
5. json-rules-engine decision
6. Rule-aware RAG care guidance retrieval
7. Bangla result page with step-by-step safe guidance
8. Health worker dashboard
9. Case detail + referral note
```

Do not build:

```text
- full login
- voice input
- maps
- SMS
- analytics charts
- real-time notifications
- full production-grade vector database or full GraphRAG
```

---

# 25. Best way to explain the MVP

You can explain the whole system like this:

> MatriSense is not just a chatbot. It is a connected maternal triage workflow. The mother enters symptoms in Bangla, the AI extracts structured symptoms, the mother confirms them, the rule engine checks danger signs and personal risk factors, and the system produces a safe urgency decision. A rule-aware RAG layer retrieves source-grounded care steps, monitoring points, and escalation triggers. That result is explained in Bangla and sent to a health worker dashboard, where the health worker sees the full case record, matched rules, follow-up answers, and can add referral notes. This creates a bridge between rural mothers and health workers while keeping the final medical decision human-led.

That is the best mental model for your MVP.