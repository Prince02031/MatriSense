# CDC HEAR HER — Urgent Maternal Warning Signs  
**Source:** CDC HEAR HER Campaign  
**Primary use in MatriSense:** Modern maternal warning-sign list, Bengali warning-sign terminology, follow-up questions, escalation triggers, and RAG warning-sign cards.  
**Download / reference:**  
- CDC warning signs page: https://www.cdc.gov/hearher/maternal-warning-signs/index.html  
- CDC Bengali poster: https://www.cdc.gov/hearher/resources/download-share/docs/pdf/Warning-Signs-Poster_LTR_whitebkg_Bengali.pdf  
- CDC Stacks Bengali resource page: https://stacks.cdc.gov/view/cdc/107732  

---

## 1. What this source is about

CDC HEAR HER lists urgent maternal warning signs that may occur during pregnancy or within one year after delivery. The main instruction is to **seek medical care immediately** if any listed warning signs occur.

This source is very useful for MatriSense because it includes a broader and more patient-friendly warning-sign list than the basic WHO danger-sign list. It also provides Bengali-language material, which can help with Bangla UI and patient-facing wording.

---

## 2. Main warning signs to convert into MatriSense symptom codes

| CDC warning sign | MatriSense code | MVP risk |
|---|---|---|
| Headache that does not go away or worsens | `severe_headache`, `headache_worsening` | MEDIUM to HIGH |
| Headache with blurred vision/dizziness | `headache` + `blurred_vision` / `dizziness` | HIGH |
| Dizziness or fainting | `dizziness`, `fainting` | MEDIUM to HIGH |
| Vision changes | `blurred_vision`, `vision_change` | MEDIUM; HIGH with headache/swelling |
| Fever ≥ 100.4°F / 38°C | `fever` | MEDIUM; HIGH with weakness/breathing signs |
| Extreme swelling of hands or face | `extreme_swelling`, `swelling_face_hands` | MEDIUM; HIGH with headache/vision |
| Thoughts of harming self or baby | `self_harm_thoughts` | HIGH / urgent support |
| Trouble breathing | `difficulty_breathing` | HIGH if severe |
| Chest pain or fast heartbeat | `chest_pain`, `fast_heartbeat` | HIGH |
| Severe nausea and vomiting | `severe_vomiting`, `cannot_keep_water_down` | MEDIUM to HIGH |
| Severe belly pain that does not go away | `severe_abdominal_pain` | HIGH |
| Baby’s movement stopping or slowing | `reduced_fetal_movement` | HIGH, especially late pregnancy |
| Vaginal bleeding/fluid leaking during pregnancy | `vaginal_bleeding`, `fluid_leaking` | HIGH |
| Heavy bleeding/discharge after pregnancy | `postpartum_heavy_bleeding`, `foul_discharge` | HIGH |
| Severe swelling/redness/pain of leg or arm | `leg_arm_swelling_pain_redness` | HIGH / urgent review |
| Overwhelming tiredness | `overwhelming_tiredness` | MEDIUM; HIGH if unable to function or with other danger signs |

---

## 3. HIGH-risk rules supported by this source

Use these for MVP or final version:

```text
CDC_HEADACHE_VISION_HIGH
CDC_FAINTING_HIGH
CDC_VISION_CHANGE_WITH_HEADACHE_HIGH
CDC_TROUBLE_BREATHING_HIGH
CDC_CHEST_PAIN_FAST_HEARTBEAT_HIGH
CDC_SEVERE_VOMITING_DEHYDRATION_HIGH
CDC_SEVERE_BELLY_PAIN_HIGH
CDC_REDUCED_FETAL_MOVEMENT_HIGH
CDC_VAGINAL_BLEEDING_OR_FLUID_LEAK_HIGH
CDC_POSTPARTUM_HEAVY_BLEEDING_HIGH
CDC_SELF_HARM_THOUGHTS_HIGH
```

### Special note on reduced fetal movement

CDC says the important issue is a **change** in the baby’s movement, not a fixed number of movements. For MatriSense:

```text
If third trimester + mother reports baby moving less than before → HIGH
If gestational week unknown + reduced movement → MEDIUM/HIGH and ask pregnancy stage if safe
```

---

## 4. MEDIUM-risk and follow-up rules

Some CDC warning signs should trigger follow-up first if severity is unclear.

### Headache

```text
headache only → ask follow-up
headache + not going away/worse → MEDIUM/HIGH
headache + blurred vision/dizziness/swelling → HIGH
```

Follow-up questions:

```text
মাথাব্যথা কি কমছে না বা সময়ের সাথে বাড়ছে?
চোখে ঝাপসা দেখা, আলো ঝলকানি, বা ডাবল দেখা হচ্ছে কি?
মাথা ঘোরে বা অজ্ঞান লাগছে কি?
হাত বা মুখ খুব ফুলে গেছে কি?
```

### Vomiting

```text
mild nausea → LOW/MEDIUM with monitoring
severe vomiting + cannot drink/keep fluid → HIGH
vomiting + confusion/fever/dizziness → HIGH
```

Follow-up questions:

```text
৮ ঘণ্টার বেশি পানি পান করতে পারছেন না কি?
২৪ ঘণ্টার বেশি খাবার খেতে পারছেন না কি?
পানি খেলেও বমি হয়ে যাচ্ছে কি?
মাথা ঘোরা, জ্বর, বিভ্রান্তি বা খুব দুর্বল লাগছে কি?
```

### Fever

```text
fever alone → MEDIUM
fever + breathing difficulty/weakness/confusion → HIGH
```

---

## 5. Bengali wording usefulness

The CDC Bengali poster gives useful patient-facing concepts such as:

```text
অবিলম্বে চিকিৎসাগত পরিচর্যা নিন
গুরুতর জটিলতার লক্ষণ
শ্বাস নিতে সমস্যা হওয়া
মাথা ব্যথা যা সেরে যায় না বা সময়ের সাথে খারাপ হয়
দৃষ্টিশক্তিতে পরিবর্তন
গর্ভাবস্থায় শিশুর নড়াচড়া বন্ধ বা ধীর হয়ে যাওয়া
গর্ভাবস্থায় যোনি থেকে রক্ত পড়া বা তরল বের হওয়া
```

Use this as wording inspiration, but make the final Bangla clear and natural for Bangladeshi users.

---

## 6. RAG knowledge-card implications

Create cards such as:

```text
CDC_URGENT_WARNING_SIGNS_GENERAL
CDC_HEADACHE_WARNING
CDC_VISION_CHANGE_WARNING
CDC_EXTREME_SWELLING_WARNING
CDC_TROUBLE_BREATHING_WARNING
CDC_SEVERE_VOMITING_WARNING
CDC_REDUCED_FETAL_MOVEMENT_WARNING
CDC_BLEEDING_FLUID_LEAK_WARNING
CDC_SELF_HARM_URGENT_SUPPORT
```

Each card should include:

- symptoms
- riskLevelAllowed
- guidanceType
- simple Bangla steps
- escalation triggers
- doNotSay list
- sourceRef: `CDC_HEAR_HER`

---

## 7. Safety constraints

- Treat CDC signs as urgent warning signs, not diagnosis.
- If a warning sign is present, do not generate “probably normal” language.
- For self-harm thoughts, avoid normal triage language only; show urgent support and health-worker contact.
- For HIGH-risk signs, do not show low-risk self-care first.
- Mention pregnancy/postpartum context clearly when relevant.

---

## 8. Recommended MatriSense action mapping

| Risk | Action |
|---|---|
| HIGH | `CONTACT_HEALTH_WORKER_IMMEDIATELY` or `URGENT_CLINIC_VISIT` |
| MEDIUM | `CONTACT_HEALTH_WORKER_TODAY` |
| LOW | `HOME_CARE_AND_MONITOR_WITH_WARNING_SIGNS` |

---

## 9. Important limitation

CDC HEAR HER is a warning-sign awareness resource. It is very strong for urgent signs and patient education. It is not a full local Bangladesh clinical protocol and should be used with WHO/DGHS-localized sources and human review.
