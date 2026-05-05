Yes — I checked the downloaded submission pages. The form is **much more detailed than a normal idea submission**. It is clearly trying to score teams on **AI depth, data engineering, tooling, provenance, RAG, model usage, and responsible AI**, not just the project idea.

The important discovery: the submission form shows an **AI Depth Score out of 110**, and the AI detail section gives points for prompts, token optimization, LLMs/models, RAG, MCP, open-source tools, agents, evaluation, guardrails, frontend AI builders, workflow automation, and local LLMs. The form also separately asks for a full **Data Lifecycle & Engineering** stack: data sources, acquisition, parsing, storage, visualization, insights, orchestration, APIs, open-source stack, governance, privacy, lineage, and performance.

So for MatriSense, we should not submit it as only:

> “React app + AI chatbot for pregnant mothers.”

That will look weak.

We should frame it as:

> **MatriSense is an AI-native maternal triage and referral system using Bangla symptom extraction, rule-based clinical safety logic, RAG/GraphRAG over maternal health guidance, structured case records, and a human-in-the-loop health worker dashboard.**

This aligns well with the BuildFest requirement to show a clear **AI-native approach**, **input → AI → output flow**, **Bangla/localization**, **RAG/Graph/ML thinking**, and measurable impact.

---

# 1. What the submission form actually wants

From the HTML pages, the main tabs are:

```text
Basics
Team
AI Detail Usage
Links
Build Provenance
```

The required missing fields shown by the form are:

```text
Project Name
Elevator Pitch
Public Summary
Problem Statement
Solution Description
Data & AI Provenance
Tooling & IDE
```

The form says submission cannot happen until these are filled.

So our submission preparation should be divided into:

```text
A. Basic project identity
B. Problem and solution
C. Data lifecycle and engineering
D. AI depth section
E. Build provenance / AI usage honesty
F. Links: demo video, repo, live app, docs page
```

---

# 2. Recommended project identity fields

## Project Name

Use:

```text
MatriSense
```

Or slightly more descriptive:

```text
MatriSense: AI Maternal Triage & Referral Assistant
```

For the actual field, I recommend the second one because judges instantly understand the domain.

---

## Elevator Pitch

Use:

```text
MatriSense helps rural pregnant mothers report symptoms in Bangla, detects maternal danger signs using AI-assisted triage and guideline-grounded RAG, and sends structured high-risk cases to health workers for faster follow-up.
```

This is strong because it includes:

```text
rural mothers
Bangla
AI triage
danger signs
RAG
health workers
follow-up
```

---

## Domain

Select:

```text
Healthcare / HealthTech
```

---

## Challenge

Select the closest option available. If the dropdown follows the official guide, choose:

```text
Maternal Health Companion
```

or:

```text
AI-Augmented Public & Maternal Health Systems
```

The official BuildFest HealthTech track specifically highlights maternal companions, AI triage, preventive systems, rural telehealth, risk prediction, ethical safeguards, clinical validation, explainability, and human-in-loop interfaces.

---

# 3. Public Summary

Use something like this:

```text
MatriSense is an AI-augmented maternal health support system for rural Bangladesh. It allows pregnant mothers to report symptoms in Bangla, converts those symptoms into structured medical facts, checks for maternal danger signs using a transparent rule-based triage engine, retrieves trusted maternal health guidance through rule-aware RAG, and generates safe step-by-step Bangla care guidance. The patient output includes urgency, source-grounded immediate steps, symptoms to monitor, and escalation triggers, while avoiding diagnosis and medicine advice. High-risk cases are sent to a health worker dashboard with symptoms, follow-up answers, matched rules, retrieved evidence, patient guidance already shown, and referral notes, helping health workers prioritize serious cases faster while keeping final medical decisions human-led.
```

This is better than saying “AI chatbot” because it shows a full system.

---

# 4. Problem Statement

Use this direction:

```text
Rural pregnant mothers in Bangladesh often face delayed care because symptoms are not reported clearly, danger signs are missed, and health workers may not receive structured case information early enough. Many mothers may describe symptoms informally in Bangla, may not know which symptoms are urgent, and may delay visiting a clinic until the condition becomes serious. Health workers also lose time because they must collect the same basic information repeatedly before understanding the urgency of a case.

The problem is not only lack of medical advice; it is the lack of an accessible, structured triage and communication bridge between rural mothers and frontline health workers. MatriSense addresses this gap by turning Bangla symptom reports into structured maternal health records, checking danger signs early, and helping health workers prioritize follow-up.
```

Key point: mention **medical record building**, because that is one of your strongest differentiators.

---

# 5. Solution Description

Use this:

```text
MatriSense provides a guided maternal triage workflow. A mother first creates a basic pregnancy profile with pregnancy stage, expected delivery date, last checkup date, known risk factors, and emergency contact. She then reports symptoms in Bangla text. The AI layer extracts structured symptoms, severity, duration, and uncertain fields. The system asks short follow-up questions when needed, and all answers are stored in the same triage session.

A rule-based triage engine checks maternal danger signs and personal risk factors to classify urgency as low, medium, or high. The decision also controls what type of patient guidance is allowed: self-care and monitoring for low-risk cases, health-worker contact for medium-risk cases, and urgent escalation only for high-risk cases. A rule-aware RAG layer then retrieves trusted maternal health guidance cards matched to the symptoms, risk level, matched rules, and allowed guidance type. These cards contain source-backed immediate steps, monitoring points, escalation triggers, and prohibited advice.

The LLM generates Bangla patient guidance using only the fixed rule-engine decision and retrieved RAG cards. It cannot change the risk level, diagnose disease, prescribe medicine, or provide unsupported advice. For example, a low-risk nausea/headache case can receive small practical steps such as hydration, light meals, rest, trigger avoidance, and warning signs to monitor; a high-risk headache with blurred vision case receives urgent clinic/contact instructions only. High-risk cases appear in a health worker dashboard with patient profile, symptoms, follow-up answers, matched rules, retrieved evidence, patient-facing guidance already shown, and referral notes.

The final medical decision remains with the health worker or doctor. MatriSense acts as a safe bridge for early risk detection, structured case building, source-grounded patient guidance, and faster referral.
```

---

# 6. Technologies we should mention

We need to mention technologies that sound AI-native but are still realistic for 8–9 days.

## Core stack

```text
Frontend:
React.js, Vite, Tailwind CSS, React Router, React Hook Form, Zod

Backend:
Node.js, Express.js

Database:
MongoDB Atlas, Mongoose

Authentication:
JWT + bcrypt, or simple role-based prototype auth for preli

AI Layer:
Gemini / OpenAI / Claude API for Bangla symptom extraction and explanation
Structured JSON output prompts
json-rules-engine for triage logic
RAG using maternal health guideline documents

RAG / Knowledge:
Supabase pgvector or MongoDB Atlas Vector Search
Curated WHO/DGHS/NHS/CDC maternal health guidance cards
Rule-aware retrieval using risk level, symptoms, matched rules, and allowed guidance type
Hybrid search using keyword + vector retrieval
Simple reranking by matched rule/evidence tag
Graph-style metadata linking symptom → danger sign → risk level → allowed action → evidence source

Dashboard:
React admin dashboard, Recharts

Deployment:
Frontend on Vercel
Backend on Render
Database on MongoDB Atlas
```

For the actual preliminary build, the safest stack is:

```text
React + Tailwind
Node + Express
MongoDB Atlas
json-rules-engine
LLM API
Rule-aware care-guidance RAG layer using pgvector / MongoDB Atlas Vector Search / JSON fallback
```

---

# 7. Data Lifecycle & Engineering fields

The form asks where data comes from, how it is acquired, parsed, stored, visualized, and governed. It includes options like internal app data, external APIs, public web, open datasets, user uploads, synthetic data, LLM parsing, API pulls, speech-to-text, JSON/CSV/PDF/Markdown/HTML/audio formats, MongoDB, vector DB, graph DB, Recharts, LLM inference/RAG, rule engine, orchestration, outbound APIs, open-source stack, privacy, lineage, and observability.

For MatriSense, we should fill it like this.

## Data Sources

Select or mention:

```text
Internal app data:
- mother profile
- symptom reports
- follow-up answers
- triage session history
- referral notes

Open / public health guidance:
- WHO maternal health guidance and antenatal care resources
- WHO/CDC maternal danger-sign and urgent warning-sign guidance
- NHS/ACOG-style pregnancy self-care guidance for common symptoms such as nausea/vomiting, used only for safe low-risk care steps
- DGHS/Bangladesh maternal health guidance if available

Synthetic / AI-generated data:
- simulated maternal triage cases for testing
- synthetic patient profiles for demo only
```

Do **not** claim real patient data.

Use this wording:

```text
For the preliminary prototype, we use synthetic maternal profiles and simulated symptom reports. The knowledge layer uses trusted public maternal health guidance. No real patient data is used in the demo.
```

This is important for privacy.

---

## Acquisition Methods

Select or mention:

```text
- AI Extraction / LLM parsing of Bangla symptom input
- API Pull / SDK integration for LLM calls
- Bulk document intake for guideline PDFs/Markdown
- Speech-to-text as optional future input
- Manual curation of maternal danger-sign and care-guidance knowledge cards
```

For preli, don’t overclaim web scraping unless you actually scrape. Better say:

```text
Guideline documents are manually curated for the preliminary prototype, with scraper/API ingestion planned for future updates.
```

---

## Parsing, Formats & Cleaning

Mention:

```text
Formats:
JSON, Markdown, PDF, HTML, Bangla text

Cleaning:
- convert Bangla symptom text into normalized symptom codes
- map synonyms such as রক্তপাত / bleeding / blood যাচ্ছে to vaginal_bleeding
- validate structured outputs using Zod schema
- remove irrelevant or unsafe LLM outputs
- tag guidance cards by symptoms, riskLevelAllowed, guidanceType, source, escalation triggers, and prohibited advice
```

---

## Storage Targets

Mention:

```text
MongoDB Atlas:
- patient profiles
- triage sessions
- follow-up answers
- referral notes
- audit logs

Vector DB:
- Supabase pgvector or MongoDB Atlas Vector Search for guideline chunks and care-guidance cards

Optional graph structure:
- symptom → danger sign → risk level → allowed guidance type → action → evidence source relation
```

This lets us claim both vector and graph thinking.

---

## Visualization

Mention:

```text
Recharts:
- risk distribution
- high-risk case count
- follow-up status
- response time / pending cases

Dashboard:
- health worker case list
- priority labels
- case timeline
- matched rules and evidence view
```

---

## Insights

Mention:

```text
- Rule engine / heuristics for danger-sign triage
- LLM inference for Bangla symptom extraction and explanation
- Rule-aware RAG over guideline and care-guidance data
- Basic analytics for case priority and follow-up status
```

Do not claim trained predictive ML unless you actually build it.

---

# 8. AI Detail Usage strategy

This is the most important scoring area. The form gives an AI Depth Score out of 110 and asks about prompt usage, token optimization, models, RAG, MCP, open-source tools, agents, evaluation, guardrails, frontend builders, automation, and local LLMs.

## Prompt Usage

Write:

```text
We designed separate structured prompts for symptom extraction, follow-up question generation, Bangla explanation, and health-worker summary. The prompts use strict role instructions, JSON schemas, medical safety constraints, and negative instructions such as no diagnosis, no medicine prescription, and no risk downgrade. We maintain prompt versions for extractor, explainer, and safety reviewer prompts so each AI call has one controlled responsibility.
```

Mention:

```text
- role prompting
- structured JSON output
- few-shot examples
- schema validation
- prompt versioning
```

---

## Token Optimization

Write:

```text
We reduce token usage by passing only structured case facts to the LLM instead of the full conversation. Patient history is summarized into risk-relevant fields such as trimester, known risk factors, previous high-risk cases, and last checkup gap. RAG retrieves only the top relevant guideline/care cards, filtered by symptom, risk level, and allowed guidance type. Static system instructions and Bangla templates are reused, and simple rule-engine decisions do not require LLM calls.
```

This sounds mature and realistic.

---

## LLMs / Models Used

For the form, select only what you actually use. Best practical choice:

```text
Gemini
ChatGPT / OpenAI
Claude, if used for development or safety review
```

How to explain:

```text
Gemini/OpenAI is used for Bangla symptom extraction and Bangla explanation generation. Claude/ChatGPT was used during development to generate rule candidates, test cases, and safety review prompts. The final triage decision is controlled by json-rules-engine rather than the LLM.
```

Don’t select every model unless you truly use them.

---

# 9. RAG strategy for scoring and patient-safe care guidance

The form’s RAG section gives points for multiple retrieval techniques, including Naive RAG, Vector Database, Contextual RAG, Variable/Semantic Chunking, Graph RAG, Knowledge Graph, Hybrid Search, Rerankers, Agentic RAG, Self-RAG, CRAG, and Query Rewriting/HyDE.

Since RAG is an important scoring factor, MatriSense should not use RAG only as a citation layer. We should use it to improve the actual patient output while keeping the system ethically safe.

The core idea is:

```text
Rule engine = decides urgency and allowed advice type
RAG = retrieves official/source-grounded care steps and warning signs
LLM = converts fixed decision + retrieved guidance into simple Bangla
Safety validator = blocks diagnosis, medicine advice, false reassurance, and contradictions
Health worker dashboard = stores the full reasoning, evidence, and patient guidance shown
```

This means the patient does not only receive simple instructions like “rest” or “go to clinic.” Instead, she receives a source-grounded care guidance card with immediate steps, monitoring points, escalation triggers, and a safety note.

---

## 9.1 Why this RAG flow improves the product

A pregnant mother may need immediate practical steps, not only a risk label. For example, in a low-risk nausea/headache case, the system can safely provide steps such as taking small sips of water, eating small light meals, resting in a quiet place, avoiding nausea triggers, and monitoring danger signs. However, those steps should come from valid guidance cards, not from free-form LLM invention.

So MatriSense uses RAG as an ethical safeguard:

```text
The LLM is only allowed to generate patient guidance from retrieved source-backed cards.
```

This makes the output more useful while still preventing unsafe medical advice.

---

## 9.2 RAG input should come from the rule-engine decision

RAG should not retrieve guidance only from the mother’s raw question. The retrieval should be based on the structured decision package produced by the rule engine.

Example decision package:

```json
{
  "symptoms": ["nausea", "headache"],
  "riskLevel": "LOW",
  "dangerSignsAbsent": [
    "blurred_vision",
    "swelling",
    "severe_headache",
    "repeated_vomiting"
  ],
  "recommendedAction": "HOME_CARE_AND_MONITOR",
  "allowedGuidanceType": "SELF_CARE_STEPS",
  "evidenceTags": [
    "nausea_mild_selfcare",
    "headache_monitoring",
    "maternal_warning_signs"
  ]
}
```

Then RAG retrieves:

```text
1. nausea self-care card
2. headache monitoring card
3. maternal warning-sign escalation card
4. general safety disclaimer card
```

This is safer than searching with only:

```text
what to do for nausea and headache
```

The safer RAG query becomes:

```text
pregnancy nausea mild headache no danger signs self-care monitoring warning signs
```

---

## 9.3 Rule-aware retrieval logic

The retriever should use the rule-engine output to filter what type of guidance can be retrieved.

```text
LOW risk:
- self-care steps
- monitoring advice
- escalation triggers
- safety note

MEDIUM risk:
- contact health worker
- clinic check soon
- temporary safe steps while waiting
- warning signs

HIGH risk:
- urgent referral / urgent clinic contact
- do not delay
- keep someone with the mother
- prepare emergency contact
- source-backed danger-sign explanation
```

Important restrictions:

```text
If risk is HIGH, RAG cannot retrieve low-risk self-care-only cards.
If risk is LOW, RAG can retrieve self-care + warning-sign cards.
If risk is MEDIUM, RAG can retrieve safe temporary steps + contact-health-worker cards.
```

This allows practical guidance without weakening urgent safety advice.

---

## 9.4 Knowledge card structure

For the preliminary round, we can implement RAG using structured knowledge cards. Each card should contain source, symptoms, allowed risk level, guidance type, patient-safe steps, escalation triggers, and prohibited advice.

Example low-risk nausea self-care card:

```json
{
  "id": "nausea_mild_selfcare",
  "sourceName": "Pregnancy nausea/vomiting public health guidance",
  "sourceType": "public_health_guidance",
  "condition": "nausea_vomiting_pregnancy",
  "riskLevelAllowed": ["LOW", "MEDIUM"],
  "symptoms": ["nausea", "vomiting"],
  "guidanceType": "SELF_CARE",
  "stepsBn": [
    "অল্প অল্প করে পানি পান করুন।",
    "একবারে বেশি না খেয়ে অল্প অল্প করে হালকা খাবার খান।",
    "যে খাবার বা গন্ধে বমি বমি লাগে তা এড়িয়ে চলুন।",
    "পর্যাপ্ত বিশ্রাম নিন।"
  ],
  "escalationTriggersBn": [
    "বারবার বমি হলে",
    "পানি রাখতে না পারলে",
    "মাথা ঘোরা বা দুর্বলতা বাড়লে"
  ],
  "doNotSay": [
    "take medicine",
    "diagnose hyperemesis",
    "guarantee normal"
  ],
  "citation": "Public pregnancy guidance"
}
```

Example high-risk headache/vision warning card:

```json
{
  "id": "headache_vision_danger",
  "sourceName": "WHO/CDC maternal warning signs",
  "sourceType": "danger_sign_guidance",
  "condition": "headache_with_vision_changes",
  "riskLevelAllowed": ["HIGH"],
  "symptoms": ["headache", "blurred_vision"],
  "guidanceType": "URGENT_ESCALATION",
  "stepsBn": [
    "দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।",
    "লক্ষণ নিজে নিজে সেরে যাওয়ার জন্য অপেক্ষা করবেন না।",
    "পরিবারের কাউকে সঙ্গে রাখুন।"
  ],
  "escalationTriggersBn": [
    "চোখে ঝাপসা দেখা",
    "তীব্র মাথাব্যথা",
    "মুখ বা হাত ফুলে যাওয়া",
    "অজ্ঞান বা খিঁচুনি"
  ],
  "doNotSay": [
    "rest only",
    "low risk",
    "take painkiller without doctor"
  ],
  "citation": "WHO/CDC maternal warning signs"
}
```

---

## 9.5 Patient output generated from RAG

The patient-facing result should be structured as a care guidance card:

```text
1. Risk level
2. Why this result was given
3. What you can do now
4. What to monitor
5. When to contact a health worker urgently
6. What not to do
7. Safety note
```

Example low-risk output:

```text
Risk level: Low

Your answers do not currently show emergency danger signs. You can try the following steps:

1. Take small sips of water often.
2. Eat small, light meals instead of a large meal.
3. Avoid strong smells, oily food, or foods that trigger nausea.
4. Rest in a quiet place.
5. Monitor your headache.

Contact a health worker urgently if your headache becomes severe, does not go away, your vision becomes blurry, your face or hands swell, you vomit repeatedly, cannot keep water down, feel faint, or develop fever.

MatriSense does not diagnose disease. It gives guideline-grounded safety guidance.
```

Example high-risk output:

```text
Risk level: High

Your symptoms may be risky because headache with blurred vision and swelling during pregnancy can be warning signs.

What to do now:
1. Contact your health worker or nearest clinic urgently.
2. Do not wait for the symptoms to go away by themselves.
3. Keep a family member with you.
4. Keep your emergency contact ready.

MatriSense does not diagnose disease. It helps identify urgent warning signs and supports faster referral.
```

---

## 9.6 RAG techniques to truthfully claim for preliminary round

For the preliminary round, implement:

```text
1. Curated maternal health knowledge cards
2. Vector search over guideline chunks or knowledge cards
3. Metadata filtering by symptom, riskLevelAllowed, guidanceType, and evidenceTag
4. Hybrid keyword + vector retrieval
5. Simple reranking by matched rule and evidence tag
6. Source-backed Bangla output generation
7. Safety validator after generation
```

If implemented, we can select or mention:

```text
Naive RAG
Vector Database
Contextual RAG
Variable / Semantic Chunking
Knowledge Graph / Other Graph Methods
Hybrid Search
Rerankers
Query Rewriting / HyDE
```

However, avoid claiming full GraphRAG if we only implement graph-style metadata. The honest phrasing should be:

```text
The preliminary prototype uses rule-aware vector RAG with graph-style metadata linking symptoms, danger signs, risk levels, allowed guidance types, actions, and evidence sources. Full GraphRAG and agentic retrieval are planned for the final BuildFest version.
```

---

## 9.7 RAG implementation plan

### RAG v1: Minimum build

```text
- Store 20–30 maternal health knowledge cards in JSON or MongoDB
- Each card has symptoms, riskLevelAllowed, guidanceType, steps, escalationTriggers, source, and doNotSay fields
- Rule engine outputs evidenceTags and allowedGuidanceType
- Retriever fetches matching cards by evidenceTags + symptom metadata
- LLM generates Bangla output only from retrieved cards
- Safety validator blocks unsupported advice
```

### RAG v2: Stronger preli version

```text
- Add vector embeddings for guideline chunks or knowledge cards
- Use Supabase pgvector or MongoDB Atlas Vector Search
- Add hybrid keyword + vector search
- Add reranking by matched rule and risk level
- Add query rewriting from structured case state
```

### RAG v3: Final-round expansion

```text
- Add graph-style relations:
  symptom → danger sign → risk level → allowed guidance type → action → evidence source
- Add agentic retrieval that checks whether retrieved guidance matches the rule-engine decision
- Add RAG evaluation using synthetic test cases and retrieval accuracy checks
```

---

## 9.8 Best submission wording for RAG

Use this in the RAG/AI detail field:

```text
MatriSense uses rule-aware RAG for patient-safe maternal care guidance. The rule engine first determines risk level, matched danger-sign rules, and allowed guidance type. The RAG layer then retrieves trusted maternal health guidance cards filtered by symptoms, riskLevelAllowed, guidanceType, and evidence tags. Retrieved cards contain source-backed immediate steps, monitoring points, escalation triggers, and prohibited advice. The LLM generates Bangla patient guidance only from the fixed rule-engine decision and retrieved cards, and a safety validator blocks diagnosis, medicine dosage, false reassurance, and any contradiction with the risk level. This makes the patient output more useful than a simple triage label while preserving ethical safeguards and human-in-the-loop escalation.
```

# 10. Open-source tools to mention

Mention:

```text
React
Tailwind CSS
Node.js
Express.js
MongoDB / Mongoose
json-rules-engine
LangChain or LlamaIndex, if used for RAG ingestion/retrieval
Supabase pgvector or MongoDB Atlas Vector Search
Optional BM25/fuse.js-style keyword retrieval for hybrid search
Recharts
Zod
Whisper / Web Speech API, if voice is included
```

If you do not use LangChain/LlamaIndex, do not claim them. But if RAG scoring matters, using **LlamaIndex** or **LangChain** for even a small RAG pipeline can help your AI-depth explanation.

My recommendation:

```text
Use LlamaIndex or LangChain only for RAG ingestion/retrieval and care-card retrieval orchestration.
Use json-rules-engine separately for clinical triage.
```

---

# 11. Agent Frameworks & Orchestration

The form asks about multi-agent setups, tool calling, planners, schedulers, LangGraph, CrewAI, AutoGen, or custom orchestration.

For preliminary, do not build a complex agent system. But you can build a **custom AI orchestrator**:

```text
AI Orchestrator:
1. Symptom Extractor Agent
2. Follow-up Question Agent
3. Rule-aware RAG Retriever
4. Care Guidance Generator
5. Safety Reviewer
```

This can be simple backend functions, but described as controlled agents.

Use this wording:

```text
We used a lightweight custom agent orchestration pattern rather than an uncontrolled autonomous agent. Each AI step has a fixed role: symptom extraction, follow-up question generation, rule-aware evidence/care-card retrieval, patient guidance generation, and safety validation. The orchestrator passes structured outputs between steps and prevents the LLM from changing the rule-engine risk decision.
```

This is safe and strong.

---

# 12. Evaluation & Quality Measurement

The form asks how AI output quality is measured, including LLM-as-judge, human evaluation, RAGAS, custom benchmarks, and regression sets.

For preli, build a small test set.

Mention:

```text
We created 25–30 synthetic maternal triage test cases covering low, medium, and high-risk scenarios. Each test case has expected symptom extraction, expected matched rule, expected risk level, expected action, expected allowed guidance type, and expected evidence/care cards. We manually review high-risk cases to ensure danger signs are never downgraded. We also test RAG retrieval by checking whether retrieved guidance matches the triggered rule, risk level, and allowed guidance type. Low-risk cases should retrieve self-care plus warning-sign cards; high-risk cases should retrieve urgent escalation cards only.
```

This is realistic.

---

# 13. Guardrails, Safety & Privacy

Mention:

```text
- No diagnosis
- No medicine dosage
- No risk downgrade
- No unsupported care steps outside retrieved RAG cards
- Risk-level-aware advice gating
- Output safety validator
- Bangla fallback templates
- PII minimization
- Synthetic data for demo
- Role-based health worker access
- Audit logs for triage decisions
```

This is critical for HealthTech.

---

# 14. Frontend AI / Visual App Builders

The form gives points for tools like Lovable, v0, Bolt, Cursor Composer, Claude Artifacts, Gemini Canvas, ChatGPT Canvas, Windsurf, Replit Agent, etc.

Be honest. If you use Cursor or ChatGPT Canvas for UI/code planning, mention:

```text
Cursor Composer / Agent
ChatGPT Canvas
v0 if used for UI component generation
```

Do not select tools you did not use.

---

# 15. Workflow Automation

You can mention:

```text
LangGraph, if used for AI workflow orchestration
n8n, only if actually used for notifications or scheduled follow-up reminders
```

For preli, I would skip n8n unless one teammate can add it quickly.

---

# 16. Local / On-device LLMs

This section gives points for Ollama and local models.

For 8–9 days, this is optional. But if you can run one local model, it may help.

Possible safe claim if implemented:

```text
We tested a local Qwen/Llama model through Ollama for offline feasibility and privacy-sensitive health-worker summarization experiments. The production preli demo uses cloud LLM API for reliability, while local LLM support is part of the offline roadmap.
```

Only say this if you actually run it.

---

# 17. /docs module

The form strongly recommends a live `/docs` page that acts as a pitch deck, technical whitepaper, and system dashboard for evaluators.

I think we should build this.

It does not need to be complicated. Add:

```text
/docs
```

Page sections:

```text
1. Problem
2. Solution flow
3. System architecture
4. AI pipeline
5. Rule-aware RAG and care-guidance design
6. Rule engine design
7. Safety guardrails
8. Data lifecycle
9. Demo credentials
10. Team
```

This will help the submission and demo a lot.

---

# 18. What we should actually build before submission

Minimum technical build:

```text
1. Mother profile form
2. Bangla symptom input
3. LLM symptom extraction
4. Confirmation screen
5. 2–3 follow-up questions
6. json-rules-engine risk decision
7. Rule-aware RAG evidence/care-card retrieval
8. Source-grounded Bangla care-guidance generation
9. Safety validator
10. Health worker dashboard
11. Case detail page
12. Referral note/status update
13. /docs page
```

This gives you strong answers for almost every form section.

---

# 19. What not to overclaim

Do not claim:

```text
- clinically validated diagnosis
- real patient data
- medicine recommendation
- full offline system if not built
- full GraphRAG if only graph-style metadata retrieval exists
- model fine-tuning if not done
- real-time health worker notification if not implemented
```

Say instead:

```text
- conservative triage support
- simulated testing
- synthetic demo data
- guideline-grounded retrieval and care guidance
- human-in-the-loop review
- planned final-stage expansion
```

This keeps you safe.

---

# 20. My verdict on submission strategy

For the pre-li round, we should fill the form as an **AI-native system**, not just an app.

Use this core technical identity:

```text
MatriSense = React maternal health UI
+ Node/Express backend
+ MongoDB maternal case records
+ LLM Bangla symptom extraction
+ json-rules-engine clinical safety layer
+ rule-aware RAG over WHO/DGHS/NHS/CDC maternal guidance
+ source-grounded care-guidance cards
+ graph-style symptom-risk-action-evidence metadata
+ health worker dashboard
+ safety validator
+ /docs technical page
```

And for RAG, our best next discussion should be:

```text
How much RAG can we actually implement in 8–9 days while still truthfully claiming:
- vector RAG
- hybrid search
- contextual chunking
- reranking
- graph-style metadata
- rule-aware care-card retrieval
- maybe agentic retrieval
```

That RAG design is probably where you can gain extra points without making the medical logic unsafe.