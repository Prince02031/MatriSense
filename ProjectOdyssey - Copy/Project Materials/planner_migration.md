# Merge Planner Features into Planner2

The `planner/page.tsx` is a 1908-line monolith with rich features. The `planner2/` directory has a cleaner, modular structure (page + 5 components). The goal is to bring all `planner` features into `planner2`'s modular architecture.

## Feature Inventory: What `planner` Has That `planner2` Lacks

| Feature | planner | planner2 |
|---|---|---|
| AI Chat (multi-stage: chat → clustering → options → confirmation) | ✅ | ❌ Basic only |
| Clustering view (ClusteringView component) | ✅ | ❌ |
| Multi-option itinerary selector (MultiOptionSelector) | ✅ | ❌ |
| Confirmation modal (ConfirmationModal) | ✅ | ❌ |
| Visit tracking tab (VisitTrackingPanel) | ✅ | ❌ |
| Geofencing / simulation mode | ✅ | ❌ |
| Guest chat persistence (localStorage + migration) | ✅ | ❌ |
| Collections with localStorage persistence | ✅ | ❌ |
| Saved itinerary display (day view with checkboxes) | ✅ | ❌ |
| Custom requirements for regeneration | ✅ | ❌ |
| Smart clustering request detection | ✅ | ❌ |
| Location modal (shared component) | ✅ | ✅ (imported) |
| Map with simulation controls overlay | ✅ | ❌ (basic map only) |

> [!IMPORTANT]
> This is a significant merge — `planner2/page.tsx` will grow from ~582 to ~1200+ lines. The UI components (`ResourcePanel`, `TimelineView`) will be enriched with new sub-views.

## Proposed Changes

### Page Logic & State

#### [MODIFY] [page.tsx](file:///Users/sadmanshaharier/Documents/ProjectOdyssey/client/odyssey/app/planner2/page.tsx)

Add all missing state, handlers, and logic from `planner`:

1. **New imports**: `ClusteringView`, `MultiOptionSelector`, `ConfirmationModal`, `VisitTrackingPanel`, `useGeofencing`
2. **New state variables**:
   - Clustering: `stage`, `clusteringData`, `clusteringLoading`, `selectedPlacesFromClustering`
   - Itinerary generation: `optionsLoading`, `itineraryOptions`, `selectedItinerary`, `confirmationOpen`, `customRequirements`, `requirementInput`
   - Saved itinerary: `savedItinerary`, `savedItineraryId`
   - Day tracking: `selectedDay`, `dayCheckboxes`
   - Visit: `visitCount`
   - Simulation: `isSimulating`, `simulationIndex`, `mockLocation`
   - Chat: `loading`, `chatHistoryLoading`
3. **New handlers**:
   - `handleSendMessage` — full AI chat with clustering detection (replaces current basic version)
   - `handleClusteringContinue` — Stage 1 → Stage 2
   - `handleGenerateItineraries` — Stage 2 generation
   - `handleConfirmItinerary` — save trip with full data
   - `handleEditAndRegenerate` — reset for re-generation
   - `handleAddRequirement` / `handleRemoveRequirement` — custom requirements
   - `handleAddToCollections` — with localStorage persistence
   - `handleViewDetails` — modal trigger
   - `startSimulation` / `stopSimulation` — simulation controls
4. **Enhanced effects**:
   - Load saved itinerary from backend on mount
   - Enhanced chat history loading with guest chat migration
   - Collections loaded from localStorage
   - Simulation interval effect
5. **Updated render**: Pass new props to `ResourcePanel`, add saved itinerary panel, add confirmation modal, add simulation controls on map view

---

### Resource Panel

#### [MODIFY] [ResourcePanel.tsx](file:///Users/sadmanshaharier/Documents/ProjectOdyssey/client/odyssey/app/planner2/components/ResourcePanel.tsx)

Enrich with:
1. **New tabs**: Add "Visits" tab alongside chat/destinations/summaries
2. **New props**: `stage`, `clusteringData`, `clusteringLoading`, `itineraryOptions`, `loading`, `chatHistoryLoading`, `onClusteringContinue`, `onClusteringCancel`, `onSelectItinerary`, `customRequirements`, `requirementInput`, `onRequirementInputChange`, `onAddRequirement`, `onRemoveRequirement`, `visitTrackingProps`, `onAddToCollections`
3. **Chat tab**: Show `ClusteringView` when `stage === "clustering"`, `MultiOptionSelector` when `stage === "options"`, custom requirements box when editing
4. **Visits tab**: Render `VisitTrackingPanel`

---

### Timeline / Main Panel

#### [MODIFY] [TimelineView.tsx](file:///Users/sadmanshaharier/Documents/ProjectOdyssey/client/odyssey/app/planner2/components/TimelineView.tsx)

No major changes needed — the saved itinerary display and simulation controls will be added directly in `page.tsx` alongside this component.

---

### Map Component

The map tab in `page.tsx` will be enhanced with simulation overlay controls (start/stop, progress indicator), matching the `planner` implementation.

## Verification Plan

### Build Check
Run `npm run dev` in `/Users/sadmanshaharier/Documents/ProjectOdyssey/client/odyssey` and verify no compile errors on `/planner2`.

### Browser Test
1. Navigate to `http://localhost:3000/planner2`
2. Verify the page loads without runtime errors
3. Verify chat panel renders with tabs (Chat, Destinations, Summaries)
4. Verify trip creation flow works
5. Verify the map tab renders

> [!NOTE]
> Since the AI/clustering/geofencing features depend on the backend (`localhost:4000`), those features can only be fully tested when the server is running. The primary goal is to ensure the code compiles and the page renders correctly.
