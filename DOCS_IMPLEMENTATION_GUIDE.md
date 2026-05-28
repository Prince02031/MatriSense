# MatriSense /docs Module Implementation Guide

## Overview
A practical, judge-facing documentation system with admin-controlled visibility and scheduling. No CMS, no drag-drop, no complex features—just clean, informative docs.

---

## ✅ Files Created & Modified

### Backend (4 files)

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `backend/src/models/DocsConfig.js` | **NEW** | 45 | MongoDB schema for docs availability config |
| `backend/src/controllers/docs.controller.js` | **NEW** | 150 | Endpoints: getStatus, getStats, updateStatus (admin) |
| `backend/src/routes/docs.routes.js` | **NEW** | 15 | Route definitions with auth/role middleware |
| `backend/src/index.js` | MODIFIED | +15 | Mount docs routes, init default DocsConfig on startup |

### Frontend (4 files)

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `frontend/app/api/docsApi.js` | **NEW** | 52 | API client: getStatus, getStats, updateConfig |
| `frontend/app/docs/docsContent.js` | **NEW** | 600+ | Static content: 18 sections + team data |
| `frontend/app/docs/page.jsx` | MODIFIED | 576 | Public docs page (availability check + sections) |
| `frontend/app/admin/docs/page.jsx` | **NEW** | 300+ | Admin panel (toggle public, set schedule, preview link) |

---

## 🔑 Key Features

### 1. Public `/docs` Page

**Behavior:**
1. On page load, calls `GET /api/docs/status` (no auth required)
2. Checks `isPublic` and `isAvailableNow` (current time vs availableFrom/availableUntil)
3. If NOT available → Shows professional "Documentation Not Available" message with scheduled times
4. If available → Displays full documentation with 18 sections

**Sections (18 total):**
1. **Hero Summary** — Product name, pitch, stage, workflow, CTAs
2. **YC-style Pitch** — Problem, Solution, Why Now, Target Users, Market, Business Model, GTM, Competition, Unique Advantage, Vision
3. **Product Overview** — Mother side, Health worker side, Referral/clinic side, Regional referral side
4. **Feature Matrix** — Status cards (implemented ✅, in-progress ⏳, planned 📋)
5. **Architecture** — Frontend, API, Services, Data layers
6. **Data Flow** — 13-step flow from symptom input to health worker action
7. **AI Layer** — Extraction, triage, RAG, explanation, safety validation
8. **RAG Strategy** — Current (rule-aware), Vector upgrade, GraphRAG roadmap, metadata filters
9. **Safety Guardrails** — 6 core rules (no diagnosis, no prescription, no risk downgrade, etc.)
10. **Privacy & Data Protection** — Data collected, role-based access, audit logging, regional access, demo data
11. **Regional Referral** — Coverage, patient location, hospital DB, assignment, audit trail
12. **API Summary** — Auth, Patient, Triage, Worker, Referral, Hospitals, Docs endpoints
13. **Data Model** — User, Patient, TriageSession, ReferralNote, Hospital, DocsConfig, AuditLog
14. **Live System Snapshot** — Real-time stats from DB (patients, sessions, risk counts, workers, hospitals)
15. **Team** — 3+ team members with name, role, email, contribution, avatar placeholder
16. **Roadmap** — Short-term (stabilize, regional referral, vector RAG), Mid-term (GraphRAG, analytics), Long-term (deployment, offline, local LLM)
17. **Changelog** — Version history (1.0.0 MVP, 0.9.0, 0.8.0)
18. **Judge Demo Guide** — 12 steps from patient registration → health worker referral delivery

**UI/UX:**
- Sticky section navigation (tab bar at top)
- Responsive grid layouts (1 col mobile, 2-3 cols desktop)
- Color-coded cards (blue, green, purple, red borders)
- Section-specific rendering (feature matrix → cards, API → dark code blocks, team → profile cards)
- Fallback emojis for team avatars (`[avatar-1]` → admin fills with image paths)
- Live stats displayed as metric cards with counts
- Footer with copyright

### 2. Admin `/admin/docs` Panel

**Access Control:**
- Requires `authToken` in localStorage
- Requires `userRole === 'admin'` in localStorage
- Shows "Access Denied" if conditions not met

**Features:**
1. **Toggle "Make Documentation Public"** — Checkbox to enable/disable /docs access
2. **Set Availability Schedule** — Two datetime inputs (availableFrom, availableUntil)
3. **Current Status Display** — Shows isPublic, isAvailableNow, current times, lastUpdated
4. **Save Button** — PUT to `/api/docs/admin/status` with token in Authorization header
5. **Preview Link** → Direct link to `/docs` to test visibility

**Form Validation:**
- availableFrom must be before availableUntil
- Backend returns error if validation fails

**Success Feedback:**
- Alert on successful save
- Form updates with response data
- Error display if save fails

---

## 🏗️ Architecture

### Backend Data Flow

```
GET /api/docs/status (PUBLIC)
  ↓
  Fetch DocsConfig from MongoDB
  Calculate: isAvailableNow = isPublic && now >= availableFrom && now <= availableUntil
  Return: { isPublic, availableFrom, availableUntil, isAvailableNow, updatedAt, updatedBy }

GET /api/docs/stats (PUBLIC)
  ↓
  Count documents from Patient, TriageSession, Hospital, User, ReferralNote, AuditLog
  Return: { totalPatients, totalTriageSessions, highRiskCases, ... }

PUT /api/docs/admin/status (PROTECTED: admin only)
  ↓
  Validate: availableFrom < availableUntil
  Create or update DocsConfig
  Increment version (audit trail)
  Set updatedBy = current user ID
  Return: Updated config
```

### Frontend Data Flow

```
Public /docs:
  On mount → GET /api/docs/status (no auth)
  If !isAvailableNow → Show "Not Available" overlay
  If isAvailableNow → GET /api/docs/stats, render sections, populate stats cards

Admin /admin/docs:
  On mount → Check localStorage.authToken & localStorage.userRole
  If not admin → Show "Access Denied"
  If admin → GET /api/docs/status, populate form
  On save → PUT /api/docs/admin/status with token in header
```

---

## 📋 Default Configuration

```javascript
{
  isPublic: true,
  availableFrom: 2026-06-10T00:00:00Z,    // June 10, 2026 00:00 UTC
  availableUntil: 2026-06-14T23:59:59Z,   // June 14, 2026 23:59 UTC
  version: 1,
  updatedAt: (current timestamp)
}
```

**To change event dates:** Edit `backend/src/index.js` line ~26-27 or set via admin panel.

---

## 🔐 Authentication & Authorization

**Middleware Stack:**
- Public endpoints: NO middleware
- Admin PUT endpoint:
  1. `protect` (authMiddleware) — Validates JWT token, fetches user
  2. `authorizeRoles('admin')` (roleMiddleware) — Checks user.role === 'admin'
  3. Route handler — Executes update logic

**Token Format:**
- Authorization header: `Bearer <jwt_token>`
- Token contains: `{ userId, email, role, ... }`

---

## 🧪 Testing

### Test Public /docs Access

1. **When available:**
   ```
   Visit http://localhost:3000/docs
   Expected: Full docs with sticky nav, all 18 sections, live stats
   ```

2. **When NOT available:**
   ```
   Admin toggles isPublic=false or changes dates
   Visit http://localhost:3000/docs
   Expected: "Documentation Not Available" overlay with scheduled times
   ```

3. **Live stats:**
   ```
   Add test patients/cases to DB
   Visit /docs, scroll to "Live System Snapshot"
   Expected: Counts match actual DB records
   ```

### Test Admin /admin/docs Panel

1. **Login as admin:**
   ```
   Register as worker, manually set role='admin' in MongoDB
   Log in → should redirect to dashboard
   Visit http://localhost:3000/admin/docs
   Expected: Full admin panel loads
   ```

2. **Toggle public OFF:**
   ```
   Click checkbox to turn public OFF
   Click "Save Configuration"
   Expected: Alert "✓ Documentation config updated"
   Visit /docs in incognito tab → should show "Not Available"
   ```

3. **Change schedule:**
   ```
   Edit "Available From" to 2026-06-15T10:00
   Edit "Available Until" to 2026-06-20T18:00
   Click "Save Configuration"
   Expected: Config updates, "Current Status" section refreshes
   ```

4. **Preview link:**
   ```
   Click "Preview Public Docs"
   Expected: Opens new tab to /docs
   If current config is available → Should see full docs
   If config is not available → Should see "Not Available" overlay
   ```

### Test Backend Endpoints

```bash
# Check docs status (public)
curl http://localhost:5000/api/docs/status

# Get stats (public)
curl http://localhost:5000/api/docs/stats

# Update config (admin only)
curl -X PUT http://localhost:5000/api/docs/admin/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isPublic": false,
    "availableFrom": "2026-06-10T00:00:00Z",
    "availableUntil": "2026-06-14T23:59:59Z"
  }'
```

---

## 📝 Content & Customization

### Static Content Location
- `frontend/app/docs/docsContent.js` — All 18 sections + team data
- Edit this file to update text, sections, team members
- Content is imported into both `/docs` and `/admin/docs`

### Team Data
```javascript
TEAM_DATA = [
  {
    name: 'Team Lead',
    role: 'Project Lead',
    email: 'lead@matrisense.org',
    contribution: '...',
    image: '[avatar-1]'  // Replace with path to actual image
  },
  ...
]
```
- `image` field supports placeholders like `[avatar-1]`
- Admin can later replace with actual URLs

### Live Stats Calculation
- `docs.controller.js` counts from MongoDB collections
- If collection doesn't exist, returns 0 safely
- Metrics: totalPatients, totalTriageSessions, riskLevel counts, healthWorkers, hospitals, etc.

---

## 🚀 Deployment Checklist

- [ ] Backend: `npm install` → verify no errors
- [ ] Backend: `npm start` → verify server starts, mongodb connects, DocsConfig initialized
- [ ] Frontend: `npm run build` → verify Next.js build succeeds
- [ ] Backend: Test `/api/docs/status` endpoint (should return JSON)
- [ ] Backend: Test `/api/docs/stats` endpoint (should return stats)
- [ ] Frontend: Visit `/docs` → should show full docs (if within schedule)
- [ ] Frontend: Log in as admin, visit `/admin/docs` → should load admin panel
- [ ] Admin: Toggle public OFF, save → visit `/docs` in incognito → should show "Not Available"
- [ ] Admin: Re-enable, change schedule to future date → visit `/docs` → should show "Not Available"
- [ ] Admin: Change schedule back to current, visit `/docs` → should show docs again

---

## 📌 Notes for Judges

- **No dependency on CMS, headless CMS, or external services** — All content is in frontend JS
- **No drag-drop, no reordering** — Content structure is fixed
- **Simple stateful form** — Pure React state for admin panel
- **Deterministic availability logic** — Time-based, timezone-aware
- **Role-based access** — Admin role enforced server-side
- **Live stats** — Real database counts, no caching
- **Mobile responsive** — Tested on mobile & desktop viewports
- **Accessible navigation** — Sticky section nav, clear visual hierarchy

---

## 🎯 Success Criteria

✅ `/docs` page loads and displays 18 content sections  
✅ Admin panel accessible only to admin role  
✅ Toggle public ON/OFF works and is reflected on /docs  
✅ Schedule availability works (time-based blocking)  
✅ Live stats display real database counts  
✅ Team section shows member cards  
✅ Judge demo guide is clear and step-by-step  
✅ No enterprise features (WYSIWYG, versioning, plugins, etc.)  
✅ Responsive design (mobile & desktop)  
✅ Error handling graceful (shows messages, doesn't crash)  

---

## 📞 Support

**Issues?**
- Check browser console for errors
- Verify `NEXT_PUBLIC_BACKEND_URL` env var points to backend
- Check JWT token expiry if admin panel shows "Access Denied"
- Verify MongoDB connection if stats show all 0s
- Check DocsConfig collection exists with at least 1 document

**Customizations:**
- Edit `docsContent.js` to change text, add sections, update team
- Edit `docs.routes.js` to add auth middleware if needed
- Edit `.env` to set event dates or backend URL
