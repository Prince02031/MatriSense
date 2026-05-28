# MatriSense /docs Module - Quick Reference

## 🎯 What Was Built

A practical judge-facing documentation system with:
- **Public `/docs` page** — Full MatriSense documentation (18 sections)
- **Admin `/admin/docs` panel** — Toggle visibility, set schedule
- **Live stats** — Real-time database metrics
- **Backend config model** — MongoDB-backed DocsConfig
- **No CMS, no WYSIWYG** — Just clean, simple docs

---

## 📁 Files at a Glance

### Backend
```
backend/src/models/DocsConfig.js              ← MongoDB schema
backend/src/controllers/docs.controller.js    ← 3 endpoints
backend/src/routes/docs.routes.js            ← Route mounting
backend/src/index.js                          ← +docs route, +init config
```

### Frontend
```
frontend/app/api/docsApi.js                   ← API client (3 functions)
frontend/app/docs/docsContent.js              ← Static content (18 sections)
frontend/app/docs/page.jsx                    ← Public page (availability check)
frontend/app/admin/docs/page.jsx              ← Admin panel (toggle + schedule)
```

---

## 🔌 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/docs/status` | GET | ❌ None | Check if docs available + times |
| `/api/docs/stats` | GET | ❌ None | Get live DB stats (patients, sessions, etc.) |
| `/api/docs/admin/status` | PUT | ✅ Admin | Update docs config (public/schedule) |

---

## ⏰ Availability Logic

```javascript
isAvailableNow = (isPublic === true) AND (now >= availableFrom) AND (now <= availableUntil)

If isAvailableNow:
  → Show full docs with live stats

If NOT isAvailableNow:
  → Show professional "Documentation Not Available" message with scheduled times
```

**Default:**
- `isPublic: true`
- `availableFrom: June 10, 2026 00:00 UTC`
- `availableUntil: June 14, 2026 23:59 UTC`

---

## 📄 Content Sections (18 Total)

1. Hero Summary
2. YC-style Pitch (10 sub-sections)
3. Product Overview (4 sides)
4. Feature Matrix (implemented/in-progress/planned)
5. Architecture (4 layers)
6. Data Flow (13 steps)
7. AI Layer (5 components)
8. RAG Strategy (4 approaches)
9. Safety Guardrails (6 rules)
10. Privacy & Data Protection (6 topics)
11. Regional Referral & Hospital Assignment (6 topics)
12. API Summary (7 groups, 20+ endpoints)
13. Data Model Summary (7 models)
14. Live System Snapshot (11 metrics)
15. Team (3+ members with card layout)
16. Roadmap (short/mid/long term)
17. Changelog (version history)
18. Judge Demo Guide (12 steps)

---

## 🛡️ Access Control

### Public `/docs`
- ❌ No authentication required
- ✅ Time-based availability (isPublic + schedule)
- ✅ Graceful degradation (shows "Not Available" if outside window)

### Admin `/admin/docs`
- ✅ Requires `authToken` in localStorage
- ✅ Requires `userRole === 'admin'` in localStorage
- ✅ Shows "Access Denied" otherwise

---

## 🔍 Live Stats Metrics

- `totalPatients` — Count of Patient docs
- `totalTriageSessions` — Count of TriageSession docs
- `highRiskCases` — TriageSession with riskLevel=HIGH
- `mediumRiskCases` — TriageSession with riskLevel=MEDIUM
- `lowRiskCases` — TriageSession with riskLevel=LOW
- `pendingCases` — TriageSession with status in [started, in_progress]
- `resolvedCases` — TriageSession with status in [completed, referred]
- `referralNotes` — Count of ReferralNote docs
- `hospitals` — Count of Hospital docs (isActive=true)
- `healthWorkers` — Count of User docs with role=worker
- `activeWorkers` — Count of User docs with role=worker AND isActive=true

---

## 🧪 Quick Test Commands

```bash
# Check if docs available
curl http://localhost:5000/api/docs/status | jq '.isAvailableNow'

# Get live stats
curl http://localhost:5000/api/docs/stats | jq '.totalPatients'

# Update config (as admin)
curl -X PUT http://localhost:5000/api/docs/admin/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isPublic": false}'
```

---

## 🎨 UI Layout

### Public `/docs`
```
┌─────────────────────────────────────┐
│  Sticky Navigation (18 section tabs) │
├─────────────────────────────────────┤
│                                     │
│  Section Content (dynamic render)   │
│  - Cards, lists, stats, code blocks │
│  - Responsive grid (1-3 cols)       │
│  - Color-coded borders              │
│                                     │
├─────────────────────────────────────┤
│  Footer (copyright)                 │
└─────────────────────────────────────┘
```

### Admin `/admin/docs`
```
┌─────────────────────────────────────┐
│  Header: "Documentation Admin"       │
│  + Preview Link →                   │
├─────────────────────────────────────┤
│  Configuration Form:                │
│  ☐ Make Public (toggle)             │
│  📅 Available From (datetime)        │
│  📅 Available Until (datetime)       │
│  [Current Status Display]            │
│                                     │
│  💾 Save | 👁 Preview               │
├─────────────────────────────────────┤
│  💡 How It Works (info box)          │
└─────────────────────────────────────┘
```

---

## ✅ Key Features Delivered

✅ Public documentation page with 18 comprehensive sections  
✅ Admin panel with public/schedule toggle  
✅ Time-based availability (UTC timezone)  
✅ Live database stats (auto-calculated, no caching)  
✅ Team member profiles with card layout  
✅ Judge demo guide (12 clear steps)  
✅ Role-based access control (admin only)  
✅ Responsive design (mobile + desktop)  
✅ Error handling (graceful "Not Available" page)  
✅ Clean, professional UI (no enterprise bloat)  

---

## ❌ NOT Included (As Requested)

- No WYSIWYG editor
- No drag-drop reordering
- No PDF/Markdown export
- No versioning system
- No plugin system
- No WebSocket updates
- No CMS dependency
- No heavy animations

---

## 🚀 Getting Started

### For Judges
1. Visit `http://localhost:3000/docs` (if within schedule)
2. Browse 18 sections via sticky navigation tabs
3. Read comprehensive product, technical, and safety documentation
4. View live system stats
5. Follow judge demo guide (12 steps)

### For Admin
1. Log in as admin user
2. Visit `http://localhost:3000/admin/docs`
3. Toggle "Make Public" ON/OFF
4. Set availability start/end times
5. Click "Save Configuration"
6. Click "Preview Public Docs" to test visibility

---

## 📚 Documentation Location

Complete implementation guide: `DOCS_IMPLEMENTATION_GUIDE.md`  
Content source: `frontend/app/docs/docsContent.js`  
Backend config: `backend/src/models/DocsConfig.js`  

---

## 🎯 Summary

A **practical, zero-complexity** docs module that gives judges full visibility into MatriSense:
- What it is (Hero, Pitch, Product overview)
- How it works (Architecture, Data flow, AI pipeline)
- Why it's safe (Safety guardrails, privacy controls)
- What's built (Feature matrix, API summary)
- What's next (Roadmap)
- How to test it (Judge demo guide, live stats)

All with simple admin controls for scheduling & visibility.
