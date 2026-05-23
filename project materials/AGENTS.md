# MatriSense Agent Instructions

## Project identity

MatriSense is a Bangla-first maternal health triage and referral support system for rural Bangladesh.

It is not a diagnosis chatbot. It is a guided triage workflow:

Mother profile
→ Bangla symptom input
→ AI symptom extraction
→ symptom confirmation
→ follow-up questions
→ structured case state
→ rule-based triage engine
→ rule-aware RAG care guidance
→ Bangla explanation
→ safety validation
→ mother result
→ health worker dashboard
→ referral/follow-up note

## Core safety rule

The LLM must not decide the final medical urgency.

Use this responsibility split:

- LLM: extract Bangla symptoms, normalize text, generate simple Bangla explanations.
- Rule engine: decide risk level, recommended action, matched rules, and allowed guidance type.
- RAG: retrieve only approved source-grounded care guidance.
- Safety validator: block unsafe patient-facing output.
- Health worker: final human-in-the-loop review and follow-up.

## Medical safety constraints

Do not create diagnosis logic.

Do not diagnose diseases such as:
- pre-eclampsia
- eclampsia
- placenta previa
- ectopic pregnancy
- sepsis
- malaria
- pneumonia

These may appear as source notes for health-worker context only, but should not be shown as a patient diagnosis.

Do not prescribe medicine.

Do not include:
- medicine names for patient self-use
- dosage
- treatment plans
- home remedies not supported by the approved guidance cards
- false reassurance such as “nothing to worry about”
- any advice that delays urgent care for danger signs

## Rule engine principles

Use json-rules-engine for the MVP rule layer.

Every rule must include:

- name
- priority
- conditions
- event.type
- event.params.riskLevel
- event.params.priority
- event.params.recommendedAction
- event.params.reason
- event.params.displayReasonBn
- event.params.evidenceTag
- event.params.sourceRef

Allowed risk levels:

- LOW
- MEDIUM
- HIGH
- UNKNOWN

Allowed actions:

- REST_AND_MONITOR
- HOME_CARE_AND_MONITOR
- CONTACT_HEALTH_WORKER
- VISIT_CLINIC
- URGENT_CLINIC_VISIT
- URGENT_REFERRAL
- CONTACT_HEALTH_WORKER_IMMEDIATELY

Danger signs must be conservative.

If any HIGH_RISK rule fires, the final decision must remain HIGH.

Modifiers may increase concern, but must never reduce risk.

The LLM must never downgrade the rule-engine risk level.

## Approved MVP danger-sign focus

Prioritize rules for:

- vaginal bleeding
- convulsion or fits
- unconsciousness or fainting
- severe abdominal pain
- severe headache with blurred vision
- fever with severe weakness
- very difficult breathing
- reduced fetal movement in late pregnancy
- repeated vomiting or inability to keep water down
- severe pallor
- swelling with headache or visual symptoms

## Follow-up question principles

Ask only the missing questions needed to improve triage.

Limit MVP follow-up questions to 2–3 per session.

Examples:

For headache:
- চোখে ঝাপসা দেখছেন কি?
- হাত, পা বা মুখ ফুলে গেছে কি?
- মাথা ব্যথা কি খুব তীব্র?

For abdominal pain:
- পেটব্যথা কি তীব্র?
- রক্তপাত হচ্ছে কি?

For vomiting:
- বারবার বমি হচ্ছে কি?
- পানি রাখতে পারছেন কি?

For fetal movement:
- বাচ্চার নড়াচড়া কি স্বাভাবিকের চেয়ে কম মনে হচ্ছে?
- আপনি কি গর্ভাবস্থার শেষ দিকে আছেন?

## RAG guidance rules

Use rule-aware RAG, not raw free-chat RAG.

The rule engine should output:

- riskLevel
- matchedRules
- symptoms
- evidenceTags
- allowedGuidanceType

The retriever should use this decision package to retrieve approved knowledge cards.

RAG retrieval rules:

- HIGH risk: urgent escalation guidance only.
- MEDIUM risk: contact health worker / clinic guidance plus warning signs.
- LOW risk: self-care, monitoring, and warning signs.
- HIGH risk must never retrieve low-risk self-care-only guidance.
- LOW risk must still include warning signs and escalation triggers.

## Knowledge card requirements

Every knowledge card must include:

- id
- sourceName
- sourceType
- condition
- riskLevelAllowed
- symptoms
- guidanceType
- stepsBn
- monitorBn
- escalationTriggersBn
- doNotSay
- citation
- evidenceTag

Do not create knowledge cards with medicine dosage or diagnosis instructions.

## Safety validator requirements

Before showing output to the mother, validate:

1. Output risk level matches the rule-engine decision.
2. Output does not diagnose disease.
3. Output does not prescribe medicine.
4. Output does not include false reassurance.
5. Output does not downgrade risk.
6. Output uses only retrieved care guidance.
7. HIGH-risk output does not include home-care-first advice.
8. LOW-risk output includes warning signs.
9. Safety disclaimer is present.

Use fallback templates if validation fails.

## Patient-facing Bangla tone

Use simple Bangla.

Avoid complex clinical words.

Use wording like:

- আপনার দেওয়া লক্ষণগুলো ঝুঁকিপূর্ণ হতে পারে।
- দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
- লক্ষণ নিজে নিজে সেরে যাওয়ার জন্য অপেক্ষা করবেন না।
- MatriSense রোগ নির্ণয় করে না। এটি জরুরি ঝুঁকি বুঝতে সাহায্য করে।

Avoid wording like:

- আপনার রোগ হলো...
- নিশ্চিতভাবে...
- চিন্তার কিছু নেই...
- শুধু বাসায় থাকুন...
- এই ওষুধ খান...
- ডোজ...

## Recommended folder structure

/backend
  /ai
    extractorPrompt.js
    explanationPrompt.js
    aiExtractorService.js
    explanationService.js
    promptSchemas.js

  /triage
    /constants
      riskLevels.js
      actionTypes.js
      guidanceTypes.js

    /data
      symptomCodes.js
      banglaSymptomSynonyms.js
      riskFactors.js

    /rules
      highRisk.rules.json
      mediumRisk.rules.json
      modifier.rules.json
      followup.rules.json
      index.js

    /engine
      createEngine.js
      operators.js
      ruleRunner.js

    /decision
      decisionBuilder.js
      allowedGuidanceMapper.js

    /followup
      followUpMap.js
      followUpSelector.js
      answerNormalizer.js

    /tests
      testCases.json
      runRuleTests.js

    /debug
      mockCases.js
      runMockTriage.js

  /rag
    knowledgeCards.json
    evidenceRetriever.js
    careGuidanceAssembler.js

  /safety
    safetyValidator.js
    fallbackTemplates.js

## Development order for agents

Build in this order:

1. symptomCodes.js
2. banglaSymptomSynonyms.js
3. caseState schema
4. highRisk.rules.json
5. mediumRisk.rules.json
6. modifier.rules.json
7. operators.js
8. ruleRunner.js
9. decisionBuilder.js
10. followUpMap.js
11. followUpSelector.js
12. testCases.json
13. knowledgeCards.json
14. evidenceRetriever.js
15. careGuidanceAssembler.js
16. extractorPrompt.js
17. explanationPrompt.js
18. safetyValidator.js
19. mock triage lab route/page

## Source policy

Use only the approved reference summaries inside:

/docs/references/
/docs/rule-source-summaries/
/backend/triage/rule_sources/

If a rule is not clearly supported by the provided sources, mark it as NEEDS_REVIEW instead of inventing it.

## Testing expectations

Generate synthetic tests for:

LOW:
- mild nausea
- fatigue only
- mild headache without danger signs

MEDIUM:
- fever without severe weakness
- repeated vomiting but can still drink
- mild abdominal pain without bleeding
- headache requiring follow-up

HIGH:
- vaginal bleeding
- convulsion
- severe abdominal pain
- headache with blurred vision
- difficulty breathing
- reduced fetal movement in third trimester
- fainting or unconsciousness
- dangerous fever pattern

Every rule must have at least one positive and one negative test case.

## Demo priority

The MVP must show one complete case:

Mother profile
→ Bangla symptom input
→ AI extraction
→ confirmation
→ follow-up
→ rule triage
→ RAG guidance
→ Bangla result
→ health worker dashboard
→ referral note

Do not overbuild features that do not support this flow.
