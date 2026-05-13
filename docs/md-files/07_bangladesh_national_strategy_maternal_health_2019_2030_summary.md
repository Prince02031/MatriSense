# Bangladesh National Strategy for Maternal Health 2019–2030  
**Source:** *Bangladesh National Strategy for Maternal Health 2019–2030*  
**Primary use in MatriSense:** Bangladesh problem framing, local impact justification, referral-system need, emergency obstetric care importance, quality-of-care roadmap.  
**Download / reference:**  
- PDF: https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-dgnm/2024/12/cc5c086431e24019af7c3e2f840f0db1.pdf  
- DGHS publication page: https://old.dghs.gov.bd/index.php/en/publications/126-guideline  

---

## 1. What this source is about

This is a national strategy document for improving maternal health in Bangladesh. It is not mainly a symptom-level rulebook. Its value for MatriSense is that it explains why Bangladesh needs stronger maternal health systems, better quality care, improved referral systems, more skilled attendance, and better access to emergency obstetric and neonatal care.

This document is best for:

```text
problem statement
Bangladesh context
impact justification
scalability roadmap
health-system alignment
submission/pitch narrative
```

---

## 2. Key national context for MatriSense

The strategy highlights that Bangladesh has made progress in reducing maternal mortality, but preventable maternal and neonatal deaths remain a major concern. It emphasizes improving:

```text
skilled birth attendance
antenatal care coverage
postnatal care
emergency obstetric and neonatal care
referral systems
quality of services
sexual and reproductive health services
equity and access for poorer families
```

For MatriSense, this supports the problem:

> Rural pregnant mothers may delay care because danger signs are missed, symptoms are not communicated clearly, and frontline workers do not receive structured case information early enough.

---

## 3. Targets and impact framing

Use these ideas in the pitch and `/docs` page:

```text
Bangladesh aims to reduce maternal mortality and neonatal mortality by 2030.
Improving emergency obstetric and neonatal care and referral systems is part of the national direction.
A digital triage and case-routing tool can support earlier detection, faster communication, and better prioritization.
```

Do not claim that MatriSense will directly reduce mortality unless you have evidence. Say:

```text
MatriSense is designed to support earlier risk detection and faster health-worker follow-up.
```

---

## 4. How this source supports MatriSense features

| Strategy need | MatriSense feature |
|---|---|
| Better ANC and maternal health service access | Mother profile + pregnancy timeline |
| Emergency obstetric care and referral systems | High-risk detection + referral note |
| Quality of care | Health-worker dashboard + audit trail |
| Equity and rural access | Bangla-first, low-bandwidth UI |
| Standardized care | Rule-based triage + source-grounded RAG |
| Health-system strengthening | Structured case records and follow-up status |

---

## 5. High-risk relevance

This source supports why high-risk cases should not remain only on the mother’s screen. In MatriSense:

```text
HIGH risk → urgent patient guidance + health worker dashboard alert + referral/follow-up record
```

High-risk cases should be prioritized because the national strategy emphasizes emergency care, referral systems, and quality service delivery.

Recommended HIGH-risk operational behavior:

```text
riskLevel = HIGH
priority = URGENT
show red risk card
recommend health worker/clinic contact
create health-worker dashboard case
show matched rules
allow referral note
track follow-up status
```

---

## 6. RAG and knowledge-card implications

This source should not be used for symptom-specific advice. Use it for system-level cards:

```text
BD_STRATEGY_MATERNAL_HEALTH_CONTEXT
BD_STRATEGY_REFERRAL_SYSTEM_IMPORTANCE
BD_STRATEGY_QUALITY_OF_CARE
BD_STRATEGY_RURAL_ACCESS_EQUITY
```

Example:

```json
{
  "id": "bd_strategy_referral_system_importance",
  "sourceName": "Bangladesh National Strategy for Maternal Health 2019-2030",
  "sourceType": "national_strategy",
  "guidanceType": "SYSTEM_CONTEXT",
  "riskLevelAllowed": ["HIGH", "MEDIUM"],
  "stepsBn": [
    "উচ্চ ঝুঁকির ক্ষেত্রে দ্রুত স্বাস্থ্যকর্মী বা স্বাস্থ্যকেন্দ্রের সঙ্গে যোগাযোগের ব্যবস্থা করা জরুরি।",
    "রেফারেল ও ফলো-আপ নোট সংরক্ষণ করলে পরবর্তী সেবা সমন্বয় সহজ হয়।"
  ],
  "evidenceTag": "BD_MATERNAL_STRATEGY_REFERRAL"
}
```

---

## 7. Submission and demo wording

Use this wording:

```text
MatriSense aligns with Bangladesh’s maternal health priorities by improving early risk detection, structured symptom reporting, referral support, and health-worker follow-up for rural pregnant mothers.
```

And:

```text
For the prototype, we use synthetic data only. The system is designed to support health workers, not replace clinical judgement.
```

---

## 8. Safety constraints

- Do not use this strategy document to create symptom-specific medical rules.
- Use it to justify system design and local relevance.
- Do not overclaim impact.
- Keep final medical authority with trained health workers and clinicians.

---

## 9. Best use in code and docs

```text
/docs/problem-context/bangladesh-maternal-health-context.md
/docs/references/bangladesh-national-strategy-summary.md
/frontend/src/pages/DocsPage.jsx
/backend/rag/systemContextCards.json
```
