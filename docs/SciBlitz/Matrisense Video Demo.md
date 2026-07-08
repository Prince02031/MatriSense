## Problem

1. pregnant mothers in remote regions face issues in checking whether their current symptoms are risky or not. because visiting healthworkers especially during monsoon or other natural disaster becomes very tough for them
2. there are Stigma around disclosing pregnancy or health issues early.
3. **Lack of Autonomy:** In many rural households, women cannot make independent decisions regarding their own health. They must rely on the permission and financial support of husbands or male family members, who may deprioritize maternal healthcare
4. poor families end up spending money on long journeys to clinics for minor, non-emergency issues.
5. Because of social stigmas and cultural taboos—such as the hidden nature of early pregnancy, fear of community judgment, and relying entirely on home remedies—**rural pregnancy data in Bangladesh suffers from massive underreporting**
6. Mothers arrive with zero past records, forcing workers to guess historical complications.
7. **Late-stage presentations:** Patients only seek help when a crisis is critical, leaving workers with less time to save lives.

**The pitch:** 
Rural pregnant mothers in Bangladesh often face delayed care because warning symptoms are unclear, danger signs are missed, and health workers do not receive structured case information early enough.

Many mothers describe symptoms informally in Bangla or voice, while distance, monsoon, cost, household permission, stigma, and home remedies delay care.

By the time care is reached, health workers may face missing records, unclear history, and no early risk signal. The real gap is the missing path from first home symptom to structured case and timely human follow-up.

**solution pitch:**

Here comes MatriSense: an AI-native maternal triage and health referral system for rural mothers and frontline health workers.

Mothers report symptoms privately in Bangla through text or voice, receive early warning guidance, and escalate faster when risk is high.

Health workers get structured cases with symptom timeline, risk flags, follow-up answers, and referral context.

For the health system, each case builds longitudinal rural pregnancy records and reveals underreported risk trends.

The LLM understands and explains, rules decide urgency, and health workers make care decisions.

## Solution

1. focus on solving the above problems
2. focus on how this benefits the medical industry in collecting structured and longitudinal data related to rural pregnancies

**The pitch:**
So here comes MatriSense, an AI-native maternal triage and health referral system for rural pregnant mothers and frontline health workers.

For mothers, it offers private Bangla text or voice symptom reporting, early warning guidance, less unnecessary travel for low-risk concerns, and faster escalation when risk is high.

For health workers, it turns scattered verbal reports into structured maternal cases with profile, symptom timeline, risk flags, follow-up answers, and referral context.

For the health system, those cases become longitudinal rural pregnancy records, improving visibility into underreported symptoms and maternal-risk trends.

Unlike a free-form chatbot, the LLM helps with Bangla understanding and explanation, while rules decide urgency and health workers remain responsible for care decisions.

**slide content:**
Solution: AI-native maternal triage & Health referral system

Sub-title: From Bangla home symptom reports to structured, referral-ready maternal cases.

For Mothers
• Private Bangla text or voice reporting
• Early warning guidance
• Lower unnecessary travel for low-risk concerns
• Faster escalation when risk is high

For Health Workers
• Structured maternal case summary
• Pregnancy profile and symptom timeline
• Risk-prioritized dashboard
• Referral and hospital context

For the Health System
• Longitudinal rural pregnancy records
• Better visibility into underreported symptoms
• Cleaner maternal-risk data
• Human-in-the-loop referral workflow

LLMs understand and explain. Rules decide urgency. Health workers make care decisions.

## Demo


## AI Approach

**tighter version:**

This is the AI architecture behind MatriSense. Groq Whisper handles Bangla voice transcription, while Gemini extracts structured symptoms, severity, duration, negations, and uncertainty from text.

Urgency is not decided by the LLM. A deterministic maternal danger-sign rule engine assigns LOW, MEDIUM, or HIGH risk, and that fixed decision controls the guidance boundary.

Rule-aware RAG retrieves trusted maternal-health guidance, with JSON guidance cards and local Vector RAG through MongoDB Atlas Vector Search and Xenova multilingual embeddings from official WHO/DGHS and other resources. The LLM explains within those boundaries, and the safety validator blocks diagnosis, dosage, or risk downgrade.

After triage, the Guided Care Assistant continues safe patient conversation using the same triage context, while high-risk cases move to the health-worker dashboard and referral workflow.

For more technical documentations, check the docs pages

**more tighter:**

This is the actual AI Architecture behind MatriSense. Groq Whisper converts Bangla voice into editable text, and Gemini extracts structured symptoms, severity, duration, negations, and uncertainty.

But urgency is not decided by the LLM. A deterministic maternal danger-sign rule engine assigns LOW, MEDIUM, or HIGH risk, and that decision controls the guidance boundary.

Rule-aware RAG then retrieves trusted maternal-health guidance from JSON cards and local Vector RAG using MongoDB Atlas Vector Search with Xenova multilingual embeddings, grounded in WHO, DGHS, CDC, and other sources. GraphRAG

The LLM explains only within those boundaries, the safety validator blocks diagnosis, dosage, or risk downgrade, and the Guided Care Assistant continues safe post-triage conversation using the same session context.

with GraphRAG:

This is the AI architecture behind MatriSense. Groq Whisper handles Bangla voice, and Gemini extracts structured symptoms, severity, duration, negations, and uncertainty.

The core safety layer is the rule-based triage engine. It—not the LLM—assigns LOW, MEDIUM, or HIGH risk, and that decision controls what guidance is allowed.

Then rule-aware RAG retrieves trusted maternal-health guidance using JSON cards and local Vector RAG with MongoDB Atlas Vector Search and Xenova multilingual embeddings. GraphRAG-style retrieval is in progress, but Vector RAG remains the stable path.

Finally, the safety validator blocks diagnosis, dosage, or risk downgrade, while the Guided Care Assistant continues safe post-triage conversation from the same session context.



## Next Step

The next step is to scale MatriSense from a working prototype into production-ready maternal triage infrastructure.

We will measure impact through symptom-to-risk flag time, high and medium-risk cases surfaced, referral completion, reduced repeated history collection, and safe AI guidance validation.

To scale, we will extend profile-aware rules, add workflow MCP tools inside the Guided Care Assistant, expand district referral data, add GraphRAG on top of stable Vector RAG, and build analytics for maternal-risk trends.

MatriSense is Bangladesh-first, but globally reusable for low-resource maternal care. Thank you.


## Short Demo

Yes, your flow is good. For the **1:00–2:00 demo/concept flow**, use a **MEDIUM-risk case**, not high-risk. Medium is perfect because it shows the system can avoid over-escalating everything while still involving health workers.

## Demo case to enter

Use this Bangla symptom text:

```text
গত দুই দিন ধরে হালকা মাথা ব্যথা হচ্ছে এবং মাঝে মাঝে বমি বমি লাগে। চোখে ঝাপসা দেখি না, রক্তপাত নেই, পেটে তীব্র ব্যথা নেই, শ্বাসকষ্ট নেই। আমি একটু দুর্বল লাগছে।
```

English meaning:

```text
For the last two days I have had mild headache and sometimes nausea. I do not have blurred vision, bleeding, severe abdominal pain, or breathing difficulty. I feel a little weak.
```

Why this is good:

- It is realistic.
    
- It includes pregnancy-relevant symptoms.
    
- It gives negations for high-risk danger signs.
    
- It should avoid HIGH risk if your rule engine handles negation properly.
    
- It can still justify **MEDIUM** because symptoms are persistent and worth health-worker follow-up.
    

If this comes out LOW in your app, use this stronger medium version:

```text
গত তিন দিন ধরে মাথা ব্যথা হচ্ছে এবং বমি বমি লাগে। আজ একটু বেশি দুর্বল লাগছে। চোখে ঝাপসা দেখি না, রক্তপাত নেই, পেটে তীব্র ব্যথা নেই, শ্বাসকষ্ট নেই।
```

If you need it to trigger medium more reliably, add:

```text
শেষ চেকআপ এক মাসের বেশি আগে হয়েছিল।
```

That makes the case more follow-up-worthy without becoming emergency-level.

---

# 1-minute demo flow

## 1:00–1:08 — Patient dashboard

**Show:** Patient dashboard, profile/history/referral area.

Say:

```text
Here is the patient dashboard. The mother can see her pregnancy profile, previous triage history, referral updates, and start a new symptom check from one place.
```

Checkpoint:

```text
Show dashboard clearly for 2–3 seconds.
Click Start Triage / New Symptom Check.
```

---

## 1:08–1:22 — Symptom input

**Show:** Bangla text or voice input.

Paste this:

```text
গত দুই দিন ধরে হালকা মাথা ব্যথা হচ্ছে এবং মাঝে মাঝে বমি বমি লাগে। চোখে ঝাপসা দেখি না, রক্তপাত নেই, পেটে তীব্র ব্যথা নেই, শ্বাসকষ্ট নেই। আমি একটু দুর্বল লাগছে।
```

Say:

```text
The mother can describe symptoms naturally in Bangla. She can also use voice, and the transcript is shown first so she can review it before submitting.
```

Checkpoint:

```text
Show Bangla input.
Submit.
```

---

## 1:22–1:34 — Extraction / follow-up / triage result

**Show:** extracted symptoms, confirmation, follow-up if it appears, then MEDIUM result.

Say:

```text
The AI extracts structured symptoms like headache, nausea, weakness, duration, and important negations such as no bleeding or blurred vision. The rule engine then checks danger signs and classifies this as medium risk, meaning the patient should contact a health worker but does not need emergency escalation.
```

Checkpoint:

```text
Show extracted symptoms or confirmation screen.
Show MEDIUM risk result.
Do not spend too long here.
```

If the app asks a follow-up question, answer safely:

- Blurred vision? `না`
    
- Severe abdominal pain? `না`
    
- Bleeding? `না`
    
- Breathing difficulty? `না`
    
- Repeated vomiting? `না`, unless you want stronger medium
    
- Reduced fetal movement? `না`
    

---

## 1:34–1:45 — Guided Care Assistant

**Show:** Open Guided Care Assistant from result page.

Ask in Bangla:

```text
আমি এখন কী করবো?
```

Or:

```text
স্বাস্থ্যকর্মীকে কী বলবো?
```

Say:

```text
After triage, the Guided Care Assistant uses the same session context. It can explain next steps in Bangla, help the mother prepare what to tell a health worker, and stay inside the safety boundary set by the triage result.
```

Checkpoint:

```text
Show assistant answer.
If voice output works, let it start briefly, then continue.
```

---

## 1:45–1:55 — Health worker dashboard

**Show:** health worker dashboard / patient cases.

Say:

```text
On the health-worker side, the case becomes structured instead of a vague phone call. The worker can see the patient profile, original symptom report, extracted symptoms, follow-up answers, risk level, AI summary, and referral notes.
```

Checkpoint:

```text
Switch to health worker account/page.
Open the new patient case.
```

---

## 1:55–2:00 — Referral system

**Show:** referral/hospital assignment section.

Say:

```text
The worker can then update case status, add referral notes, and assign or reassign a regional hospital based on district and availability.
```

Checkpoint:

```text
Show hospital assignment/referral controls.
End on the case detail page or referral assignment screen.
```

---

# Full 1-minute demo script

```text
Here is the patient dashboard. The mother can see her pregnancy profile, previous triage history, referral updates, and start a new symptom check from one place.

She can describe symptoms naturally in Bangla by text or voice. Voice is transcribed first, so she can review it before submitting.

In this example, she reports two days of mild headache, nausea, and weakness, while also saying there is no blurred vision, bleeding, severe abdominal pain, or breathing difficulty.

The AI extracts structured symptoms, duration, and negations. Then the rule engine checks maternal danger signs and classifies this as medium risk — contact a health worker, but no emergency escalation.

After triage, the Guided Care Assistant uses the same session context to explain what to do next and what to tell the health worker.

On the worker side, the case appears as a structured record with profile, symptoms, follow-up answers, risk level, summary, and referral notes. The worker can update status and assign a regional hospital for follow-up.
```

---

# Screen recording checklist

Before recording, test this exact path once:

```text
1. Patient login works
2. Patient profile exists
3. New triage starts
4. Bangla symptom input submits
5. Result becomes MEDIUM
6. Guided Care Assistant opens from result page
7. Assistant responds safely
8. Health worker dashboard loads
9. Case appears in worker dashboard
10. Case detail shows triage info
11. Referral/hospital assignment section works
```

## Important recording tip

Do not type during the actual recording. Keep the Bangla symptom copied and paste it quickly. Also keep the assistant question copied:

```text
স্বাস্থ্যকর্মীকে কী বলবো?
```

This will save time and make the demo look smooth.