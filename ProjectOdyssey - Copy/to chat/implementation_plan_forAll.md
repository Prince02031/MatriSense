# Master Implementation Plan for Project Odyssey
**Target Deadline:** Next Monday
**Team Size:** 6 Developers

This document serves as the master guide for the team. Each member owns a specific domain to minimize merge conflicts and maximize parallel progress.

---

## 🏗️ Workflow & Merge Policy
*   **Branching:** Each person creates a branch named `feature/[role-name]-[feature]`.
*   **Common Components:** If you need a UI component (like a Button or Card), check `client/odyssey/components` first. If making a new one, announce it to avoid duplicates.
*   **Database:** Person 3 (Backend) owns the Schema. If you need a new field, request it from them.

---

## 🧑‍💻 Person 1: Search & Discovery Lead
**Objective:** Make the "Finding" experience live and rich.

### 1. "Live" Search Bar
*   **Files:** `client/odyssey/app/destinations/page.tsx`, `client/odyssey/components/SearchBar.tsx`
*   **Task:** Remove the `setTimeout` mock. Fetch results from `GET /api/places/search?q={query}`.
*   **Details:**
    *   Results must distinguish between **Countries** and **Cities** (e.g., "Japan" vs "Tokyo").
    *   Show "Trending" if query is empty.

### 2. Place Details Modal (The "District" View)
*   **Files:** `client/odyssey/components/PlaceDetailsModal.tsx` (NEW)
*   **Task:** Create a modal that opens when a user clicks a city/country.
*   **Content:**
    *   Brief AI-generated description.
    *   Photo Gallery (Carousel).
    *   "Prominent Cities/Districts" list (if viewing a Country).
    *   "Things to do" list (if viewing a City).
    *   **Action:** "Add to Collection" (Connects with Person 2's work).

### 3. Guest Limitations ("Million Dollar Button" fix)
*   **Files:** `client/odyssey/lib/usageLimit.ts` (NEW), `client/odyssey/app/page.tsx`
*   **Task:**
    *   Store a counter in `localStorage` (`guest_prompt_count`).
    *   Increment on every AI search.
    *   If `count > 7`, show a "Login to Continue" modal.
    *   Disable "Save Itinerary" button for guests.

---

## 🧑‍💻 Person 2: Planner Core Lead
**Objective:** Fix and enhance the Itinerary Editor.

### 1. Fix Drag-and-Drop
*   **Files:** `client/odyssey/app/planner/page.tsx`
*   **Task:** The current DnD is "broken". Ensure items can be dragged from the "Right Panel" -> "Day Columns".
*   **Reference:** code in `itinerary example/itinerary_example.tsx`.

### 2. "Collections" Tab
*   **Files:** `client/odyssey/app/planner/page.tsx` (Right Panel)
*   **Task:** Add a "Collections" tab next to "Chat" and "Maps".
*   **Logic:** This is a holding area. Users search places (using Person 1's search component) and add them here *before* assigning them to a specific day.
*   **Restriction:** Users cannot add to Collection unless a Main Itinerary (Date Range) is active.

### 3. Date & Logic Guards
*   **Files:** `client/odyssey/app/planner/CalendarSetup.tsx`
*   **Task:**
    *   Force user to select Start/End dates before seeing the planner grid.
    *   For Guests: "One Itinerary Only" (clears old one if they start over).

---

## 🧑‍💻 Person 3: Backend & Infrastructure Lead
**Objective:** Power the frontend with real data.

### 1. API Endpoints
*   **Files:** `server/src/routes/placeRoutes.js`, `server/src/routes/tripRoutes.js`
*   **Tasks:**
    *   `GET /api/places/search`: Implement fuzzy search (Postgres `ILIKE` or MongoDB regex).
    *   `GET /api/places/:id`: Return details + "things to do".
    *   `POST /api/trips`: Save full itinerary JSON (including "Collections").

### 2. Database Schema Checks
*   **Files:** `server/sql/` or `server/src/models/`
*   **Task:** Ensure the User model supports:
    *   `gamification_level` (Int)
    *   `badges` (Array<String>)
    *   `visited_places` (Array<PlaceID>)

### 3. AI Usage Enforcement
*   **Files:** `server/src/middleware/aiUsage.js` (NEW)
*   **Task:** If user is logged in, check their subscription/limit in DB. If guest, rely on Person 1's client-side check (or implement a basic IP-based rate limit).

---

## 🧑‍💻 Person 4: Social & Engagement Lead
**Objective:** Build the community and sharing features.

### 1. Co-Travellers Feed
*   **Files:** `client/odyssey/app/co-travellers/page.tsx` (NEW)
*   **Task:** A social feed layout.
*   **Features:**
    *   Post cards (User avatar, Photo, Caption, Location).
    *   Like/Comment buttons (can be UI-only for Monday if backend isn't ready).

### 2. Group Tours
*   **Files:** `client/odyssey/app/groups/page.tsx` (NEW)
*   **Task:** A listing page for "Join a Group".
*   **Features:** Filter by "Tour Type" (Solo friendly, Couples, Adventure). Display "Minimum Group Size" progress bar (e.g., "3/10 joined").

### 3. Inclusion Requests
*   **Files:** `client/odyssey/app/add-place/page.tsx` (NEW)
*   **Task:** Simple form: "Place Name", "Location", "Why it should be added", "Upload Photo".

---

## 🧑‍💻 Person 5: Real-Time & Location Lead
**Objective:** The "Delivery Style" tracking and Maps.

### 1. Trip Progress Card
*   **Files:** `client/odyssey/components/TripProgressCard.tsx` (NEW)
*   **Task:** A visual "Timeline" card.
*   **States:** "Packing" -> "At Airport" -> "In Air" -> "Arrived at [City]" -> "Exploring [Place]".
*   **Shareable:** Must generate a unique public link (e.g., `/track/[trip-id]`).

### 2. Geolocation Logic
*   **Files:** `client/odyssey/lib/locationService.ts`
*   **Task:**
    *   Use `navigator.geolocation.watchPosition`.
    *   Compare coordinates with Itinerary Places.
    *   If distance < 100m, trigger "Arrived" state on the Progress Card.

### 3. Map Visualization
*   **Files:** `client/odyssey/components/MapComponent.tsx`
*   **Task:** Draw polyline routes between itinerary stops. (See `Project Materials/google maps implementation.html` for reference).

---

## 🧑‍💻 Person 6: UX, Profile & Mobile Lead
**Objective:** Polish and "Wow" factor.

### 1. Mobile Responsiveness (Critical)
*   **Scope:** Entire App.
*   **Task:** Test `/planner`, `/destinations`, and `/dashboard` on mobile view.
*   **Fixes:** Stack columns, resize modals, ensure touch targets are large enough.

### 2. Dynamic Profile
*   **Files:** `client/odyssey/app/profile/page.tsx`
*   **Features:**
    *   "Travel Graph": A github-contribution style heat map or a line chart of trips per month.
    *   "Level": Display "Level 3 Explorer" with a progress bar.
    *   "Badges": Display icons for "Globe Trotter", "Foodie", etc.

### 3. Navigation Menu Update
*   **Files:** `client/odyssey/components/Navbar.tsx`
*   **Task:**
    *   Profile Icon Hover: Dropdown with "My Trips", "Saved Places", "Logout".
    *   Ensure "Destinations" is visible.

---

## 🔗 How to Continue
1.  **Person 3 (Backend)** starts first to define the data structure.
2.  **Person 1 & 2** agree on the "Place Object" JSON structure immediately.
3.  **Person 6** can start CSS/Mobile fixes immediately (independent).
4.  **Person 4 & 5** build their pages as independent modules, then link them in the Navbar.
