# 🧑‍🤝‍🧑 Group Trip Planning Feature — Full Implementation Plan

> **Owner:** Prince  
> **Module:** Module D — Collaborative Groups  
> **Branch:** `prince-fs`  
> **Date:** February 22, 2026

---

## 1. Feature Overview

The Group Planning system lets a user **create a trip** (via the existing planner) and then **share it** for others to join. There are two ways to find and join a group trip:

1. **Public Discovery** — Browse the `/groups` page. Public trips appear as cards, searchable by destination and filterable by activity type, date, cost, etc.
2. **Private Link Sharing** — Every group trip generates a unique invite link (`/groups/join/abc123`) the organizer can copy and send directly to anyone.

All your group trips (ones you organize and ones you joined) live under the same `/groups` page behind a **"My Groups" tab**. Clicking any group trip card — from the discovery feed, your My Groups tab, or an invite link — takes you to the **Group Dashboard** (`/groups/[id]`), which is the single collaborative hub for that trip: member management, expense splitting, activity assignment, and the shared itinerary.

---

## 2. Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| **Database for group_trips** | **Supabase (PostgreSQL)** | Itineraries already live in Supabase. Foreign keys to `itineraries` table. Consistent with existing pattern. |
| **Database for expenses** | **Supabase (PostgreSQL)** | Relational data (who owes whom) is better in SQL with JOINs. |
| **Auth** | Existing JWT `authMiddleware` | Already works. `req.user.id` gives us the user ID. |
| **Invite codes** | `nanoid` (8-char alphanumeric) | Short, URL-safe, collision-resistant. No UUID needed. |
| **Real-time updates** | Supabase Realtime (later) | Can subscribe to `group_trips` changes. Not MVP — polling first. |

---

## 3. Database Schema

### Table: `group_trips` (NEW — Supabase)

```sql
CREATE TABLE IF NOT EXISTS public.group_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Info
  organizer_id VARCHAR NOT NULL,                          -- User who created the group trip
  itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
  title VARCHAR NOT NULL,                                 -- "Hiking in Bandarban"
  description TEXT,                                        -- Trip pitch / details
  cover_image VARCHAR,                                     -- URL to cover photo
  
  -- Trip Details
  destination_tags JSONB DEFAULT '[]',                    -- ["Cox's Bazar", "Saint Martin"] for search
  date_range_start DATE,
  date_range_end DATE,
  activity_type VARCHAR DEFAULT 'general',                -- hiking, relaxing, food, adventure, cultural
  
  -- Group Settings
  max_participants INTEGER DEFAULT 10,
  cost_per_person NUMERIC(10,2) DEFAULT 0,                -- 0 = free / TBD
  is_public BOOLEAN DEFAULT TRUE,                         -- visible on Find Trips page
  invite_code VARCHAR(12) UNIQUE NOT NULL,                -- nanoid for link sharing
  
  -- Status
  status VARCHAR DEFAULT 'open',                          -- open, full, in_progress, completed, cancelled
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_trips_organizer ON public.group_trips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_group_trips_status ON public.group_trips(status);
CREATE INDEX IF NOT EXISTS idx_group_trips_invite ON public.group_trips(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_trips_public ON public.group_trips(is_public, status);
CREATE INDEX IF NOT EXISTS idx_group_trips_destinations ON public.group_trips USING GIN (destination_tags);

-- RLS
ALTER TABLE public.group_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public group trips"
  ON public.group_trips FOR SELECT
  USING (is_public = TRUE OR organizer_id = auth.uid()::text);

CREATE POLICY "Organizers can manage their group trips"
  ON public.group_trips FOR ALL
  USING (organizer_id = auth.uid()::text);
```

### Table: `group_members` (NEW — Supabase)

```sql
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  
  -- Role & Status
  role VARCHAR DEFAULT 'member',                          -- organizer, admin, member, viewer
  status VARCHAR DEFAULT 'pending',                       -- pending, approved, rejected, left, invite_rejected
  
  -- Join Info
  joined_via VARCHAR DEFAULT 'discovery',                 -- invite_link (arrived via shared link), discovery (found on Discover page)
  
  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate memberships
  UNIQUE(group_trip_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);

-- RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their group memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Group data visible to members"
  ON public.group_members FOR SELECT
  USING (
    group_trip_id IN (
      SELECT id FROM public.group_trips WHERE organizer_id = auth.uid()::text
    )
  );
```

### Table: `group_expenses` (NEW — Supabase)

```sql
CREATE TABLE IF NOT EXISTS public.group_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  
  -- Expense Info
  paid_by VARCHAR NOT NULL,                               -- user_id of person who paid
  title VARCHAR NOT NULL,                                 -- "Dinner at Cox's Bazar"
  amount NUMERIC(10,2) NOT NULL,                          -- Total amount
  currency VARCHAR DEFAULT 'BDT',                         -- BDT, USD, etc.
  category VARCHAR DEFAULT 'other',                       -- food, transport, accommodation, tickets, other
  
  -- Split Info
  split_type VARCHAR DEFAULT 'equal',                     -- equal, custom, individual
  split_among JSONB DEFAULT '[]',                         -- user_ids involved in this expense
  custom_splits JSONB,                                    -- [{ user_id, amount }] for custom splits
  
  -- Receipt / Proof
  receipt_url VARCHAR,                                     -- Optional receipt image
  notes TEXT,
  
  -- Metadata
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_expenses_group ON public.group_expenses(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_payer ON public.group_expenses(paid_by);

-- RLS
ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;
```

### Table: `group_activities` (NEW — Supabase) — Activity Assignment

```sql
CREATE TABLE IF NOT EXISTS public.group_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  
  -- Activity Info
  title VARCHAR NOT NULL,                                 -- "Book hotel", "Arrange transport"
  description TEXT,
  assigned_to VARCHAR,                                    -- user_id (nullable = unassigned)
  
  -- Status
  status VARCHAR DEFAULT 'pending',                       -- pending, in_progress, completed
  due_date DATE,
  priority VARCHAR DEFAULT 'medium',                      -- low, medium, high
  
  -- Metadata
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_activities_group ON public.group_activities(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_assigned ON public.group_activities(assigned_to);
```

---

## 4. API Endpoints

### Group Trip CRUD — `/api/groups`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/groups/create` | ✅ | Create group trip from existing itinerary |
| `GET` | `/api/groups/discover` | ✅ | Browse public trips — supports `?destinations=&type=&cost=&open=` query params |
| `GET` | `/api/groups/mine` | ✅ | All groups user is part of (organising + joined + pending) — feeds My Groups tab |
| `GET` | `/api/groups/:id` | ✅ | Full group trip details (public preview for non-members, full data for members) |
| `PUT` | `/api/groups/:id` | ✅ | Update group trip (organizer only) |
| `DELETE` | `/api/groups/:id` | ✅ | Cancel/delete group trip (organizer only) |

### Join / Invite — `/api/groups`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/groups/:id/join` | ✅ | Join via Discover page — instant if auto-approve ON, pending otherwise. Always pending if user previously rejected an invite (`invite_rejected` status). Sets `joined_via = 'discovery'` |
| `GET` | `/api/groups/resolve/:inviteCode` | ✅ | Resolve invite code → returns `{ groupId }`. No join action. Used by `/groups/join/[code]` to redirect to `/groups/[id]?via=invite&code=XXX` |
| `POST` | `/api/groups/:id/join-invite` | ✅ | Join via invite link — **always instant** regardless of auto-approve setting. Sets `joined_via = 'invite_link'`, status = `approved` |
| `POST` | `/api/groups/:id/reject-invite` | ✅ | User declines the invite. Sets status = `invite_rejected`. Sends a notification to the organiser ("[username] declined your invitation"). |
| `POST` | `/api/groups/:id/approve/:userId` | ✅ | Organizer approves a pending member |
| `POST` | `/api/groups/:id/reject/:userId` | ✅ | Organizer rejects a pending/requesting member |
| `POST` | `/api/groups/:id/leave` | ✅ | Leave a group trip |
| `DELETE` | `/api/groups/:id/kick/:userId` | ✅ | Organizer removes a member |
| `GET` | `/api/groups/:id/members` | ✅ | List all members with roles/status |

### Expenses — `/api/groups/:id/expenses`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/groups/:id/expenses` | ✅ | Add an expense |
| `GET` | `/api/groups/:id/expenses` | ✅ | Get all expenses for group |
| `GET` | `/api/groups/:id/expenses/summary` | ✅ | Get "who owes who" calculation |
| `PUT` | `/api/groups/:id/expenses/:expenseId` | ✅ | Edit an expense |
| `DELETE` | `/api/groups/:id/expenses/:expenseId` | ✅ | Delete an expense |

### Activities — `/api/groups/:id/activities`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/groups/:id/activities` | ✅ | Create a task |
| `GET` | `/api/groups/:id/activities` | ✅ | Get all tasks |
| `PUT` | `/api/groups/:id/activities/:activityId` | ✅ | Update task (assign, status) |
| `DELETE` | `/api/groups/:id/activities/:activityId` | ✅ | Delete task |

---

## 5. Backend File Structure

```
server/src/
├── models/
│   └── GroupTrip.js              # Supabase CRUD for group_trips + group_members
├── services/
│   ├── groupService.js           # Business logic (join workflow, permissions)
│   └── expenseService.js         # Expense splitting calculator
├── routes/
│   └── groupRoutes.js            # All /api/groups/* endpoints
└── sql/
    └── group_trips_schema.sql    # All 4 tables above
```

---

## 6. Frontend Pages & Components

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| **Groups Hub** | `/groups` | Two tabs: **Discover** (browse public trips) and **My Groups** (trips you organize or joined) |
| **Group Dashboard** | `/groups/[id]` | Full collaborative hub — accessed by clicking any group trip card from anywhere, OR arriving from an invite link |
| **Invite Resolver** | `/groups/join/[code]` | No UI. Looks up the group ID from the invite code and redirects to `/groups/[id]`. The trip preview and Join button live there. |
| **Create Group** | `/groups/create` | Form to share an existing itinerary as a group trip |

> **Effectively 3 real pages.** `/groups/join/[code]` is a thin redirect resolver with no persistent UI. The trip preview is always on `/groups/[id]` — but when arriving via invite link (`?via=invite`), the preview shows two buttons (Join + Reject) instead of one, and joining is always instant. This keeps the URL space clean while preserving the invite-vs-discovery distinction in behaviour.

### New Components

```
client/odyssey/app/groups/
├── page.tsx                          # Groups Hub — Discover tab + My Groups tab
├── create/
│   └── page.tsx                      # Create Group Trip form
├── join/
│   └── [code]/
│       └── page.tsx                  # Redirect only — resolves invite code → /groups/[id]
└── [id]/
    ├── page.tsx                      # Group Dashboard — non-member preview OR full member hub
    └── components/
        ├── GroupTripCard.tsx          # Shared card — used on Discover AND My Groups tabs
        ├── GroupPublicPreview.tsx     # Non-member view: cover, info. Via invite link: Join + Reject Invite buttons (instant join). Via discovery: Join button (auto-approve setting applies)
        ├── GroupHeader.tsx            # Title, cover, dates, status badge, invite link
        ├── MembersList.tsx            # Members grid with roles, approve/reject
        ├── ExpenseTracker.tsx         # Add expense, full expense list
        ├── ExpenseSummary.tsx         # "Who owes who" settlement view
        ├── ActivityBoard.tsx          # Task list with assignment & status
        └── GroupItinerary.tsx         # Read-only shared itinerary view
```

---

## 7. Feature Details

### 7A. Groups Hub (`/groups`) — Two Tabs

This is a **single page** with two tabs that share the same card component (`GroupTripCard.tsx`) and the same filter bar.

```
┌──────────────────────────────────────────────────────┐
│  🌍 Group Trips                    [+ Create Trip]   │
│──────────────────────────────────────────────────────│
│  🔍 Search destinations...  [Activity ▾] [Date ▾] [Cost ▾] [Open only]  │
│──────────────────────────────────────────────────────│
│  [ Discover ]   [ My Groups ]                        │
└──────────────────────────────────────────────────────┘
```

**Discover Tab** — publicly listed group trips, filtered/searched. Anyone can see this.

**My Groups Tab** — requires login. Shows:
- Trips you **organise** (with a "Pending requests: 2" badge if approvals needed)
- Trips you **joined** (approved member)
- Trips you **requested** to join (pending approval — shown with a pending badge)

Both tabs render the same `GroupTripCard.tsx`. The card just adapts slightly based on context (organiser sees a manage button, member sees "View Trip", pending member sees "Pending").

**Search & Filters** (same for both tabs):
- **Search bar** — multi-destination search, e.g. "Cox's Bazar, Bandarban" (searches `destination_tags` JSONB column)
- **Activity Type:** All / Hiking / Relaxing / Food / Adventure / Cultural
- **Date Range:** This month / Next month / Custom picker
- **Cost:** Free / Under ৳1000 / Under ৳5000 / Any
- **Availability:** Open spots only toggle (Discover tab only)

**Card (`GroupTripCard.tsx`):**
```
┌──────────────────────────────────┐
│  [Cover Image]                   │
│──────────────────────────────────│
│  🏔️ Hiking in Bandarban          │
│  📅 Mar 15 – Mar 18              │
│  👥 4/10 joined  ████░░░░░░      │  ← member progress bar
│  💰 ৳2,500/person                │
│  🏷️ #hiking #adventure           │
│                                  │
│  Organized by @sadman            │
│  [View Details]  [Request Join]  │
└──────────────────────────────────┘
```

> Clicking **any card** from either tab navigates to `/groups/[id]` — the Group Dashboard.

### 7B. Create Group Trip (`/groups/create`)

**Flow:**
1. User selects one of their existing itineraries from a dropdown
2. Fills in group-specific fields:
   - Title (pre-filled from itinerary trip_name)
   - Description (pitch text)
   - Cover image (upload or URL)
   - Max participants (default 10)
   - Cost per person (0 = free)
   - Activity type dropdown
   - Public/Private toggle
3. On submit → creates `group_trips` row + adds organizer to `group_members` with role `organizer`
4. Returns to Group Dashboard with invite link ready to copy

### 7C. Invite Link Resolver (`/groups/join/[code]`)

This page has **no persistent UI**. It resolves the code and redirects immediately:

```
Page loads → GET /api/groups/resolve/:code → { groupId }
           → redirect to /groups/[groupId]?via=invite&code=ABC123
```

The `?via=invite&code=XXX` query params are passed forward so the Group Dashboard knows the user arrived via an invite link and should show invite-specific UI (see 7D below).

If the code is invalid or expired, show a simple inline error: "This invite link is no longer valid." No redirect.

### 7D. Group Dashboard (`/groups/[id]`)

This is **the** page for everything about a specific group trip. You get here by:
- Clicking a card on the Discover tab
- Clicking a card on your My Groups tab
- Following an invite link (the `/groups/join/[code]` resolver redirects here)
- Direct URL (bookmarkable, shareable)

**Non-members** see `GroupPublicPreview.tsx` — a rich trip preview with cover image, title, description, dates, activity type, member count progress bar, cost per person, and the itinerary overview.

The action buttons at the bottom differ depending on **how the user arrived**:

#### Arrived via invite link (`?via=invite` present in URL)

The link is a personal invite from the host. Two buttons are shown:

| Button | Action | Result |
|--------|--------|--------|
| **Join This Trip** | `POST /api/groups/:id/join-invite` | **Always instant** regardless of auto-approve. `status = approved`, `joined_via = invite_link`. Page refreshes into full dashboard. |
| **Reject Invitation** | `POST /api/groups/:id/reject-invite` | `status = invite_rejected`. Host receives a notification: "[username] declined your invitation." Button area changes to "Invitation Declined". |

> **Post-rejection re-join:** If the user later navigates back to this trip (via Discover or direct URL) and clicks Join, it **always goes to pending** — host confirmation required — even if auto-approve is ON. The backend detects the existing `invite_rejected` row and forces `status = pending`.

#### Arrived via card click (no `?via=invite`)

One button: **"Join This Trip"** — behavior depends on the organiser's setting:
- **Auto-approve ON** → instantly approved, `joined_via = discovery`, page refreshes into the full dashboard
- **Auto-approve OFF** → `status = pending`, `joined_via = discovery`, toast: "Request sent — the organiser will review your request", button changes to "Request Pending"

> The `code` query param from the invite URL is never used to trigger a join action — the resolver only uses it to find the group ID for the redirect.

**Approved members** see the full 5-tab dashboard:

**Tab-based layout (for members):**

```
[Overview]  [Members]  [Expenses]  [Tasks]  [Itinerary]
```

**Overview Tab:**
- Group header: cover image, title, dates, activity type badge, status badge (Open / Full / In Progress)
- Quick stats row: 👥 X members · 💰 Y expenses · ✅ Z/N tasks done
- **Invite link card** — copy button + QR code option
- Organizer's pending approvals notification (only visible to organizer): "2 people want to join" → [Go to Members]
- Map preview: destination markers + route (reuses `MapComponent.tsx`)
- Recent activity feed: "Anjim joined · Prince added ৳800 expense · Alfi completed task"

**Members Tab (`MembersList.tsx`):**
- Grid of member cards with avatar, name, role badge
- Organizer sees: [Approve] [Reject] buttons for pending members
- Organizer can promote member to admin or kick
- Each member shows their join date

**Expenses Tab (`ExpenseTracker.tsx` + `ExpenseSummary.tsx`):**
- "Add Expense" button → modal with:
  - Title, Amount, Category (food/transport/accommodation/tickets/other)
  - Paid by (dropdown of members)
  - Split type: Equal (among all) / Custom (pick amounts) / Individual (one person)
  - Optional receipt upload, notes
- Expense list with filters by category
- **"Who Owes Who" Summary:**
  ```
  ┌─────────────────────────────────────┐
  │  💰 Expense Summary                 │
  │─────────────────────────────────────│
  │  Total expenses: ৳12,500            │
  │  Per person (equal): ৳2,500         │
  │                                     │
  │  Settlements needed:                │
  │  • Anjim owes Prince ৳800          │
  │  • Didhiti owes Sadman ৳1,200      │
  │  • Alfi owes Prince ৳400           │
  │                                     │
  │  [Mark All Settled]                 │
  └─────────────────────────────────────┘
  ```

**Tasks Tab (`ActivityBoard.tsx`):**
- Simple kanban or list view: Pending / In Progress / Done
- Each task card has:
  - Title, description
  - Assigned to (dropdown of members)
  - Priority badge (low/medium/high)
  - Due date
  - Status toggle
- "Add Task" button → inline form

**Itinerary Tab (`GroupItinerary.tsx`):**
- Read-only view of the linked itinerary
- Shows day-by-day schedule pulled from `itineraries` table
- Members can see the full plan but only organizer/admin can edit (links to planner)

### 7E. Map Integration (Bonus)

On the Group Dashboard Overview tab, show a small map preview with:
- Markers for each destination in the itinerary
- Route polyline connecting them
- Reuse existing `MapComponent.tsx`

On the Find Trips page, optionally show a "Map View" toggle that displays all open group trips as markers on a map, clustered by destination.

---

## 8. Expense Splitting Algorithm

```
For each expense:
  1. If split_type = "equal":
     share = amount / count(split_among)
     Each person in split_among owes `share` to `paid_by`
  
  2. If split_type = "custom":
     Each person owes their custom_splits[].amount to `paid_by`
  
  3. If split_type = "individual":
     Only paid_by is involved (personal expense, just for tracking)

Aggregate all debts into a ledger:
  debts[debtor][creditor] += owed_amount

Simplify debts (net out mutual debts):
  If A owes B ৳500 and B owes A ৳200
  → Simplified: A owes B ৳300

Output: Array of { from, to, amount } settlements
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Day 1–2) — Backend Core
- [ ] Create `group_trips_schema.sql` with all 4 tables
- [ ] Run SQL in Supabase
- [ ] Create `GroupTrip.js` model (CRUD for group_trips + group_members)
- [ ] Create `groupService.js` (join workflow, permission checks)
- [ ] Create `groupRoutes.js` (CRUD + join/approve/reject/leave)
- [ ] Register routes in `server.js` as `/api/groups`
- [ ] Test all endpoints with Postman

### Phase 2: Discovery & Joining (Day 2–3) — Frontend Core
- [ ] Create `/groups` page (Find Trips) — card grid with search/filter
- [ ] Create `GroupTripCard.tsx` component
- [ ] Create `/groups/create` page — form to share itinerary
- [ ] Create `/groups/join/[code]` page — invite link landing
- [ ] Add "Share as Group Trip" button to existing planner/trip pages

### Phase 3: Group Dashboard (Day 3–4) — Collaboration Hub
- [ ] Create `/groups/[id]` page with tab layout
- [ ] Build `GroupHeader.tsx`, `InviteLinkCard.tsx`
- [ ] Build `MembersList.tsx` with approve/reject/kick
- [ ] Build `GroupItinerary.tsx` (read-only itinerary view)

### Phase 4: Expenses & Tasks (Day 4–5) — Utility Features
- [ ] Create `expenseService.js` (splitting algorithm + settlement calculation)
- [ ] Add expense endpoints to `groupRoutes.js`
- [ ] Build `ExpenseTracker.tsx` (add/list expenses)
- [ ] Build `ExpenseSummary.tsx` (who owes who)
- [ ] Build `ActivityBoard.tsx` (task assignment)
- [ ] Add activity endpoints to `groupRoutes.js`

### Phase 5: Polish & Integration (Day 5–6)
- [ ] Add map preview to Group Dashboard (reuse MapComponent)
- [ ] Add NavBar link to "Groups" / "Find Trips"
- [ ] Connect approved members to see itinerary in their planner
- [ ] Handle edge cases (full group, cancelled trip, organizer leaves)
- [ ] Mobile responsive design for all pages
- [ ] Loading states, error handling, empty states

---

## 10. Key Technical Notes

### Invite Code Generation
```javascript
const { nanoid } = require('nanoid');
const inviteCode = nanoid(8); // e.g., "V1StGXR8"
// URL: /groups/join/V1StGXR8
```

### Permission Middleware Pattern
```javascript
// Inside groupRoutes.js
const checkGroupRole = (allowedRoles) => async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const { data: member } = await supabase
    .from('group_members')
    .select('role, status')
    .eq('group_trip_id', id)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .single();
  
  if (!member || !allowedRoles.includes(member.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  req.groupRole = member.role;
  next();
};

// Usage:
router.post('/:id/approve/:userId', checkGroupRole(['organizer', 'admin']), ...)
```

### Shared Itinerary Access
When a member is approved, they can view the linked itinerary. We DON'T duplicate the itinerary — all members reference the same `itinerary_id`. The organizer's itinerary becomes the shared plan.

```javascript
// On the frontend planner/trip page, check if user has group access:
// 1. Direct ownership: itinerary.user_id === currentUser.id
// 2. Group membership: user is approved member of a group_trip linked to this itinerary
```

---

## 11. Defense-Ready Talking Points

For the academic presentation, emphasize these technical complexities:

1. **Multi-user Permission System** — Role-based access (organizer/admin/member/viewer) with middleware enforcement
2. **Invite System** — Two discovery paths (public feed + private links) with approval workflow
3. **Debt Simplification Algorithm** — Not just simple splitting but net-out mutual debts for minimal settlements
4. **Shared State Management** — Multiple users referencing a single itinerary without duplication
5. **Activity Assignment** — Kanban-style task management with ownership and deadlines
6. **Search with JSONB** — GIN-indexed destination tags for multi-destination search queries

---

## 12. Future Enhancements (Post-MVP)

- Real-time updates via Supabase Realtime subscriptions
- In-group chat (simple message thread)
- Voting on itinerary changes ("Should we add Teknaf?")
- Group trip completion celebration (confetti + shared summary)
- Export expense report as PDF
- Push notifications for join requests, approvals, new expenses
- Group trip templates ("Weekend Getaway", "Week-long Adventure")
