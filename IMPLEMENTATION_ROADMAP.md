# MatriSense 7-Day MVP Implementation Roadmap

**Event Deadline:** May 15, 2026 (Preliminary submission)  
**BuildFest Date:** June 12, 2026

---

## Overview

This roadmap divides MatriSense development into **7 days** across **3 team members**, with specific daily milestones for a complete, demoable vertical slice:

```
Mother profile → Bangla symptom input → AI extraction → confirmation 
→ follow-up questions → rule-based triage → RAG care guidance 
→ Bangla result → health worker dashboard
```

---

## Team Roles

### **Person 1: AI & Rule Engine Lead** 🧠
- **Focus:** Symptom extraction, triage logic, RAG, safety validation
- **Ownership:** `/backend/src/prompts`, `/backend/src/triage`, `/backend/src/rag`, `/backend/src/safety`

### **Person 2: Backend & Database Lead** 🔧
- **Focus:** Express API, MongoDB schemas, route implementation, integration
- **Ownership:** `/backend/src/routes`, `/backend/src/models`, `/backend/src/services`, `/backend/src/middleware`

### **Person 3: Frontend & UX Lead** 🎨
- **Focus:** React pages, Bangla UI, dashboard, demo storytelling
- **Ownership:** `/frontend/app/pages`, `/frontend/app/components`, `/frontend/app/api`

---

## Day 1: Architecture & Setup (May 6)

### All Team Members
- ✅ **DONE:** Finalize MVP scope (no auth, no voice input, no real SMS)
- ✅ **DONE:** Create folder structure
- [ ] **TODO:** Set up environment files (.env)
- [ ] **TODO:** Install dependencies (Mongoose, json-rules-engine, TailwindCSS)
- [ ] **TODO:** Connect MongoDB Atlas to backend
- [ ] **TODO:** Test backend health endpoints

### Person 1 (AI Lead)
- [ ] Define normalized symptom code list (13–15 codes)
- [ ] Draft extraction prompt template with JSON schema
- [ ] Draft 5–6 follow-up question templates
- [ ] Draft danger sign checks and risk modifiers
- [ ] Create test case file (5 synthetic cases)

### Person 2 (Backend Lead)
- [ ] Set up MongoDB connection string
- [ ] Create Mongoose models (Patient, TriageSession, ReferralNote, AuditLog)
- [ ] Implement basic error handler middleware
- [ ] Set up Express request validation middleware

### Person 3 (Frontend Lead)
- [ ] Set up Next.js routing structure
- [ ] Create Tailwind CSS theme for Bangla typography
- [ ] Build layout wrapper with Bangla support
- [ ] Create mock data for testing

---

## Day 2: Core Backend APIs (May 7)

### Person 2 (Backend Lead) — PRIMARY
- [ ] Implement `/api/patients` routes (POST, GET, PUT)
- [ ] Implement `/api/triage/start` route
- [ ] Implement `/api/triage/:sessionId/confirm` route
- [ ] Implement `/api/triage/:sessionId/follow-up` route
- [ ] Test all routes with Postman/curl

### Person 1 (AI Lead) — SUPPORTING
- [ ] Finalize extraction prompt with examples
- [ ] Prepare json-rules-engine rule set (start with 5 rules)
- [ ] Prepare RAG knowledge cards (start with 10 cards)

### Person 3 (Frontend Lead) — SUPPORTING
- [ ] Build Mother profile form component
- [ ] Build Bangla symptom textarea component
- [ ] Create API client files (patientApi.js, triageApi.js)

---

## Day 3: AI & Triage Logic (May 8)

### Person 1 (AI Lead) — PRIMARY
- [ ] Implement LLM extraction service (use Claude/Gemini API)
- [ ] Test extraction with 5 synthetic cases
- [ ] Implement json-rules-engine rule runner
- [ ] Test triage logic with synthetic cases
- [ ] Draft safety validator (check for diagnosis/medicine attempts)
- [ ] Create 20+ RAG knowledge cards (map to symptoms + risk levels)

### Person 2 (Backend Lead) — SUPPORTING
- [ ] Create AI services integration layer
- [ ] Implement caseStateBuilder service
- [ ] Test LLM integration

### Person 3 (Frontend Lead) — SUPPORTING
- [ ] Build symptom confirmation page
- [ ] Build follow-up question UI card component

---

## Day 4: Triage Pipeline Integration (May 9)

### Person 1 (AI Lead) — PRIMARY
- [ ] Implement rule-aware RAG retriever
- [ ] Draft Bangla explanation prompt
- [ ] Draft health-worker summary prompt
- [ ] Create 30+ synthetic test cases

### Person 2 (Backend Lead) — PRIMARY
- [ ] Implement `/api/triage/:sessionId/answers` route
- [ ] Implement `/api/triage/:sessionId/run` route (run full pipeline)
- [ ] Implement `/api/triage/:sessionId/result` route
- [ ] Wire up AI extraction → confirmation → follow-up → triage → RAG → result
- [ ] Test full end-to-end flow with synthetic data

### Person 3 (Frontend Lead) — SUPPORTING
- [ ] Build result page with risk card + care guidance
- [ ] Connect form pages to backend APIs

---

## Day 5: Health Worker Dashboard (May 10)

### Person 2 (Backend Lead) — PRIMARY
- [ ] Implement `/api/worker/cases` route (list all cases)
- [ ] Implement `/api/worker/cases/:sessionId` route (case detail)
- [ ] Implement referral note routes
- [ ] Add audit logging

### Person 3 (Frontend Lead) — PRIMARY
- [ ] Build health worker dashboard page (case list, priority labels)
- [ ] Build case detail page (show matched rules, evidence, patient guidance)
- [ ] Build referral note form
- [ ] Implement data filtering and sorting

### Person 1 (AI Lead) — SUPPORTING
- [ ] Review all prompts for safety and clarity
- [ ] Prepare final test case suite (30 cases)

---

## Day 6: Demo Polish & Testing (May 11)

### Person 3 (Frontend Lead) — PRIMARY
- [ ] Polish all pages for demo flow
- [ ] Add smooth transitions and Bangla error messages
- [ ] Implement loading states
- [ ] Test full mother→result→worker flow
- [ ] Deploy frontend to Vercel

### Person 2 (Backend Lead) — PRIMARY
- [ ] Fix any API bugs
- [ ] Add comprehensive error messages
- [ ] Deploy backend to Render/Railway
- [ ] Test with live frontend

### Person 1 (AI Lead) — PRIMARY
- [ ] Validate triage logic with all 30 test cases
- [ ] Ensure all outputs are accurate and safe
- [ ] Prepare AI depth documentation
- [ ] Document all prompts and their versions

---

## Day 7: Documentation & Submission Prep (May 12–15)

### Person 3 (Frontend Lead) — PRIMARY
- [ ] Create `/docs` page explaining system architecture
- [ ] Add demo walkthrough
- [ ] Prepare 3-minute video pitch script
- [ ] Record demo video
- [ ] Test app from landing page to referral note

### Person 2 (Backend Lead) — SUPPORTING
- [ ] Prepare API documentation (endpoints, payloads, responses)
- [ ] Create data flow diagram
- [ ] Document database schema

### Person 1 (AI Lead) — PRIMARY
- [ ] Write AI depth section for submission
- [ ] Document all prompts, models used, token optimization
- [ ] Write responsible AI & safety safeguards section
- [ ] Document RAG implementation and knowledge sources

### All Team Members
- [ ] Finalize project README
- [ ] Fill submission form fields:
  - Project Name, Elevator Pitch, Problem Statement, Solution Description
  - Data Lifecycle (synthetic data, WHO guidelines)
  - AI Usage (prompts, LLM, rules engine, RAG)
  - Build Provenance (honest about AI assistance)
  - Links: GitHub, Vercel, Render, demo video, docs page

---

## Daily Standups

**Time:** 9 AM (quick 15 min standup)

**Each person shares:**
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

---

## MVP Success Criteria

By **May 15**, the system should:

✅ **Complete vertical slice:**
- Mother enters profile in Bangla
- Reports symptoms in Bangla
- AI extracts symptoms
- System confirms symptoms back to mother
- System asks 2–3 follow-up questions
- Rule engine calculates risk level (HIGH/MEDIUM/LOW)
- RAG retrieves matched care guidance
- LLM generates Bangla guidance
- Mother sees result page with urgency and care steps
- High-risk case appears in health worker dashboard
- Health worker can see case details and matched rules

✅ **Quality markers:**
- No hardcoded risks; logic is rule-based
- All outputs can be traced to rules or RAG evidence
- Safety validator prevents diagnosis/medicine advice
- Bangla UI is clear and usable
- System handles 30 synthetic test cases correctly
- Full demo flow works end-to-end
- No authentication required (role selection only)

✅ **Submission-ready:**
- Clean GitHub repo with clear folder structure
- Deployed frontend (Vercel) + backend (Render)
- /docs page explaining architecture and AI pipeline
- 3-minute demo video
- Complete submission form fields
- README with setup instructions

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| LLM API costs | Use claude-haiku or gpt-4-turbo; set token limits |
| Database sync issues | Test MongoDB connection early (Day 1) |
| Scope creep | Strict scope freeze on Day 1; no auth, no voice |
| Frontend routing complexity | Use simple React Router; keep pages flat |
| RAG retrieval slow | Pre-load cards as JSON; optimize prompts |
| Demo breaks before deadline | Test end-to-end daily; deploy early (Day 6) |

---

## Deliverables Checklist

### By May 15

**Backend:**
- ✅ Express server deployed on Render
- ✅ MongoDB Atlas connected
- ✅ All API routes implemented and tested
- ✅ LLM integration working
- ✅ Rule engine working
- ✅ RAG retriever working
- ✅ Audit logging in place

**Frontend:**
- ✅ All pages built and styled in Bangla
- ✅ All forms connected to backend APIs
- ✅ Dashboard showing high-risk cases
- ✅ Deployed on Vercel
- ✅ /docs page with architecture explanation

**AI & Safety:**
- ✅ 5–10 extraction prompts tested
- ✅ 10–15 triage rules validated
- ✅ 30+ RAG knowledge cards
- ✅ Safety validator preventing bad outputs
- ✅ 30 synthetic test cases passing

**Documentation:**
- ✅ GitHub repo clean and organized
- ✅ README with setup steps
- ✅ /docs page with architecture
- ✅ API docs
- ✅ Submission form filled
- ✅ 3-minute demo video

---

## Deployment Targets

- **Frontend:** Vercel (free tier)
- **Backend:** Render (free tier) or Railway
- **Database:** MongoDB Atlas (free tier, 512 MB)
- **LLM API:** Claude/GPT-4 (bring your own API key)

---

## Success Metrics for Judging

The judges will evaluate:

1. **Innovation (20%):** AI-native thinking, RAG, rule-based safety
2. **Technical Execution (20%):** Clean architecture, working demo
3. **Business Model (20%):** Clear problem, solution, scalability
4. **Real-World Impact (20%):** Bangla localization, maternal health relevance, ethical safeguards
5. **Scalability (10%):** Cloud-ready, modular design
6. **Presentation (10%):** Clear demo, storytelling, Bangla support

**This roadmap is designed to maximize points across all criteria.**

---

**Let's build! 🚀**
