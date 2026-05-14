# WHO PCPNC — Quick Check, Rapid Assessment, Emergency and Priority Signs  
**Source:** *Pregnancy, Childbirth, Postpartum and Newborn Care: A guide for essential practice, 3rd edition*  
**Publisher:** WHO, UNFPA, UNICEF, World Bank, 2015  
**Primary use in MatriSense:** Rule-engine structure, urgency levels, emergency vs priority classification, referral workflow, health-worker dashboard reasoning.  
**Download / reference:**  
- WHO publication page: https://www.who.int/publications/i/item/9789241549356  
- WHO PDF: https://iris.who.int/bitstream/handle/10665/249580/9789241549356-eng.pdf  
- NCBI version: https://www.ncbi.nlm.nih.gov/books/NBK326678/  

---

## 1. What this source is about

PCPNC is a clinical decision-making guide for skilled attendants at the primary level of care. It covers pregnancy, childbirth, postpartum, post-abortion care, and newborn care. For MatriSense, the most important part is the **Quick Check / Rapid Assessment and Management** section.

This source is useful because it already works like a triage flow:

```text
Ask / check record
→ look / listen / feel
→ identify signs
→ classify
→ treat / advise / refer
```

MatriSense can copy this structure digitally, but not the clinical treatment details.

---

## 2. Severity model for MatriSense

PCPNC uses a severity-style classification approach. For MatriSense, convert it into:

| PCPNC idea | MatriSense risk level | MatriSense action |
|---|---|---|
| Emergency signs | HIGH | urgent clinic/referral |
| Priority signs | MEDIUM or HIGH depending on combination | immediate health-worker review / clinic check |
| No emergency or priority signs | LOW | self-care + warning signs + monitoring |

Important: MatriSense should not show medicine, IV fluids, or clinical procedure instructions to mothers. Those are for trained health workers only.

---

## 3. Emergency signs from Quick Check

In the quick check, the woman is treated as an emergency if she is unconscious, convulsing, bleeding, in severe abdominal pain, looking very ill, has headache with visual disturbance, severe difficulty breathing, fever, or severe vomiting.

For MVP rule engine:

| MatriSense code | Trigger | Risk |
|---|---|---|
| `unconscious` / `fainting` | unconscious or not answering | HIGH |
| `convulsion` | convulsing now or recently | HIGH |
| `vaginal_bleeding` | bleeding during pregnancy/postpartum context | HIGH |
| `severe_abdominal_pain` | severe abdominal pain or very ill appearance | HIGH |
| `headache` + `visual_disturbance` | headache with visual disturbance | HIGH |
| `severe_difficulty_breathing` | severe breathing difficulty | HIGH |
| `fever` with serious signs | fever plus weakness/fast breathing/lethargy etc. | HIGH |
| `severe_vomiting` | severe vomiting, especially unable to keep fluids | MEDIUM to HIGH |

---

## 4. Vaginal bleeding rules

PCPNC is very strong on bleeding.

### Rule implications

- **Late pregnancy:** any bleeding is dangerous.
- **During labour:** significant bleeding before delivery is dangerous.
- **Postpartum:** heavy bleeding, constant trickling, large amount, or ongoing bleeding after delivery is dangerous.
- For MatriSense MVP, bleeding during pregnancy should be **HIGH** even if amount is unknown.

### MVP rule

```json
{
  "name": "vaginal_bleeding_high_risk",
  "conditions": {
    "all": [
      { "fact": "symptoms", "operator": "contains", "value": "vaginal_bleeding" }
    ]
  },
  "event": {
    "type": "HIGH_RISK",
    "params": {
      "riskLevel": "HIGH",
      "recommendedAction": "URGENT_REFERRAL",
      "evidenceTag": "WHO_PCPNC_VAGINAL_BLEEDING"
    }
  }
}
```

### Bangla result wording

```text
গর্ভাবস্থায় রক্তপাত হলে দেরি না করে স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
```

Do not ask many follow-up questions before escalation.

---

## 5. Convulsions or unconsciousness rules

PCPNC treats convulsions or unconsciousness as emergency signs requiring urgent referral after emergency management by a skilled provider.

### MVP rule

```text
convulsion OR unconsciousness → HIGH
```

### Patient-facing language

```text
খিঁচুনি, অজ্ঞান হওয়া বা জ্ঞান হারানো গর্ভাবস্থায় জরুরি বিপদ সংকেত হতে পারে। দ্রুত স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
```

Do not mention eclampsia in the mother-facing explanation unless a clinician is reviewing the case.

---

## 6. Severe abdominal pain rules

Severe abdominal pain is listed as an emergency sign.

### MVP rule

```text
severe_abdominal_pain → HIGH
abdominal_pain + vaginal_bleeding → HIGH
abdominal_pain mild/unknown without bleeding → MEDIUM + ask follow-up
```

### Follow-up questions

```text
ব্যথা কি খুব তীব্র?
রক্তপাত হচ্ছে কি?
ব্যথা কি বাড়ছে বা কমছে না?
```

---

## 7. Dangerous fever rules

PCPNC defines dangerous fever as fever above 38°C plus serious signs such as very fast breathing, stiff neck, lethargy, or being too weak/not able to stand.

### MVP rule

```text
fever + severe_weakness OR fever + very_fast_breathing OR fever + lethargy → HIGH
fever alone → MEDIUM
```

### Follow-up questions

```text
জ্বরের সঙ্গে খুব দুর্বল লাগছে কি?
শ্বাস দ্রুত হচ্ছে বা শ্বাস নিতে কষ্ট হচ্ছে কি?
দাঁড়াতে পারছেন না বা খুব অবসন্ন লাগছে কি?
```

---

## 8. Priority signs

PCPNC separates “priority signs” from immediate emergency signs. These include severe pallor, epigastric/abdominal pain, severe headache, blurred vision, fever above 38°C, and breathing difficulty.

For MatriSense:

| Priority sign | MVP risk |
|---|---|
| `severe_pallor` | MEDIUM; HIGH if severe weakness/fainting |
| `epigastric_pain` / `abdominal_pain` | MEDIUM; HIGH if severe/bleeding |
| `severe_headache` | MEDIUM; HIGH if blurred vision/swelling/hypertension |
| `blurred_vision` | MEDIUM alone; HIGH with headache |
| `fever` | MEDIUM; HIGH with danger signs |
| `breathing_difficulty` | MEDIUM; HIGH if severe |

---

## 9. Referral and health-worker dashboard implications

PCPNC repeatedly links emergencies to referral and records. For MatriSense, this supports:

```text
matchedRules
riskLevel
recommendedAction
reason
evidenceTag
healthWorkerSummary
referralNote
```

The health worker dashboard should show:

- Emergency sign detected.
- Why the system classified the case as HIGH/MEDIUM.
- What information is missing.
- Whether urgent referral/contact was recommended.
- Source tag, e.g. `WHO_PCPNC_QUICK_CHECK`.

---

## 10. RAG cards to create

```text
WHO_PCPNC_QUICK_CHECK_GENERAL
WHO_PCPNC_VAGINAL_BLEEDING
WHO_PCPNC_CONVULSION_UNCONSCIOUS
WHO_PCPNC_SEVERE_ABDOMINAL_PAIN
WHO_PCPNC_DANGEROUS_FEVER
WHO_PCPNC_PRIORITY_SIGNS
WHO_PCPNC_REFERRAL_WORKFLOW
```

---

## 11. What not to include in MVP patient output

PCPNC contains many clinical treatment details such as IV lines, drugs, magnesium sulphate, oxytocin, antibiotics, and emergency procedures. These should **not** be shown as mother-facing instructions.

Allowed mother-facing instruction:

```text
দ্রুত স্বাস্থ্যকর্মী বা স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
```

Not allowed mother-facing instruction:

```text
এই ওষুধ নিন।
IV line দিন।
ডোজ...
```
