# WHO / NCBI — Danger Signs in Pregnancy  
**Source:** *Counselling for Maternal and Newborn Health Care: A Handbook for Building Skills*  
**Publisher:** World Health Organization, 2013  
**Primary use in MatriSense:** Patient-facing danger-sign education, follow-up question design, emergency planning, and safe Bangla explanation style.  
**Download / reference:**  
- WHO publication page: https://www.who.int/publications/i/item/9789241547628  
- NCBI chapter: https://www.ncbi.nlm.nih.gov/books/NBK304178/  
- WHO PDF: https://iris.who.int/bitstream/handle/10665/44016/9789241547628_eng.pdf  

---

## 1. What this source is about

This WHO handbook is not mainly a rule-engine document. It is a counselling and communication handbook for health workers. Its value for MatriSense is that it explains how health workers should discuss maternal and newborn health issues with women, husbands/partners, families, and communities.

The danger-sign chapter is especially useful because MatriSense needs to tell mothers **when to seek care quickly** without frightening them, diagnosing them, or giving treatment instructions beyond safe next steps.

The handbook also stresses that danger-sign discussion should be connected with a **concrete emergency plan**. This is very important for MatriSense because the app should not only say “high risk”; it should help the mother and health worker think about where to go, who to contact, and how to act quickly.

---

## 2. Main danger-sign meaning for MatriSense

For MatriSense, this source supports a conservative rule:

> Any serious pregnancy danger sign should trigger urgent health-worker/clinic contact and should never be downgraded by the LLM.

Important danger signs to extract into the MVP rule engine:

| MatriSense symptom code | Common wording | MVP risk interpretation |
|---|---|---|
| `vaginal_bleeding` | vaginal bleeding / bleeding during pregnancy | HIGH |
| `convulsion` | convulsions / fits | HIGH |
| `severe_headache` + `blurred_vision` | severe headache with blurred vision | HIGH |
| `fever` + `severe_weakness` | fever with severe weakness | HIGH |
| `severe_abdominal_pain` | severe abdominal pain | HIGH |
| `difficulty_breathing` | fast or difficult breathing | HIGH |
| `fever` alone | fever without severe weakness | MEDIUM unless other danger signs exist |
| `abdominal_pain` not severe | abdominal pain without bleeding/severity | MEDIUM |
| `feels_ill` / `severe_weakness` | woman feels very ill or too weak | MEDIUM to HIGH depending on severity |

---

## 3. High-risk rule guidance

### HIGH risk should be assigned when:

- The mother reports vaginal bleeding during pregnancy.
- The mother reports convulsions/fits or loss of consciousness.
- Headache is combined with blurred vision, vision change, or severe worsening.
- Abdominal pain is severe, persistent, or not like normal mild discomfort.
- Fever is combined with severe weakness, inability to stand, confusion, fast breathing, or other serious signs.
- Breathing is fast, difficult, or the mother feels unable to breathe normally.

### HIGH-risk action label

Use one of these actions:

```text
URGENT_CLINIC_VISIT
URGENT_REFERRAL
CONTACT_HEALTH_WORKER_IMMEDIATELY
```

### HIGH-risk patient wording

Use simple Bangla such as:

```text
আপনার দেওয়া লক্ষণগুলো গর্ভাবস্থায় ঝুঁকির লক্ষণ হতে পারে। দেরি না করে স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
```

Avoid diagnostic wording such as:

```text
আপনার প্রি-এক্ল্যাম্পসিয়া হয়েছে।
আপনার গর্ভপাত হচ্ছে।
```

---

## 4. Follow-up question implications

This source supports asking follow-up questions when a symptom may become dangerous depending on context.

### Headache follow-up

If the mother reports headache, ask:

```text
চোখে ঝাপসা দেখছেন কি?
মাথাব্যথা কি খুব তীব্র বা বাড়ছে?
হাত, মুখ বা পা ফুলে গেছে কি?
```

### Abdominal pain follow-up

If the mother reports abdominal pain, ask:

```text
ব্যথা কি তীব্র?
রক্তপাত হচ্ছে কি?
ব্যথা কি কমছে না বা বাড়ছে?
```

### Fever follow-up

If the mother reports fever, ask:

```text
খুব দুর্বল লাগছে কি?
শ্বাস নিতে কষ্ট হচ্ছে কি?
অজ্ঞান লাগছে বা দাঁড়াতে পারছেন না কি?
```

### Bleeding follow-up

Bleeding should not be delayed by too many questions. If vaginal bleeding is reported, classify as HIGH and show urgent escalation. Only ask extra details for the health-worker summary, not to decide whether it is serious.

---

## 5. RAG knowledge-card implications

Create knowledge cards such as:

```json
{
  "id": "who_pregnancy_danger_signs_general",
  "sourceName": "WHO Counselling for Maternal and Newborn Health Care",
  "sourceType": "danger_sign_guidance",
  "riskLevelAllowed": ["HIGH", "MEDIUM", "LOW"],
  "guidanceType": "WARNING_SIGNS",
  "symptoms": ["vaginal_bleeding", "convulsion", "severe_headache", "blurred_vision", "fever", "severe_abdominal_pain", "difficulty_breathing"],
  "stepsBn": [
    "বিপদ সংকেত দেখা দিলে দেরি না করে স্বাস্থ্যকর্মী বা স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।",
    "পরিবারের কাউকে সঙ্গে রাখুন।",
    "আগে থেকে জরুরি যোগাযোগ ও যাওয়ার জায়গা ঠিক করে রাখুন।"
  ],
  "doNotSay": [
    "diagnosis",
    "medicine dosage",
    "false reassurance",
    "rest only for danger signs"
  ],
  "evidenceTag": "WHO_PREGNANCY_DANGER_SIGNS"
}
```

---

## 6. Safety constraints from this source

- Explain danger signs clearly, but do not frighten the mother unnecessarily.
- Do not give false reassurance.
- Do not make disease diagnoses.
- Link danger-sign advice with a concrete emergency plan.
- Treat the woman respectfully and involve family/companion support where appropriate.
- Use patient-friendly language and confirm understanding.

---

## 7. Recommended MVP rules from this source

```text
WHO_DANGER_SIGN_BLEEDING_HIGH
WHO_DANGER_SIGN_CONVULSION_HIGH
WHO_DANGER_SIGN_HEADACHE_VISION_HIGH
WHO_DANGER_SIGN_FEVER_WEAKNESS_HIGH
WHO_DANGER_SIGN_SEVERE_ABDOMINAL_PAIN_HIGH
WHO_DANGER_SIGN_BREATHING_DIFFICULTY_HIGH
WHO_WARNING_SIGN_FEVER_MEDIUM
WHO_WARNING_SIGN_ABDOMINAL_PAIN_MEDIUM
```

---

## 8. Important limitation

This source is a counselling handbook. It is suitable for patient communication, warning signs, emergency planning, and source-grounded explanation. It should not be used to create detailed treatment, medicine, or dosage logic in the MatriSense MVP.
