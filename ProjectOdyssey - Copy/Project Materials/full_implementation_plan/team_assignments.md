# Team Task Allocation (6 Members)

This document breaks down the remaining features into 6 distinct roles to maximize parallel efficiency for the upcoming Monday deadline.

## 🧑‍💻 Person 1: Search & Discovery Lead
**Focus:** The "Top of Funnel" experience - finding places.
*   **Search Page Logic:** Connect dummy search bar to backend `/api/places/search`.
*   **Place Details Modal:** Create the modal that opens when a country/city is clicked (showing photos, "prominent cities", "things to do").
*   **Destinations Page:** Implement the "Browse by Country" and auto-complete suggestions.
*   **Guest Limitations:** Implement the client-side check for 5-7 AI prompts for non-logged-in users.

## 🧑‍💻 Person 2: Planner Core Lead
**Focus:** The complex Itinerary Editor (Critical Path).
*   **Itinerary Repair:** Fix the broken drag-and-drop in `/planner`. Align functionality with `itinerary_example.tsx`.
*   **Collections Integration:** Implement the "Collections" tab in the right-hand panel where users can "park" places found by Person 1's Search before adding to a day.
*   **Date & Logic Guards:** Ensure items can only be added if a date range is selected. Implement the "one itinerary only" rule for guest users.

## 🧑‍💻 Person 3: Backend & Infrastructure Lead
**Focus:** API & Data integrity.
*   **API Development:** Build/Verify `tripRoutes.js`, `placeRoutes.js` to support the frontend needs.
*   **AI Integration:** Ensure the AI endpoints respect the "Guest Limit" (can be a simple token/cookie check for now).
*   **DB Management:** Ensure MongoDB/Postgres schemas handle the new "Visit Logs" and "Chat History" correctly.
*   **Map Data:** Assist Person 5 with backend storages for route data.

## 🧑‍💻 Person 4: Social & Engagement Lead
**Focus:** Community features.
*   **Co-Travellers Tab:** Implement the feed for sharing photos/likes/comments.
*   **Group Tours:** Create the interface for arranging/finding group tours (minimum group size logic).
*   **Review System:** Allow users to rate/review places they've added to their timeline.

## 🧑‍💻 Person 5: Real-Time & Location Lead
**Focus:** The "Delivery Style" tracking features.
*   **Trip Progress Card:** Build the publicly shareable "Tracking Card" component (e.g., "Arrived at X", "Heading to Y").
*   **Location Logic:** Implement the Geolocation tracking (as per `LOCATION_TRACKING_IMPLEMENTATION_PLAN.md`) to auto-complete itinerary items when a user is physically there.
*   **Map Visualization:** Update the Map view to show the route between points.

## 🧑‍💻 Person 6: UX, Profile & Mobile Lead
**Focus:** Polish, Gamification, and Mobile adaptation.
*   **Mobile Responsiveness:** Go through ALL pages (especially Planner and Search) and ensure they stack/display correctly on mobile screens (PWA readiness).
*   **Dynamic Profile:** Build the "Places I have been" graph/stats and "Levels/Badges" gamification.
*   **Hover Menu:** Update the profile icon hover menu in the Navbar to include "My Trips", "Saved Places", etc.
*   **Inclusion Requests:** Build the simple form for users to submit missing places.

---
## 🚀 Collaboration Strategy
*   **Person 1 & 2** need to agree on the data format for a "Place" object so Search results (P1) can be dropped into the Planner (P2).
*   **Person 5 & 6** should coordinate on the "Profile" – as Person 5 tracks the visits, Person 6 visualizes them on the profile graph.
