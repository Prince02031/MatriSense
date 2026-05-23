# MatriSense Rule Source Index for Agents

This file tells Codex/Cursor/other coding agents how to use the source summaries safely.

---

## 1. Source priority for rule creation

Use sources in this order:

```text
1. WHO PCPNC Quick Check / Rapid Assessment
2. WHO / NCBI Danger Signs in Pregnancy
3. CDC HEAR HER Urgent Maternal Warning Signs
4. DGHS Bangladesh ANC Job Aid after manual extraction
5. Bangladesh MNH Service Accreditation Manual after manual extraction
6. Bangladesh National Strategy for system context only
7. WHO ANC Digital Adaptation Kit for architecture and data structure only
```

---

## 2. What the agent may create

The agent may create:

```text
symptom code list
Bangla synonym map
follow-up questions
json-rules-engine candidate rules
RAG knowledge-card candidates
synthetic test cases
safety validator patterns
health-worker dashboard evidence labels
```

---

## 3. What the agent must not create

The agent must not create:

```text
diagnosis logic
medicine dosage
treatment plan
clinical procedure instructions
rules unsupported by sources
false reassurance
automatic risk downgrade
```

---

## 4. MVP HIGH-risk symptom set

Start with these:

```text
vaginal_bleeding
convulsion
fainting_or_unconscious
severe_abdominal_pain
headache_with_blurred_vision
severe_difficulty_breathing
fever_with_severe_weakness
dangerous_fever
reduced_fetal_movement_late_pregnancy
chest_pain_or_fast_heartbeat
severe_vomiting_cannot_keep_water
self_harm_thoughts
```

---

## 5. MVP MEDIUM-risk symptom set

Start with these:

```text
fever_without_high_risk_features
abdominal_pain_not_severe_no_bleeding
headache_needs_followup
dizziness_without_fainting
swelling_without_headache_or_vision
vomiting_but_can_keep_water
severe_pallor_or_anemia_history
long_gap_since_checkup_modifier
known_hypertension_modifier
```

---

## 6. Rule schema requirement

Every rule must include:

```json
{
  "name": "string",
  "priority": 0,
  "conditions": {},
  "event": {
    "type": "HIGH_RISK | MEDIUM_RISK | RISK_MODIFIER | NEEDS_FOLLOW_UP",
    "params": {
      "riskLevel": "HIGH | MEDIUM | LOW | UNKNOWN",
      "recommendedAction": "string",
      "reason": "string",
      "displayReasonBn": "string",
      "evidenceTag": "string",
      "sourceRef": "string"
    }
  }
}
```

---

## 7. Mandatory safety rule

If any HIGH-risk event fires:

```text
Final risk = HIGH
LLM cannot change it
RAG must retrieve only urgent escalation / warning cards
Mother output must not start with home care
Worker dashboard must show matched rule and evidence tag
```

---

## 8. Human review note

All generated medical rules are **candidate rules**. They must be checked manually before demo use.
