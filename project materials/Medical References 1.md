# 1. Real-world references for medical rule-based systems

## A. WHO Digital Adaptation Kit for Antenatal Care

This is one of your strongest references. WHO’s Antenatal Care DAK is made exactly for converting health recommendations into digital system requirements. It includes workflows, core data elements, decision support, programme indicators, and functional/non-functional requirements. This supports your argument that MatriSense is following a structured digital-health decision-support approach, not just “asking AI.”

Use it for:

```
- case-state design- ANC workflow logic- decision-support framing- health-worker process- future final-version expansion
```

## B. WHO / NCBI pregnancy danger-sign guidance

The WHO-linked NCBI maternal counselling guide lists danger signs requiring immediate care, including vaginal bleeding, convulsions/fits, severe headache with blurred vision, fever with severe weakness, severe abdominal pain, and fast/difficult breathing. It also separately mentions fever, abdominal pain, feeling ill, and swelling as signs that should prompt going to a health centre soon.

Use it for your first HIGH and MEDIUM rules.

## C. CDC HEAR HER urgent maternal warning signs

CDC’s urgent maternal warning signs are very useful for a more modern symptom list. It includes warning signs such as headache that worsens or comes with blurred vision/dizziness, dizziness or fainting, vision changes, fever, extreme swelling of hands/face, trouble breathing, severe nausea/vomiting, severe belly pain, reduced baby movement, and vaginal bleeding/fluid leaking.

Use it for:

```
- symptom definitions- follow-up questions- escalation wording- RAG warning-sign cards
```

## D. DGHS / Bangladesh MNCH eToolkit

DGHS eToolkit has an antenatal care section with Bangladesh MNCH materials such as pregnancy counselling job aids, posters, flashcards, and maternal/newborn health resources. This is useful for local Bangladesh alignment and Bangla terminology.

Use it for:

```
- Bangla wording- local counselling terms- Bangladesh-context evidence labels- future DGHS-aligned knowledge cards
```

## E. Bangladesh MNH service accreditation / clinical protocol resources

Bangladesh DGHS-linked maternal and newborn health service accreditation resources mention standardized evidence-based clinical guidelines for maternal and newborn health providers across Bangladesh. This is useful as a local system-level reference, although you should manually verify exact rules before converting any clinical protocol into app logic.

Use it for:

```
- local credibility- health-worker dashboard wording- referral/facility workflow
```

---

# 2. Open-source clinical rule-engine references

## A. OpenCDS

OpenCDS is an open-source, standards-based clinical decision support project. Its general architecture is highly relevant: transform source health data into a standard data structure, evaluate it using rules based on medical knowledge, and return patient-specific recommendations.

This is very close to MatriSense:

```
Bangla input/profile→ structured case state→ rule evaluation→ recommendation/action
```

## B. OpenMRS Drools Module

OpenMRS has a Drools-based clinical decision-support module. Its README says it allows developers to define and evaluate rules against OpenMRS data for patient flags, alerts, notifications, task lists, rule-driven forms, and recommendations.

Use this as proof that rule engines are normal in healthcare systems.

## C. HL7 CQL / CQL Execution

HL7 Clinical Quality Language is used for computable clinical knowledge. The JavaScript `cql-execution` framework executes CQL artifacts expressed as JSON ELM.

You probably should **not** implement CQL for this MVP, but it is a strong final-version reference.

## D. CDS Hooks

CDS Hooks is a vendor-agnostic standard for integrating remote clinical decision support with electronic health record workflows using JSON over HTTPS.

For MatriSense final version, you can say:

```
Our future health-worker integration can expose MatriSense triage results as CDS-style cards.
```

## E. json-rules-engine

For your MVP, `json-rules-engine` is the best practical choice because it is lightweight, JavaScript-friendly, uses readable JSON rules, supports nested `ALL`/`ANY` logic, priority levels, and events, and can run in Node.js.

Use this for the actual hackathon build.