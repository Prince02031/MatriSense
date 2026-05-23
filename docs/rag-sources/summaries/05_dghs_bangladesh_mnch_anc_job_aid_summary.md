# DGHS / Bangladesh MNCH eToolkit — Antenatal Care Job Aid and Local Counselling Resources  
**Source:** Bangladesh MNCH eToolkit, Antenatal Care section  
**Publisher / platform:** DGHS eToolkit / Bangladesh MNCH materials  
**Primary use in MatriSense:** Bangladesh-local ANC counselling context, Bangla terminology, patient-friendly phrasing, local health-worker workflow.  
**Download / reference:**  
- ANC section: https://etoolkits.dghs.gov.bd/toolkits/bangladesh-mnch/antenatal-care  
- ANC Job Aid PDF: https://etoolkits.dghs.gov.bd/sites/default/files/anc_job_aid.pdf  
- Maternal/newborn care flipchart: https://etoolkits.dghs.gov.bd/sites/default/files/flipchart_on_care_of_pregnant_mother_neonatal.pdf  

---

## 1. What this source is about

The Bangladesh MNCH eToolkit contains local maternal, newborn, and child health materials. For MatriSense, the ANC job aid and related Bangla resources should be treated as **localization and counselling references**.

This source is especially important because MatriSense is designed for rural Bangla-speaking mothers and frontline health workers. WHO/CDC sources give strong global medical warning-sign references, but DGHS/Bangladesh resources help the app sound locally appropriate.

---

## 2. Best use in MatriSense

Use this source for:

```text
Bangla symptom wording
Bangla danger-sign wording
Bangladesh ANC counselling style
health-worker-facing terminology
birth and emergency planning language
local referral/care-seeking framing
low-literacy, easy-to-understand UI text
```

Do not use it as an automatic rulebook until the exact PDF sections are manually reviewed and mapped.

---

## 3. What to extract manually from the PDF

When your team or agent reads the PDF, extract these items into Markdown:

```text
1. Bangla names of common pregnancy danger signs
2. Bangla wording for when to go to a health facility
3. ANC visit and checkup messages
4. birth preparedness messages
5. emergency preparedness messages
6. nutrition/self-care messages
7. health-worker counselling sequence
```

Recommended extracted file:

```text
/docs/rule-source-summaries/dghs-anc-job-aid-extracted-danger-signs.md
```

---

## 4. High-risk rule relevance

For MVP, do not rely only on this source for severity rules unless the exact danger-sign text has been reviewed. Use WHO PCPNC, WHO danger-sign chapter, and CDC HEAR HER as the main clinical risk references.

However, if the DGHS ANC job aid confirms the same warning signs, use it to strengthen local evidence tags:

```text
vaginal bleeding
convulsions/fits
severe headache / blurred vision
severe abdominal pain
fever with weakness
difficulty breathing
reduced fetal movement
swelling of face/hands
```

Possible local evidence tags:

```text
DGHS_ANC_DANGER_SIGNS_BANGLA
DGHS_ANC_BIRTH_PREPAREDNESS
DGHS_ANC_EMERGENCY_PREPAREDNESS
DGHS_ANC_HEALTH_WORKER_COUNSELLING
```

---

## 5. Bangla symptom synonym dictionary

This source should help improve `banglaSymptomSynonyms.js`.

Suggested synonym groups:

```js
export const BANGLA_SYMPTOM_SYNONYMS = {
  vaginal_bleeding: ["রক্তপাত", "রক্ত যাচ্ছে", "যোনি থেকে রক্ত", "ব্লিডিং"],
  headache: ["মাথা ব্যথা", "মাথাব্যথা", "মাথা ধরেছে"],
  blurred_vision: ["চোখে ঝাপসা", "ঝাপসা দেখা", "দৃষ্টি ঝাপসা"],
  swelling: ["হাত ফুলে গেছে", "মুখ ফুলেছে", "পা ফুলেছে", "শরীর ফুলে গেছে"],
  abdominal_pain: ["পেট ব্যথা", "পেটে ব্যথা", "তলপেটে ব্যথা"],
  convulsion: ["খিঁচুনি", "ফিট", "অজ্ঞান হয়ে খিঁচুনি"],
  difficulty_breathing: ["শ্বাসকষ্ট", "শ্বাস নিতে কষ্ট", "শ্বাস বন্ধ লাগে"],
  reduced_fetal_movement: ["বাচ্চার নড়াচড়া কম", "নড়াচড়া কমে গেছে", "বাচ্চা নড়ছে না"]
};
```

Final wording should be checked against the actual DGHS/Bangla resource text.

---

## 6. RAG knowledge-card use

Use DGHS materials for Bangla phrasing and local action steps, such as:

```json
{
  "id": "dghs_birth_emergency_plan",
  "sourceName": "DGHS Bangladesh MNCH ANC Job Aid",
  "sourceType": "local_counselling_job_aid",
  "guidanceType": "EMERGENCY_PREPAREDNESS",
  "riskLevelAllowed": ["LOW", "MEDIUM", "HIGH"],
  "stepsBn": [
    "জরুরি অবস্থায় কোথায় যাবেন তা আগে থেকে ঠিক করে রাখুন।",
    "পরিবারের একজনকে জরুরি যোগাযোগের জন্য প্রস্তুত রাখুন।",
    "স্বাস্থ্যকর্মীর নম্বর সংরক্ষণ করুন।"
  ],
  "doNotSay": [
    "diagnosis",
    "medicine dosage",
    "delay care for danger signs"
  ],
  "evidenceTag": "DGHS_ANC_EMERGENCY_PREPAREDNESS"
}
```

---

## 7. Safety constraints

- Use DGHS Bangla wording for accessibility, but do not invent medical rules from partial text.
- Any rule derived from the PDF should include source page/section in the rule notes.
- If a danger sign appears in WHO/CDC and DGHS, keep the rule conservative.
- Do not give medication or treatment steps to mothers.

---

## 8. Recommended agent instruction

Use this prompt with Codex or another agent after placing the PDF in the repo:

```text
Read /docs/references/dghs-bangladesh/dghs-anc-job-aid-bangla.pdf. Extract only maternal danger-sign wording, emergency-preparedness advice, and ANC counselling phrases. Do not create diagnosis or treatment rules. Return a Markdown summary with exact Bangla phrase, English meaning, MatriSense symptom code, possible risk mapping, and notes for human review.
```

---

## 9. Important limitation

This summary is a project-use guide. Before generating final rules from the DGHS ANC job aid, the team should manually review the exact PDF pages and preserve the original Bangla wording in a separate extracted-notes file.
