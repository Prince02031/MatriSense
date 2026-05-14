# WHO Digital Adaptation Kit for Antenatal Care  
**Source:** *Digital Adaptation Kit for Antenatal Care: Operational requirements for implementing WHO recommendations in digital systems*  
**Publisher:** World Health Organization, 2021  
**Primary use in MatriSense:** Digital health architecture, decision-support design, structured data elements, workflows, indicators, and explainable implementation pattern.  
**Download / reference:**  
- WHO publication page: https://www.who.int/publications/i/item/9789240020306  
- WHO IRIS PDF: https://iris.who.int/bitstream/handle/10665/339745/9789240020306-eng.pdf  

---

## 1. What this source is about

The WHO Antenatal Care Digital Adaptation Kit (ANC DAK) is not a simple clinical article. It is a software-neutral implementation guide for converting antenatal-care recommendations into digital systems.

It is part of WHO SMART Guidelines. It includes structured content such as:

```text
linked health interventions and recommendations
personas
user scenarios
business processes and workflows
core data elements mapped to standard terminology
decision support
programme indicators
functional and non-functional requirements
```

For MatriSense, this is one of the strongest architecture references. It justifies why the app should have structured data, rule logic, workflow stages, evidence links, and decision-support outputs instead of a free-form chatbot.

---

## 2. How this applies to MatriSense

MatriSense should follow the DAK style:

```text
User scenario: pregnant mother reports symptoms in Bangla
Workflow: profile → symptoms → follow-up → triage → result → health-worker review
Core data: trimester, gestational week, risk factors, symptoms, severity, duration
Decision support: danger-sign rules and escalation logic
Output: risk level, next action, evidence tag, follow-up/referral note
```

This supports the MatriSense claim:

> The system is not a chatbot. It is a structured maternal health decision-support workflow with AI only at controlled points.

---

## 3. What to extract for the project

### Core data elements

Use this source to justify making a structured `caseState`.

Recommended MatriSense fields:

```json
{
  "patientId": "string",
  "profile": {
    "age": "number",
    "trimester": "first | second | third | unknown",
    "gestationalWeek": "number | null",
    "expectedDeliveryDate": "date | null",
    "knownRiskFactors": ["hypertension", "diabetes", "anemia"],
    "lastCheckupDaysAgo": "number | null"
  },
  "symptoms": ["string"],
  "severity": {},
  "duration": {},
  "followUpAnswers": {},
  "dangerSignsChecked": [],
  "decision": {},
  "evidenceTags": []
}
```

### Workflow elements

Use this source to justify the vertical slice:

```text
Mother profile
→ Bangla symptom input
→ AI extraction
→ confirmation
→ follow-up questions
→ rule engine
→ RAG guidance
→ Bangla result
→ health-worker dashboard
→ referral note
```

---

## 4. Decision-support implications

The ANC DAK supports decision-support logic but does not mean MatriSense should automate full clinical care.

For MVP:

```text
Decision-support scope = urgency classification + safe next action
Not in scope = diagnosis, medicine, treatment plan
```

MatriSense decision package should include:

```json
{
  "riskLevel": "LOW | MEDIUM | HIGH | UNKNOWN",
  "priority": "NORMAL | ATTENTION_NEEDED | URGENT",
  "recommendedAction": "HOME_CARE_AND_MONITOR | CONTACT_HEALTH_WORKER | URGENT_CLINIC_VISIT",
  "matchedRules": [],
  "reasons": [],
  "evidenceTags": [],
  "allowedGuidanceType": "SELF_CARE | CONTACT_WORKER | URGENT_ESCALATION",
  "llmConstraints": []
}
```

---

## 5. High-risk relevance

The ANC DAK itself is not the best source for listing high-risk symptoms. Use WHO PCPNC, WHO danger-sign chapter, CDC HEAR HER, and DGHS local sources for actual danger-sign content.

But the ANC DAK is useful for explaining **how** those high-risk rules should be represented digitally:

```text
source recommendation
→ data element
→ condition
→ decision-support rule
→ output action
→ evidence tag
→ dashboard display
```

Example:

```text
Source: WHO/CDC danger sign
Data element: symptoms contains vaginal_bleeding
Rule: vaginal_bleeding_high_risk
Action: urgent referral/clinic contact
Evidence tag: WHO_DANGER_SIGN_BLEEDING
Dashboard: matched rule + reason + source label
```

---

## 6. RAG implications

The ANC DAK supports structured knowledge and data mapping. For MatriSense RAG:

```text
Do not retrieve randomly from raw PDFs.
Create curated knowledge cards with metadata.
Filter by riskLevelAllowed, symptoms, guidanceType, and evidenceTag.
```

Recommended card metadata:

```json
{
  "id": "string",
  "sourceName": "string",
  "sourceType": "guideline | danger_sign | counselling | local_context",
  "symptoms": [],
  "riskLevelAllowed": [],
  "guidanceType": "SELF_CARE | WARNING_SIGNS | CONTACT_WORKER | URGENT_ESCALATION",
  "stepsBn": [],
  "escalationTriggersBn": [],
  "doNotSay": [],
  "sourceRef": "string",
  "evidenceTag": "string"
}
```

---

## 7. How to describe this in the pitch

```text
We used WHO Digital Adaptation Kit principles to convert maternal health guidance into structured digital workflows. MatriSense separates the user interface, data layer, rule-based decision support, RAG knowledge layer, and LLM explanation layer. This makes the system auditable and safer than a free-form medical chatbot.
```

---

## 8. Safety constraints

- Do not let the LLM directly decide final risk.
- Always keep decision-support logic traceable to structured rules.
- Show matched rules and evidence tags to health workers.
- Keep patient-facing output limited to safe next steps.
- Treat this as decision support, not clinical authority.

---

## 9. Recommended files in the codebase

```text
/backend/triage/caseState.schema.js
/backend/triage/rules/*.json
/backend/triage/decisionBuilder.js
/backend/rag/knowledgeCards.json
/backend/rag/evidenceRetriever.js
/backend/safety/safetyValidator.js
/docs/references/who-anc-dak-summary.md
```
