# Context & Progress Report

## Summary of Recent Development (Phases 2-6)

We have successfully implemented the core functionalities for the "Trip Mode" and enhanced the "Planner" with AI-driven capabilities.

### Key Features Delivered:
1.  **AI Itinerary Generation (Phase 2 & 3):**
    *   Developed a "waterfall" strategy for place resolution: Collections -> Cache -> Google API. This optimizes costs and performance.
    *   Implemented `planner2` with a chat interface that understands context (user preferences, budget).
    *   Clustering logic to group places geographically for efficient days.

2.  **Interactive Planner UI (Phase 4):**
    *   Created `DayTabs`, `TimelineView`, and `ResourcePanel`.
    *   Implemented Drag-and-Drop functionality using `@dnd-kit` for rearranging itinerary items.
    *   Added visual cues for "Meal Breaks" and travel times.

3.  **Trip Mode & Execution (Phase 5):**
    *   Built `trip/page.tsx` as the "active mode" for travelers.
    *   Integrated **Geofencing** and **Visit Tracking**:
        *   `useGeofencing.ts`: Tracks user location relative to itinerary stops.
        *   `useVisitTracking.ts`: Manages Check-in/Check-out, visit duration, and status updates (Pending -> In Progress -> Completed).
    *   Added "Navigate" button to launch external maps (Google Maps/Apple Maps).

4.  **Robust Backend Support (Phase 6):**
    *   `visitRoutes.js` & `visitTracker.js`: Handle the state machine for visits.
    *   `geofenceService.js`: logic checking distance and triggering auto-actions.
    *   `VisitLog` model: Stores detailed history including entry/exit times and location data.

### Next Steps:
*   Refine the "Simulation Mode" for easier demos.
*   Enhance "Memory" to use past trip ratings for future recommendations.

---

# Codebase Context

## Client: Planner 2 (Main Page)
File: `client/odyssey/app/planner2/page.tsx`

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { format, addDays, parseISO, isValid } from 'date-fns';
import { MapIcon, List, Sparkles, Menu } from 'lucide-react';

import Link from 'next/link';

// Components
import ItinerarySidebar from './components/ItinerarySidebar';
import TimelineView from './components/TimelineView';
import ResourcePanel from './components/ResourcePanel';
import DayTabs from './components/DayTabs';
import ItinerarySetup from './components/ItinerarySetup';
import ConfirmationModal from '../components/ConfirmationModal';
import LocationModal from '../components/LocationModal';
import MapComponent from '../components/MapComponent';

// Hooks
import { useVisitTracking } from '../hooks/useVisitTracking';
import { useGeofencing } from '../hooks/useGeofencing';

interface Trip {
  id: string;
  tripName: string;
  startDate: string;
  days: number;
  travelers: number;
  schedule: Record<number, ItineraryItem[]>;
  status: 'planning' | 'active' | 'completed';
}

interface ItineraryItem {
  id: string; // Unique ID for Drag & Drop
  placeId?: string; // Google Place ID (optional for manual items)
  name: string;
  time?: string;
  visitDurationMin?: number;
  category?: string;
  notes?: string;
  isBreak?: boolean;
  lat?: number;
  lng?: number;
  source?: 'ai' | 'manual' | 'db';
}

export default function PlannerPage() {
  // State: Core Trip Data
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const activeTrip = trips.find(t => t.id === activeTripId);

  // State: Navigation & UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'itinerary' | 'map'>('itinerary');
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'search' | 'saved' | 'tracking'>('chat');
  const [currentDay, setCurrentDay] = useState(1);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // State: AI & Chat
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string; cards?: any[]; itineraryPreview?: any }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'chat' | 'clustering' | 'options'>('chat');
  const [clusteringData, setClusteringData] = useState<any>(null);
  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [itineraryOptions, setItineraryOptions] = useState<any[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);

  // State: Custom Requirements (added to prompt)
  const [customRequirements, setCustomRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");

  // State: Drag & Drop
  const [activeDragItem, setActiveDragItem] = useState<ItineraryItem | null>(null);

  // State: Resources (Search/Collections)
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<any[]>([]);

  // State: Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // State: Visit Tracking & Simulation
  const [mockLocation, setMockLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);
  const [visitCount, setVisitCount] = useState(0);

  // State: Misc
  const [destinationsView, setDestinationsView] = useState<'grid' | 'map'>('grid');

  // --- DND SENSORS ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- LOAD TRIPS ---
  useEffect(() => {
    fetchTrips();
    fetchCollections();
  },[]);

  // --- MOCK SIMULATION EFFECT ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating && activeTrip) {
      const allItems = Object.values(activeTrip.schedule).flat().filter(i => i.lat && i.lng && !i.isBreak);
      if (simulationIndex < allItems.length - 1) {
        timer = setTimeout(() => {
          const nextIndex = simulationIndex + 1;
          setSimulationIndex(nextIndex);
          const target = allItems[nextIndex];
          if (target && target.lat && target.lng) {
            setMockLocation({ lat: target.lat, lng: target.lng });
          }
        }, 3000); // travel to next point every 3 seconds
      } else {
        setIsSimulating(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isSimulating, simulationIndex, activeTrip]);

  // --- HELPERS ---
  const normalizeSchedule = (scheduleData: any, days: number): Record<number, ItineraryItem[]> => {
    // Ensure schedule is an object keyed by day number
    const normalized: Record<number, ItineraryItem[]> = {};
    for (let i = 1; i <= days; i++) {
        // If array (from AI usually), map index to day
        // If object, look for key
        if (Array.isArray(scheduleData)) {
            normalized[i] = scheduleData[i-1] ? (scheduleData[i-1].items || []) : [];
        } else if (scheduleData && typeof scheduleData === 'object') {
            normalized[i] = scheduleData[i] || [];
        } else {
            normalized[i] = [];
        }
    }
    return normalized;
  };

  const getDayItems = (schedule: Record<number, ItineraryItem[]>, day: number) => {
    return schedule[day] || [];
  };

  const calculateBudget = (items: ItineraryItem[]) => {
    // Placeholder logic
    return items.length * 50; 
  };

  const recalculateDayTimes = (items: ItineraryItem[], startTime = "09:00"): ItineraryItem[] => {
    let currentTime = parseISO(`2000-01-01T${startTime}`);
    
    return items.map(item => {
        const itemTime = format(currentTime, 'HH:mm');
        const duration = item.visitDurationMin || 60;
        currentTime = new Date(currentTime.getTime() + duration * 60000);
        return { ...item, time: itemTime };
    });
  };

  // --- API CALLS ---
  const fetchTrips = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("http://localhost:4000/api/trips", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Transform backend data to frontend Trip interface
        const loadedTrips: Trip[] = data.map((t: any) => ({
            id: t._id,
            tripName: t.destination || t.tripName || "Untitled Trip",
            startDate: t.startDate ? t.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
            days: t.days || 1,
            travelers: t.travelers || 1,
            status: t.status || 'planning',
            schedule: normalizeSchedule(t.itinerary?.schedule, t.days || 1)
        }));
        setTrips(loadedTrips);
        if (loadedTrips.length > 0 && !activeTripId) {
            setActiveTripId(loadedTrips[0].id);
        } else if (loadedTrips.length === 0) {
            setShowSetup(true);
        }
      }
    } catch (e) {
      console.error("Failed to load trips", e);
    }
  };

  const fetchCollections = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const res = await fetch("http://localhost:4000/api/user/saved-places", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setCollections(data.map((p: any) => ({
                ...p,
                id: p.placeId, // Ensure ID compatibility for DND
                source: "db"
            })));
        }
    } catch (e) { console.error("Failed to fetch collections", e); }
  };

  // --- EVENT HANDLERS ---

  const handleCreateTrip = async (details: any) => {
    // 1. Create trip on backend
    const token = localStorage.getItem("token");
    if (!token) return;
    
    // Optimistic UI update
    const newTrip: Trip = {
        id: `temp-${Date.now()}`,
        tripName: details.tripName,
        startDate: details.startDate,
        days: parseInt(details.days),
        travelers: parseInt(details.travelers),
        status: 'planning',
        schedule: normalizeSchedule({}, parseInt(details.days))
    };
    setTrips([...trips, newTrip]);
    setActiveTripId(newTrip.id);
    setShowSetup(false);

    try {
        const res = await fetch("http://localhost:4000/api/trips", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                destination: details.tripName,
                startDate: details.startDate,
                endDate: format(addDays(parseISO(details.startDate), parseInt(details.days)), 'yyyy-MM-dd'),
                budget: details.budget
            })
        });
        if (res.ok) {
            const saved = await res.json();
            // Replace temp ID with real ID
            setTrips(prev => prev.map(t => t.id === newTrip.id ? { ...t, id: saved._id } : t));
            setActiveTripId(saved._id);
        }
    } catch (err) {
        console.error("Failed to create trip", err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg = { role: 'user' as const, text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setLoading(true);

    try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:4000/api/ai/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                message: text,
                userContext: {
                    tripName: activeTrip?.tripName,
                    days: activeTrip?.days,
                    travelers: activeTrip?.travelers
                },
                selectedPlaces: collections // Pass current collections as context
            })
        });

        const data = await res.json();
        const aiMsg = { 
            role: 'ai' as const, 
            text: data.message, 
            cards: data.cards,
            itineraryPreview: data.itineraryPreview 
        };
        setChatMessages(prev => [...prev, aiMsg]);
        
        // If AI suggests locations, and user "Approves", they get added to collections (not automatic)
    } catch (err) {
        setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
        setLoading(false);
    }
  };

  const handleAddToCollections = (place: any) => {
    if (collections.some(c => c.placeId === place.placeId)) return;
    setCollections(prev => [...prev, { ...place, id: place.placeId, source: 'ai' }]);
    
    // Persist to backend
    const token = localStorage.getItem("token");
    if (token) {
        fetch("http://localhost:4000/api/user/saved-places", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ place })
        }).catch(err => console.error("Failed to save place", err));
    }
  };

  const handleRemoveFromCollections = (placeId: string) => {
    setCollections(prev => prev.filter(c => c.placeId !== placeId));
    // Remove from backend call omitted for brevity
  };

  // --- STAGE: CLUSTERING (Step 2) ---
  const handleGenerateItineraries = async () => {
    if (collections.length === 0) {
        alert("Please add some places to your collections first!");
        return;
    }
    
    setStage("clustering");
    setClusteringLoading(true);
    
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:4000/api/ai/cluster", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                 ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                locations: collections,
                days: activeTrip?.days || 3
            })
        });
        
        const data = await res.json();
        setClusteringData(data); // { clusters: [[place1, place2], [place3]], summary: "..." }
    } catch (err) {
        console.error("Clustering failed", err);
        setStage("chat"); // Revert
    } finally {
        setClusteringLoading(false);
    }
  };

  const handleClusteringContinue = async () => {
    // Proceed to Stage 3: Options Generation
    setStage("options");
    setOptionsLoading(true);

    try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:4000/api/ai/generateItineraries", {
            method: "POST",
             headers: {
                "Content-Type": "application/json",
                 ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                selectedPlaces: collections,
                tripDuration: activeTrip?.days || 3,
                userContext: {
                    travelers: activeTrip?.travelers
                },
                customRequirements: customRequirements.join(". ")
            })
        });
        
        const data = await res.json();
        if (data.success) {
            setItineraryOptions(data.data.itineraries); // [ { name: "Relaxed", schedule: ... }, ... ]
        }
    } catch (err) {
        console.error("Option generation failed", err);
    } finally {
        setOptionsLoading(false);
    }
  };

  const handleConfirmItinerary = async () => {
    if (!selectedItinerary || !activeTrip) return;

    // Merge AI schedule into active trip
    const newSchedule = normalizeSchedule(selectedItinerary.schedule, activeTrip.days);
    const updatedTrip = { ...activeTrip, schedule: newSchedule };
    
    setTrips(prev => prev.map(t => t.id === activeTrip.id ? updatedTrip : t));
    await saveTrip(updatedTrip);
    
    setStage("chat"); // Reset to chat flow (or tracking)
    setConfirmationOpen(false);
    setActiveMainTab("itinerary");
  };

  const handleEditAndRegenerate = (feedback: string) => {
    // Advanced: Send feedback to AI to regenerate options
    console.log("Regenerating with feedback:", feedback);
  };
  
  // savedItinerary logic for Visit Tracking
  const savedItinerary = activeTrip ? {
    _id: activeTrip.id,
    schedule: activeTrip.schedule // Format alignment needed?
  } : null;
  const savedItineraryId = activeTrip?.id || "";

  // Helper for item details
  const handleViewDetails = (item: any) => {
    setSelectedLocation(item);
    setLocationModalOpen(true);
  };

  // Custom Requirements
  const handleAddRequirement = () => {
    if (requirementInput.trim()) {
      setCustomRequirements(prev => [...prev, requirementInput.trim()]);
      setRequirementInput("");
    }
  };
  const handleRemoveRequirement = (index: number) => {
    setCustomRequirements(prev => prev.filter((_, i) => i !== index));
  };

  // --- HANDLER: Search ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`http://localhost:4000/api/data/places?search=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const places = (data.places || []).map((p: any) => ({
        id: p.place_id || p.id || `search-${Date.now()}-${Math.random()}`,
        name: p.name,
        placeId: p.google_place_id || p.place_id,
        category: p.category || p.type || 'Place',
        visitDurationMin: p.visit_duration_min || p.visitDurationMin || 60,
        description: p.description || '',
        images: p.images || (p.image_url ? [p.image_url] : []),
        lat: p.latitude || p.lat,
        lng: p.longitude || p.lng,
        source: 'db' as const,
      }));
      setSearchResults(places);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    }
  };

  // --- HANDLER: Add Meal Break ---
  const handleAddMealBreak = (day: number) => {
    if (!activeTrip) return;
    const breakItem: ItineraryItem = {
      id: `break-${Date.now()}-${Math.random()}`,
      name: 'Meal Break',
      category: 'Break',
      visitDurationMin: 60,
      isBreak: true,
      source: 'db',
    };
    const currentList = getDayItems(activeTrip.schedule, day);
    const newList = recalculateDayTimes([...currentList, breakItem]);
    const newSchedule = { ...activeTrip.schedule };
    newSchedule[day] = newList;
    updateTripSchedule(newSchedule);
  };

  // --- SIMULATION ---
  const startSimulation = () => {
    const allItems = activeTrip ? Object.values(activeTrip.schedule).flat() : [];
    if (allItems.length === 0) return;
    setIsSimulating(true);
    setSimulationIndex(-1);
  };
  const stopSimulation = () => {
    setIsSimulating(false);
    setMockLocation(undefined);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as any);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || !activeTrip) return;

    const activeData = active.data.current as any;
    const overData = over.data?.current as any;
    const overId = over.id as string;

    // Case 1: Dragging from Resource Panel to Timeline
    if (activeData?.type === "source-item") {
      // Dropped on the droppable zone OR on an existing timeline item
      if (overId.startsWith("timeline-day-")) {
        const targetDay = parseInt(overId.replace("timeline-day-", ""));
        addItemToSchedule(activeData, targetDay);
      } else if (overData?.type === "timeline-item") {
        // Dropped over an existing item in the timeline — add to current day
        addItemToSchedule(activeData, currentDay);
      }
      return;
    }

    // Case 2: Reordering within Timeline
    if (activeData?.type === "timeline-item") {
      const activeId = active.id;
      const daySchedule = getDayItems(activeTrip.schedule, currentDay);
      const oldIndex = daySchedule.findIndex(i => i.id === activeId);
      const newIndex = daySchedule.findIndex(i => i.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(daySchedule, oldIndex, newIndex);
        const newSchedule = { ...activeTrip.schedule };
        newSchedule[currentDay] = recalculateDayTimes(newOrder);
        updateTripSchedule(newSchedule);
      }
    }
  };

  const addItemToSchedule = (item: ItineraryItem, day: number) => {
    if (!activeTrip) return;
    // Schedule keys may be strings from backend — try both
    const currentList = getDayItems(activeTrip.schedule, day);
    const newItem = {
      ...item,
      id: `${item.id}-${Date.now()}`,
      visitDurationMin: item.visitDurationMin || 60,
      source: "db" as const
    };
    const newList = [...currentList, newItem];
    const recalculatedList = recalculateDayTimes(newList);
    const newSchedule = { ...activeTrip.schedule };
    newSchedule[day] = recalculatedList;
    updateTripSchedule(newSchedule);
  };

  const removeItemFromSchedule = (itemId: string, day: number) => {
    if (!activeTrip) return;
    const newSchedule = { ...activeTrip.schedule };
    const raw = newSchedule[day] ?? newSchedule[String(day) as any];
    const dayItems = Array.isArray(raw) ? raw : [];
    const filtered = dayItems.filter(i => i.id !== itemId);
    newSchedule[day] = recalculateDayTimes(filtered);
    updateTripSchedule(newSchedule);
  };

  const updateTripSchedule = (newSchedule: Record<number, ItineraryItem[]>) => {
    const updatedTrip = { ...activeTrip!, schedule: newSchedule };
    setTrips(trips.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    saveTrip(updatedTrip);
  };

  const handleAddItem = (time: string) => {
    const name = window.prompt("Enter activity name:", "New Activity");
    if (name) {
      addItemToSchedule({ id: `manual-${Date.now()}`, name, time, source: "db" }, currentDay);
    }
  };

  const saveTrip = async (trip: Trip) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`http://localhost:4000/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: trip.status,
          selectedItinerary: {
            title: trip.tripName,
            days: trip.days,
            travelers: trip.travelers,
            startDate: trip.startDate,
            schedule: trip.schedule
          }
        })
      });
      setUnsavedChanges(false);
    } catch (e) { console.error("Save failed", e); }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`http://localhost:4000/api/trips/${tripId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(prev => {
        const remaining = prev.filter(t => t.id !== tripId);
        if (activeTripId === tripId) {
          const next = remaining.find(t => t.status !== "completed");
          if (next) setActiveTripId(next.id);
          else { setActiveTripId(null); setShowSetup(true); }
        }
        return remaining;
      });
    } catch (e) { console.error("Delete failed", e); }
  };

  // --- RENDER ---

  if (showSetup) {
    return (
      <ItinerarySetup
        onCreate={handleCreateTrip}
        onCancel={trips.length > 0 ? () => setShowSetup(false) : undefined}
      />
    );
  }

  const allTripItems = activeTrip ? Object.values(activeTrip.schedule).flat() : [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden">

        {/* Sidebar */}
        {sidebarOpen ? (
          <ItinerarySidebar
            itineraries={trips}
            activeItineraryId={activeTripId}
            onSelectItinerary={setActiveTripId}
            onNewTrip={() => setShowSetup(true)}
            onDeleteTrip={handleDeleteTrip}
          />
        ) : (
          <div className="w-12 border-r border-gray-200 bg-white pt-4 flex flex-col items-center">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top Bar */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-20">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <div className="font-bold text-lg">{activeTrip?.tripName}</div>
              )}
              {/* View Switcher */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveMainTab("itinerary")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${activeMainTab === "itinerary" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"}`}
                >
                  <List size={16} /> Itinerary
                </button>
                <button
                  onClick={() => setActiveMainTab("map")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${activeMainTab === "map" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"}`}
                >
                  <MapIcon size={16} /> Map
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateItineraries}
              disabled={collections.length === 0 || optionsLoading}
              className={`flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all ${
                collections.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#4A9B7F] to-[#2E6B56]"
              }`}
              title={collections.length === 0 ? "Add places to your collections first" : "Generate 3 itinerary options"}
            >
              <Sparkles size={16} />
              {optionsLoading ? "Generating..." : "Generate Itineraries"}
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 flex overflow-hidden">

            {/* Center Panel (Timeline or Map) */}
            <div className="flex-1 flex flex-col overflow-hidden relative p-4">
              {activeMainTab === "itinerary" && activeTrip ? (
                <>
                  <div className="mb-4">
                    <DayTabs
                      currentDay={currentDay}
                      totalDays={activeTrip.days}
                      onDaySelect={setCurrentDay}
                    />
                  </div>
                  <div className="flex-1 overflow-hidden rounded-2xl shadow-sm border border-gray-200 bg-white">
                    <TimelineView
                      day={currentDay}
                      items={getDayItems(activeTrip.schedule, currentDay)}
                      onRemoveItem={(id) => removeItemFromSchedule(id, currentDay)}
                      onEditItem={handleViewDetails}
                      onAddItem={handleAddItem}
                      onAddMealBreak={() => handleAddMealBreak(currentDay)}
                    />
                  </div>
                </>
              ) : activeMainTab === "map" && activeTrip ? (
                <div className="h-full w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 relative">
                  <MapComponent
                    items={allTripItems.filter(i => !i.isBreak)}
                    userLocation={mockLocation || userLocation}
                    geofences={allTripItems.filter((i: any) => i.lat && i.lng && !i.isBreak).map((i: any) => ({
                      lat: i.lat, lng: i.lng, radius: 100, color: "#22c55e"
                    }))}
                    onClose={() => setActiveMainTab("itinerary")}
                  />
                  {/* Simulation Controls Overlay */}
                  <div className="absolute bottom-6 left-6 z-10 bg-white p-3 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium">Simulation Mode</span>
                      <button
                        onClick={isSimulating ? stopSimulation : startSimulation}
                        className={`px-3 py-1 rounded-md text-sm font-bold text-white transition-colors ${
                          isSimulating ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {isSimulating ? "Stop" : "Start Travel"}
                      </button>
                    </div>
                    {isSimulating && (
                      <div className="mt-2 text-xs text-gray-500">
                        Visiting place {simulationIndex + 1} of {allTripItems.length}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Select a trip to start planning
                </div>
              )}
            </div>

            {/* Right Panel (Resource Panel) */}
            <div className="w-[400px] border-l border-gray-200 bg-white h-full">
              <ResourcePanel
                activeTab={activeRightTab}
                onTabChange={setActiveRightTab}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSendMessage={handleSendMessage}
                onAddCard={(item) => addItemToSchedule(item, currentDay)}
                onAddToCollections={handleAddToCollections}
                searchResults={searchResults}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                collections={collections}
                onRemoveFromCollections={handleRemoveFromCollections}
                tripInfo={activeTrip ? {
                  dates: activeTrip.startDate,
                  travelers: activeTrip.travelers,
                  days: activeTrip.days,
                  budget: "Calculating..."
                } : undefined}
                onViewDetails={handleViewDetails}
                destinationsView={destinationsView}
                setDestinationsView={setDestinationsView}
                // AI Stage Props
                loading={loading}
                chatHistoryLoading={chatHistoryLoading}
                stage={stage}
                clusteringData={clusteringData}
                clusteringLoading={clusteringLoading}
                onClusteringContinue={handleClusteringContinue}
                onClusteringCancel={() => setStage("chat")}
                itineraryOptions={itineraryOptions}
                onSelectItineraryOption={(option: any) => { setSelectedItinerary(option); setConfirmationOpen(true); }}
                // Custom Requirements
                customRequirements={customRequirements}
                requirementInput={requirementInput}
                onRequirementInputChange={setRequirementInput}
                onAddRequirement={handleAddRequirement}
                onRemoveRequirement={handleRemoveRequirement}
                // Visit Tracking
                visitCount={visitCount}
                savedItinerary={savedItinerary}
                savedItineraryId={savedItineraryId}
                onVisitChange={setVisitCount}
                itineraryPlaces={activeTrip ? Object.entries(activeTrip.schedule).flatMap(([day, items]) =>
                  (Array.isArray(items) ? items : []).map(item => ({
                    day: Number(day),
                    name: item.name,
                    time: item.time,
                    category: item.category,
                    isBreak: item.isBreak,
                  }))
                ) : []}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem ? (
          <div className="bg-white p-4 rounded-xl shadow-xl border border-[#4A9B7F] w-[300px] opacity-90 cursor-grabbing">
            <h4 className="font-bold">{activeDragItem.name}</h4>
          </div>
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        data={selectedLocation}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationOpen}
        itinerary={selectedItinerary}
        tripName={activeTrip?.tripName || ""}
        onConfirm={handleConfirmItinerary}
        onClose={() => setConfirmationOpen(false)}
        onEdit={handleEditAndRegenerate}
      />
    </DndContext>
  );
}
```

## Client: Resource Panel
File: `client/odyssey/app/planner2/components/ResourcePanel.tsx`

```tsx
import React, { useState, useEffect } from "react";
import { Search, MapPin, MessageSquare, List, Bookmark, X, Plus, Clock, Globe, ArrowRight, Check, Trash2, Send, Loader2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// Types
type Tab = 'chat' | 'search' | 'saved' | 'tracking';
interface InternalItem {
    id: string;
    placeId?: string;
    name: string;
    category?: string;
    rating?: number;
    user_ratings_total?: number;
    address?: string;
    images?: string[];
    description?: string;
    lat?: number;
    lng?: number;
    visitDurationMin?: number;
    source?: 'ai' | 'manual' | 'db';
}
interface ResourcePanelProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    // Chat Props
    chatMessages: { role: 'user' | 'ai'; text: string; cards?: any[]; itineraryPreview?: any }[];
    chatInput: string;
    setChatInput: (val: string) => void;
    onSendMessage: (text: string) => void;
    // Search Props
    searchResults: InternalItem[];
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    onSearch: () => void;
    onAddCard: (item: any) => void;
    onAddToCollections: (item: any) => void;
    // Collections
    collections: InternalItem[];
    onRemoveFromCollections: (id: string) => void;
    // Trip Info
    tripInfo?: { dates: string; travelers: number; days: number; budget: string };
    onViewDetails: (item: any) => void;
    destinationsView: 'grid' | 'map';
    setDestinationsView: (v: 'grid' | 'map') => void;
    // Loading States
    loading: boolean;
    chatHistoryLoading: boolean;
    // AI Stages
    stage: 'chat' | 'clustering' | 'options';
    clusteringData: any;
    clusteringLoading: boolean;
    onClusteringContinue: () => void;
    onClusteringCancel: () => void;
    itineraryOptions: any[];
    onSelectItineraryOption: (option: any) => void;
    // Custom Requirements
    customRequirements: string[];
    requirementInput: string;
    onRequirementInputChange: (val: string) => void;
    onAddRequirement: () => void;
    onRemoveRequirement: (index: number) => void;
    // Visit Tracking
    visitCount: number;
    savedItinerary: any;
    savedItineraryId: string;
    onVisitChange: (count: number) => void;
    itineraryPlaces: { day: number; name: string; time?: string; isBreak?: boolean; category?: string }[];
}

export default function ResourcePanel(props: ResourcePanelProps) {
    const {
        activeTab, onTabChange,
        chatMessages, chatInput, setChatInput, onSendMessage, loading,
        searchResults, searchQuery, setSearchQuery, onSearch, onAddCard, onAddToCollections,
        collections, onRemoveFromCollections, tripInfo, onViewDetails,
        stage, clusteringData, clusteringLoading, onClusteringContinue, onClusteringCancel,
        itineraryOptions, onSelectItineraryOption,
        customRequirements, requirementInput, onRequirementInputChange, onAddRequirement, onRemoveRequirement,
        itineraryPlaces
    } = props;

    // Scroll to bottom of chat
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, loading]);

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden shadow-xl z-30">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => onTabChange('chat')}
                    className={`flex-1 py-4 text-sm font-medium transition-all relative ${activeTab === 'chat' ? 'text-[#4A9B7F]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <MessageSquare size={18} />
                        <span>AI Assistant</span>
                    </div>
                    {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A9B7F]" />}
                </button>
                <button
                    onClick={() => onTabChange('search')}
                    className={`flex-1 py-4 text-sm font-medium transition-all relative ${activeTab === 'search' ? 'text-[#4A9B7F]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <Search size={18} />
                        <span>Discover</span>
                    </div>
                    {activeTab === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A9B7F]" />}
                </button>
                <button
                    onClick={() => onTabChange('saved')}
                    className={`flex-1 py-4 text-sm font-medium transition-all relative ${activeTab === 'saved' ? 'text-[#4A9B7F]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <Bookmark size={18} />
                        <span>Collections</span>
                        <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{collections.length}</span>
                    </div>
                    {activeTab === 'saved' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A9B7F]" />}
                </button>
                <button
                    onClick={() => onTabChange('tracking')}
                    className={`flex-1 py-4 text-sm font-medium transition-all relative ${activeTab === 'tracking' ? 'text-[#4A9B7F]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <MapPin size={18} />
                        <span>Tracking</span>
                    </div>
                    {activeTab === 'tracking' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A9B7F]" />}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30 relative">
                
                {/* --- CHAT TAB --- */}
                {activeTab === 'chat' && (
                    <div className="h-full flex flex-col">
                        {/* 1. Chat Area */}
                        {stage === 'chat' && (
                            <>
                                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                    {/* Default Welcome */}
                                    {chatMessages.length === 0 && (
                                        <div className="text-center text-gray-400 mt-10">
                                            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <SparklesIcon size={24} className="text-[#4A9B7F]" />
                                            </div>
                                            <p className="text-sm">Where would you like to go?</p>
                                            <p className="text-xs mt-1">Try "Suggest places in Tokyo" or "Plan a 3-day trip to Paris"</p>
                                        </div>
                                    )}

                                    {/* Messages */}
                                    {chatMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                                msg.role === 'user' 
                                                ? 'bg-[#4A9B7F] text-white rounded-tr-sm' 
                                                : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
                                            }`}>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                                
                                                {/* Suggestion Cards */}
                                                {msg.cards && msg.cards.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        {msg.cards.map((card: any, i: number) => (
                                                            <div key={i} className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                                <div className="flex items-start gap-2">
                                                                    {card.images?.[0] && (
                                                                        <img src={card.images[0]} alt="" className="w-12 h-12 rounded object-cover" />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold truncate">{card.name}</div>
                                                                        <div className="text-xs text-gray-500">{card.rating} ★ ({card.user_ratings_total})</div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => onAddToCollections(card)}
                                                                        className="p-1 hover:bg-white rounded-full text-[#4A9B7F]"
                                                                    >
                                                                        <Plus size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                                                <Loader2 size={16} className="animate-spin text-[#4A9B7F]" />
                                                <span className="text-xs text-gray-500">Thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Custom Requirements Input (Optional) */}
                                {collections.length > 0 && (
                                    <div className="px-4 py-2 bg-white border-t border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Custom Requirements</span>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                type="text" 
                                                value={requirementInput}
                                                onChange={(e) => onRequirementInputChange(e.target.value)}
                                                placeholder="e.g. Include vegetarian options"
                                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
                                                onKeyDown={(e) => e.key === 'Enter' && onAddRequirement()}
                                            />
                                            <button onClick={onAddRequirement} className="bg-gray-100 px-2 rounded text-gray-600 hover:bg-gray-200"><Plus size={14}/></button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {customRequirements.map((req, i) => (
                                                <span key={i} className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100 flex items-center gap-1">
                                                    {req}
                                                    <button onClick={() => onRemoveRequirement(i)}><X size={10}/></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Chat Input */}
                                <div className="p-3 bg-white border-t border-gray-100">
                                    <div className="flex gap-2">
                                        <input
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && onSendMessage(chatInput)}
                                            placeholder="Ask for suggestions..."
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A9B7F]"
                                        />
                                        <button 
                                            onClick={() => onSendMessage(chatInput)}
                                            disabled={loading || !chatInput.trim()}
                                            className="bg-[#4A9B7F] text-white p-2 rounded-xl hover:bg-[#3d8b6f] disabled:opacity-50 transition-colors"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 2. Clustering Stage */}
                        {stage === 'clustering' && (
                            <div className="h-full flex flex-col p-6 text-center">
                                <h3 className="font-bold text-lg mb-2">Optimizing Route</h3>
                                {clusteringLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                        <Loader2 size={32} className="animate-spin text-[#4A9B7F] mb-4" />
                                        <p>Grouping places by location...</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="bg-green-50 p-4 rounded-xl mb-4 text-left">
                                            <h4 className="font-bold text-[#4A9B7F] mb-2 flex items-center gap-2"><Check size={16}/> Optimization Complete</h4>
                                            <p className="text-sm text-gray-700">{clusteringData?.summary}</p>
                                            <div className="mt-4 space-y-2">
                                                {clusteringData?.clusters?.map((cluster: any, i: number) => (
                                                    <div key={i} className="bg-white p-2 rounded border border-green-100 text-xs">
                                                        <strong>Day {i+1}:</strong> {cluster.length} places
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={onClusteringContinue} className="w-full bg-[#4A9B7F] text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                                            Generate Itinerary Options
                                        </button>
                                        <button onClick={onClusteringCancel} className="mt-3 text-gray-500 text-sm hover:underline">
                                            Back to Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Options Stage */}
                        {stage === 'options' && (
                            <div className="h-full flex flex-col p-4">
                                <h3 className="font-bold mb-4">Choose Your Plan</h3>
                                <div className="space-y-3 overflow-y-auto flex-1 pb-4">
                                    {itineraryOptions.map((opt: any, i: number) => (
                                        <div key={i} 
                                            onClick={() => onSelectItineraryOption(opt)}
                                            className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#4A9B7F] hover:shadow-md transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-[#4A9B7F] group-hover:underline">{opt.name}</h4>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{opt.pace || 'Balanced'}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{opt.description}</p>
                                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                                <Clock size={12} /> {opt.totalDuration || '6h'} 
                                                <span className="mx-1">•</span>
                                                <MapPin size={12} /> {opt.stops || 5} stops
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={onClusteringCancel} className="mt-2 text-center w-full py-2 text-gray-500 text-sm hover:bg-gray-100 rounded-lg">
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- SEARCH TAB --- */}
                {activeTab === 'search' && (
                    <div className="h-full flex flex-col">
                        <div className="p-4 bg-white border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search places..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && onSearch()} // Trigger on Enter
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A9B7F]"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {searchResults.map((item) => (
                                <SourceItem 
                                    key={item.id} 
                                    item={item} 
                                    onAdd={onAddCard} // Adds directly to timeline if needed
                                    onViewDetails={onViewDetails}
                                    // Custom Add to Collection Button logic inside SourceItem or wrapped here
                                />
                            ))}
                            {searchResults.length === 0 && (
                                <div className="text-center text-gray-400 mt-10 text-sm">
                                    Search for museums, parks, or cafes to add to your plan.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- COLLECTIONS TAB --- */}
                {activeTab === 'saved' && (
                    <div className="h-full flex flex-col p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">My Collections</h3>
                            <button onClick={() => setDestinationsView(destinationsView === 'grid' ? 'map' : 'grid')} className="text-gray-400 hover:text-black">
                                {destinationsView === 'grid' ? <Globe size={16}/> : <List size={16}/>}
                            </button>
                        </div>
                        
                        {collections.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10 text-sm px-8">
                                <Bookmark className="mx-auto mb-2 opacity-50" />
                                No saved places yet. Use Search or Chat to find and save places.
                            </div>
                        ) : (
                            <div className="space-y-3 overflow-y-auto flex-1">
                                {collections.map((item) => (
                                    <SourceItem 
                                        key={item.id} 
                                        item={item} 
                                        onAdd={onAddCard} // can drag this
                                        onViewDetails={onViewDetails}
                                        onRemove={() => onRemoveFromCollections(item.id)}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* Generate CTA embedded here if needed */}
                         {collections.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="bg-green-50 p-3 rounded-lg flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-full shadow-sm text-[#4A9B7F]">
                                        <List size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-gray-700">{collections.length} places ready</div>
                                        <div className="text-[10px] text-gray-500">Drag to timeline or auto-generate</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TRACKING TAB --- */}
                {activeTab === 'tracking' && (
                    <div className="h-full flex flex-col p-4 overflow-y-auto">
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-800 mb-1">Live Progress</h3>
                            <p className="text-xs text-gray-500">Real-time updates as you travel</p>
                        </div>

                        {/* Active Itinerary Stats */}
                        {itineraryPlaces.length > 0 ? (
                            <div className="space-y-6">
                                {/* Next Up */}
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Next Destination</div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{itineraryPlaces[visitCount]?.name || "End of Trip"}</div>
                                            <div className="text-xs text-gray-500">{itineraryPlaces[visitCount]?.time || "--:--"}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="relative pl-4 space-y-6 before:absolute before:left-[23px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-100">
                                    {itineraryPlaces.map((place, idx) => {
                                        const isVisited = idx < visitCount;
                                        const isCurrent = idx === visitCount;
                                        return (
                                            <div key={idx} className={`relative flex items-center gap-4 ${isVisited ? 'opacity-50' : ''}`}>
                                                <div className={`w-3 h-3 rounded-full border-2 z-10 ${
                                                    isVisited ? 'bg-[#4A9B7F] border-[#4A9B7F]' : 
                                                    isCurrent ? 'bg-white border-blue-500 animate-pulse' : 
                                                    'bg-white border-gray-300'
                                                }`} />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{place.name}</div>
                                                    <div className="text-xs text-gray-400">{place.time}</div>
                                                </div>
                                                {isVisited && <Check size={14} className="text-[#4A9B7F]" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                             <div className="text-center text-gray-400 mt-10">
                                No active itinerary tracking available.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-component for Draggable Items
function SourceItem({ item, onAdd, onViewDetails, onRemove }: {
    item: InternalItem;
    onAdd: (item: InternalItem) => void;
    onViewDetails: (item: InternalItem) => void;
    onRemove?: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `source-${item.id}`,
        data: { ...item, type: "source-item" } // Important for DND identification
    });

    const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-move group mb-2 relative touch-none">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h4>
                    {item.category && (
                        <span className="text-xs text-black/60 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {item.category}
                        </span>
                    )}
                </div>
                {/* Actions */}
               <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onViewDetails(item); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500">
                        <ArrowRight size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAdd(item); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-[#4A9B7F]">
                        <Plus size={14} />
                    </button>
                    {onRemove && (
                         <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    )}
               </div>
            </div>
        </div>
    );
}

function SparklesIcon({ size, className }: { size: number, className: string }) {
    return <Sparkles size={size} className={className} />;
}
```

## Client: Timeline View
File: `client/odyssey/app/planner2/components/TimelineView.tsx`

```tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MoreVertical, GripVertical, Trash2, Edit2, Coffee } from 'lucide-react';

interface ItineraryItem {
    id: string;
    name: string;
    time?: string;
    visitDurationMin?: number;
    category?: string;
    isBreak?: boolean;
}

interface TimelineViewProps {
    day: number;
    items: ItineraryItem[];
    onRemoveItem: (id: string) => void;
    onEditItem: (item: any) => void;
    onAddItem: (time: string) => void;
    onAddMealBreak: () => void;
}

export default function TimelineView({ day, items, onRemoveItem, onEditItem, onAddItem, onAddMealBreak }: TimelineViewProps) {
    const { setNodeRef } = useDroppable({
        id: `timeline-day-${day}`,
    });

    return (
        <div ref={setNodeRef} className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div>
                    <h2 className="font-bold text-lg text-gray-800">Day {day} Itinerary</h2>
                    <p className="text-xs text-gray-500">{items.length} stops • {items.reduce((acc, i) => acc + (i.visitDurationMin || 60), 0) / 60} hours active</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onAddMealBreak} className="text-xs flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors font-medium border border-orange-100">
                        <Coffee size={14} /> Add Break
                    </button>
                    <button onClick={() => onAddItem("09:00")} className="text-xs bg-[#4A9B7F] text-white px-3 py-1.5 rounded-lg hover:bg-[#3d8b6f] transition-colors font-medium shadow-sm">
                        + Add Activity
                    </button>
                </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl p-8 bg-gray-50/50">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-gray-500">Day {day} is empty</p>
                            <p className="text-sm mt-2 text-center max-w-[200px]">Drag places from the right panel or click "Add Activity" to start planning.</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <SortableTimelineItem 
                                key={item.id} 
                                item={item} 
                                onRemove={() => onRemoveItem(item.id)}
                                onEdit={() => onEditItem(item)}
                            />
                        ))
                    )}
                </SortableContext>
                
                {/* Spacer at bottom */}
                <div className="h-20"></div>
            </div>
        </div>
    );
}

function SortableTimelineItem({ item, onRemove, onEdit }: { item: ItineraryItem; onRemove: () => void; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id,
        data: { ...item, type: "timeline-item" }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // Dynamic height based on duration? Optional visualization
        // height: `${Math.max(64, ((item.visitDurationMin || 60) / 60) * 64)}px`, 
    };

    const isBreak = item.isBreak;

    return (
        <div ref={setNodeRef} style={style} className={`group relative pl-4 pr-3 py-3 rounded-xl border shadow-sm hover:shadow-md transition-all mb-3 flex gap-3 items-start z-10 w-[98%] ml-auto ${
            isBreak ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'
        }`} >
            {/* Time Indicator Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isBreak ? 'bg-orange-400' : 'bg-[#4A9B7F]'}`} ></div>

            <div className="mt-1 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 p-1" {...listeners} {...attributes}>
                <GripVertical size={16} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        isBreak ? 'text-orange-600 bg-orange-100' : 'text-[#4A9B7F] bg-[#4A9B7F]/10'
                    }`} >
                        {item.time || "09:00"}
                    </span>
                    {isBreak && <span className="text-base">🍽️</span>}
                    <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                </div>
                {item.category && !isBreak && (
                    <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{item.visitDurationMin || 60} min</span>
                </div>
            </div>

            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isBreak && (
                    <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500">
                        <Edit2 size={14} />
                    </button>
                )}
                <button onClick={onRemove} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}
```


## Client: Sidebar
File: `client/odyssey/app/planner2/components/ItinerarySidebar.tsx`

```tsx
import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2, Map } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Trip {
  id: string;
  tripName: string;
  startDate: string;
  days: number;
  status: 'planning' | 'active' | 'completed';
}

interface ItinerarySidebarProps {
  itineraries: Trip[];
  activeItineraryId: string | null;
  onSelectItinerary: (id: string) => void;
  onNewTrip: () => void;
  onDeleteTrip: (id: string) => void;
}

export default function ItinerarySidebar({ itineraries, activeItineraryId, onSelectItinerary, onNewTrip, onDeleteTrip }: ItinerarySidebarProps) {
    const [completedExpanded, setCompletedExpanded] = useState(false);

    const formatRange = (start: string, days: number) => {
        try {
            const s = parseISO(start);
            const e = new Date(s);
            e.setDate(s.getDate() + days - 1);
            return `${format(s, 'MMM d')} - ${format(e, 'MMM d')}`;
        } catch (e) { return start; }
    };

    const activeTrips = itineraries.filter(t => t.status !== 'completed');
    const completedTrips = itineraries.filter(t => t.status === 'completed');

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <Map size={18} className="text-[#4A9B7F]" />
                    My Trips
                </h2>
                <button 
                    onClick={onNewTrip}
                    className="p-1.5 rounded-lg bg-[#4A9B7F]/10 text-[#4A9B7F] hover:bg-[#4A9B7F]/20 transition-colors"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Active Trips */}
                <div>
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Planning</div>
                   <div className="space-y-1">
                        {activeTrips.map(trip => (
                            <div 
                                key={trip.id}
                                onClick={() => onSelectItinerary(trip.id)}
                                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                                    activeItineraryId === trip.id 
                                    ? 'bg-[#4A9B7F]/10 border-l-4 border-[#4A9B7F]' 
                                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                                }`}
                            >
                                <div className="min-w-0">
                                    <h3 className={`font-medium text-sm truncate ${activeItineraryId === trip.id ? 'text-[#4A9B7F]' : 'text-gray-700'}`}>
                                        {trip.tripName}
                                    </h3>
                                    <p className="text-xs text-gray-400">{formatRange(trip.startDate, trip.days)}</p>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteTrip(trip.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        {activeTrips.length === 0 && (
                            <div className="text-xs text-gray-400 px-2 italic">No active trips</div>
                        )}
                   </div>
                </div>

                {/* Completed Trips */}
                {completedTrips.length > 0 && (
                    <div>
                        <button 
                            onClick={() => setCompletedExpanded(!completedExpanded)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 w-full hover:text-gray-600"
                        >
                            {completedExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            Completed ({completedTrips.length})
                        </button>
                        
                        {completedExpanded && (
                            <div className="space-y-1 pl-2">
                                {completedTrips.map(trip => (
                                    <div 
                                        key={trip.id}
                                        onClick={() => onSelectItinerary(trip.id)}
                                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer opacity-70 hover:opacity-100 ${
                                            activeItineraryId === trip.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <h3 className="text-sm truncate text-gray-600 line-through decoration-gray-400">
                                                {trip.tripName}
                                            </h3>
                                        </div>
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteTrip(trip.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* User Profile / Logout (Placeholder) */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#4A9B7F] text-white flex items-center justify-center font-bold text-xs">
                        JD
                    </div>
                    <div className="text-xs">
                        <div className="font-bold text-gray-700">John Doe</div>
                        <div className="text-gray-400">Travel Enthusiast</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

## Client: Day Tabs
File: `client/odyssey/app/planner2/components/DayTabs.tsx`

```tsx
import React from 'react';

export default function DayTabs({ currentDay, totalDays, onDaySelect }: {
    currentDay: number;
    totalDays: number;
    onDaySelect: (day: number) => void;
}) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                <button
                    key={day}
                    onClick={() => onDaySelect(day)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm border ${
                        currentDay === day
                        ? 'bg-[#4A9B7F] text-white border-[#4A9B7F] shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                    Day {day}
                </button>
            ))}
            <button className="px-3 py-2 rounded-full text-gray-400 hover:bg-gray-100" title="Add Day">
                +
            </button>
        </div>
    );
}
```

## Client: Itinerary Setup
File: `client/odyssey/app/planner2/components/ItinerarySetup.tsx`

```tsx
import React, { useState } from 'react';
import { Calendar, Users, MapPin, DollarSign, X } from 'lucide-react';

interface ItinerarySetupProps {
  onCreate: (data: any) => void;
  onCancel?: () => void;
}

export default function ItinerarySetup({ onCreate, onCancel }: ItinerarySetupProps) {
  const [formData, setFormData] = useState({
    tripName: '',
    startDate: new Date().toISOString().split('T')[0],
    days: 3,
    travelers: 2,
    budget: 'Moderate' // Low, Moderate, High, Luxury
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tripName) return;
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-[#4A9B7F] p-6 text-white relative">
            <h2 className="text-2xl font-bold">Plan a New Adventure</h2>
            <p className="text-white/80 text-sm mt-1">Tell us a bit about your trip to get started.</p>
            {onCancel && (
                <button onClick={onCancel} className="absolute top-4 right-4 text-white/70 hover:text-white">
                    <X size={20} />
                </button>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Where to?</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        required
                        type="text"
                        placeholder="e.g. Kyoto, Japan"
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A9B7F] focus:border-transparent outline-none"
                        value={formData.tripName}
                        onChange={e => setFormData({...formData, tripName: e.target.value})}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="date"
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A9B7F] outline-none"
                            value={formData.startDate}
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                    <input 
                        type="number"
                        min={1} max={30}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A9B7F] outline-none"
                        value={formData.days}
                        onChange={e => setFormData({...formData, days: parseInt(e.target.value)})}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Travelers</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="number"
                            min={1} max={10}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A9B7F] outline-none"
                            value={formData.travelers}
                            onChange={e => setFormData({...formData, travelers: parseInt(e.target.value)})}
                        />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                     <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A9B7F] outline-none bg-white"
                            value={formData.budget}
                            onChange={e => setFormData({...formData, budget: e.target.value})}
                        >
                            <option>Low</option>
                            <option>Moderate</option>
                            <option>High</option>
                            <option>Luxury</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button 
                    type="submit"
                    className="w-full bg-[#4A9B7F] text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-[#3d8b6f] transition-all transform hover:-translate-y-0.5"
                >
                    Create Trip
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
```

## Client: Active Trip Mode
File: `client/odyssey/app/trip/page.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useVisitTracking } from '../hooks/useVisitTracking';
import { useGeofencing } from '../hooks/useGeofencing';
import MapComponent from '../components/MapComponent';
import { Loader2, Navigation } from 'lucide-react';

export default function TripPage() {
    const itineraryId = "active-trip-id"; // In real app, from params or context
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") || "" : "";

    const { 
        geofenceStatus, 
        userLocation, 
        startTracking 
    } = useGeofencing({
        enabled: true,
        itineraryId,
        autoCheckin: true
    });

    const { 
        currentVisit, 
        visitHistory, 
        progress, 
        checkIn, 
        checkOut,
        fetchVisitHistory 
    } = useVisitTracking(itineraryId, token);

    const [tripData, setTripData] = useState<any>(null);

    // Load Trip Data
    useEffect(() => {
        // Mock load or real fetch
        // For context purposes, assume tripData is loaded here
        const mockData = {
            id: itineraryId,
            schedule: {
                1: [
                    { id: '1', name: 'Eiffel Tower', time: '09:00', lat: 48.8584, lng: 2.2945, placeId: 'ChIJLU7jZKlu5kcR4PcOOO6p3I0' },
                    { id: '2', name: 'Louvre Museum', time: '11:00', lat: 48.8606, lng: 2.3376, placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ' },
                ]
            }
        };
        setTripData(mockData);
        startTracking();
    }, []);

    // Handle Auto-Actions & Notifications
    useEffect(() => {
        if (geofenceStatus?.action === 'auto_checked_in' && geofenceStatus.place) {
            if (!currentVisit) {
                sendNotification("Arrived!", `You have arrived at ${geofenceStatus.place.placeName}`);
                checkIn({
                    placeId: geofenceStatus.place.placeId,
                    placeName: geofenceStatus.place.placeName,
                    location: {
                        lat: geofenceStatus.place.latitude,
                        lng: geofenceStatus.place.longitude
                    }
                });
            }
        } else if (geofenceStatus?.action === 'auto_checked_out' && geofenceStatus.place) {
            if (currentVisit && currentVisit.place_id === geofenceStatus.place.placeId) {
                sendNotification("Departed", `You have left ${geofenceStatus.place.placeName}`);
                checkOut({
                    location: {
                        lat: geofenceStatus.place.latitude,
                        lng: geofenceStatus.place.longitude
                    }
                });
            }
        }
    }, [geofenceStatus, currentVisit, checkIn, checkOut]);

    const sendNotification = (title: string, body: string) => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon.png' });
        } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body, icon: '/icon.png' });
                }
            });
        }
    };

    if (!tripData) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#4A9B7F]" /></div>;

    const todayItems = tripData.schedule[1] || []; // Hardcoded day for demo

    return (
        <div className="h-screen flex flex-col bg-gray-50">
             {/* Map Area (Top Half) */}
             <div className="h-[45vh] relative">
                <MapComponent
                    items={todayItems}
                    userLocation={userLocation || undefined}
                    geofences={todayItems.map((i: any) => ({
                        lat: i.lat, lng: i.lng, radius: 200, color: currentVisit?.place_id === i.placeId ? '#EF4444' : '#10B981'
                    }))}
                />
                
                {/* Live Status Overlay */}
                <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar">
                    {currentVisit ? (
                        <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg border-l-4 border-green-500 flex-1 min-w-[200px]">
                            <div className="text-xs font-bold text-green-600 uppercase">Current Station</div>
                            <div className="font-bold text-gray-900">{currentVisit.place_name}</div>
                            <div className="text-xs text-gray-500">Since {new Date(currentVisit.entered_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    ) : (
                         <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg border-l-4 border-gray-400 flex-1 min-w-[200px]">
                            <div className="text-xs font-bold text-gray-500 uppercase">Status</div>
                            <div className="font-bold text-gray-900">En Route / Idle</div>
                        </div>
                    )}
                </div>
             </div>

             {/* Timeline Area (Bottom Half) */}
             <div className="flex-1 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] -mt-6 z-20 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-xl">Today's Journey</h2>
                    <span className="text-sm text-gray-400">{todayItems.length} stops</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {todayItems.map((item: any, idx: number) => {
                        const isVisited = visitHistory.some(v => v.place_id === item.placeId && v.status === 'completed');
                        const isActive = currentVisit?.place_id === item.placeId;
                        const isPending = !isVisited && !isActive;

                        return (
                             <div key={idx} className={`relative flex gap-4 ${isVisited ? 'opacity-50 grayscale' : ''}`}>
                                {/* Timeline Line */}
                                {idx !== todayItems.length - 1 && (
                                    <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-gray-100" />
                                )}

                                {/* Icon/Dot */}
                                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${
                                    isActive ? 'bg-green-100 border-green-500 text-green-600 shadow-green-200 shadow-lg scale-110' :
                                    isVisited ? 'bg-gray-100 border-gray-300 text-gray-400' :
                                    'bg-white border-gray-200 text-gray-500'
                                }`}>
                                    <span className="font-bold text-sm">{idx + 1}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`font-bold text-lg ${isActive ? 'text-green-800' : 'text-gray-900'}`}>{item.name}</h3>
                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                <span>{item.time}</span>
                                                <span>•</span>
                                                <span>{item.category || 'Spot'}</span>
                                            </div>
                                        </div>
                                        {/* Navigate Button */}
                                        <button 
                                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`)}
                                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        >
                                            <Navigation size={18} />
                                        </button>
                                    </div>
                                    
                                    {isActive && (
                                        <div className="mt-3 bg-green-50 rounded-xl p-3 border border-green-100 text-sm">
                                            <p className="text-green-800 font-medium mb-2">You are here!</p>
                                            <button 
                                                onClick={() => checkOut({})}
                                                className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700"
                                            >
                                                Check Out Manually
                                            </button>
                                        </div>
                                    )}
                                </div>
                             </div>
                        );
                    })}
                </div>
             </div>
        </div>
    );
}
```


## Client: Map Component
File: `client/odyssey/app/components/MapComponent.tsx`

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface MapComponentProps {
  items: any[];
  userLocation?: { lat: number; lng: number };
  geofences?: { lat: number; lng: number; radius: number; color?: string }[];
  onClose?: () => void;
}

export default function MapComponent({ items, userLocation, geofences, onClose }: MapComponentProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Default center (Paris) if no items
  const defaultCenter = { lat: 48.8566, lng: 2.3522 };
  const center = items.length > 0 && items[0].lat && items[0].lng 
    ? { lat: items[0].lat, lng: items[0].lng } 
    : userLocation || defaultCenter;

  return (
    <div className="h-full w-full relative">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId="DEMO_MAP_ID" // Required for AdvancedMarker
          className="h-full w-full"
          disableDefaultUI={true}
        >
          {/* User Location Marker */}
          {userLocation && (
            <AdvancedMarker 
                position={userLocation}
                title="You are here"
            >
                <div className="relative">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping" />
                </div>
            </AdvancedMarker>
          )}

          {/* Itinerary Items Markers */}
          {items.map((item) => {
             if (!item.lat || !item.lng) return null;
             return (
                <AdvancedMarker
                    key={item.id}
                    position={{ lat: item.lat, lng: item.lng }}
                    onClick={() => setSelectedItem(item)}
                    title={item.name}
                >
                    <Pin background={'#4A9B7F'} glyphColor={'#FFF'} borderColor={'#2E6B56'} />
                </AdvancedMarker>
             );
          })}

          {/* Geofence Circles (Simplified as Markers with custom SVG for now, or use Circles if library updated) */}
          {/* Note: React-Google-Maps doesn't have a direct <Circle> component in standard export easily used with AdvancedMarker mapId. 
              We can use a custom component accessing the map instance. */}
          {geofences && <GeofenceCircles geofences={geofences} />}
          
          {/* Directions Renderer */}
          <Directions items={items} />

          {/* Info Window */}
          {selectedItem && (
            <InfoWindow
                position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
                onCloseClick={() => setSelectedItem(null)}
            >
                <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold text-gray-900">{selectedItem.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{selectedItem.category}</p>
                    {selectedItem.images && selectedItem.images[0] && (
                        <img src={selectedItem.images[0]} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                    )}
                    <div className="text-xs text-gray-400">
                        {selectedItem.visitDurationMin} min visit
                    </div>
                </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Close Button (if map is overlay) */}
      {onClose && (
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-all z-10"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
    </div>
  );
}

function GeofenceCircles({ geofences }: { geofences: { lat: number; lng: number; radius: number; color?: string }[] }) {
    const map = useMap();
    const circlesRef = useRef<google.maps.Circle[]>([]);

    useEffect(() => {
        if (!map) return;

        // Cleanup old circles
        circlesRef.current.forEach(c => c.setMap(null));
        circlesRef.current = [];

        // Add new circles
        geofences.forEach(g => {
            const circle = new google.maps.Circle({
                map,
                center: { lat: g.lat, lng: g.lng },
                radius: g.radius,
                fillColor: g.color || '#22c55e',
                fillOpacity: 0.2,
                strokeColor: g.color || '#22c55e',
                strokeWeight: 1
            });
            circlesRef.current.push(circle);
        });

        return () => {
             circlesRef.current.forEach(c => c.setMap(null));
        };
    }, [map, geofences]);

    return null;
}

function Directions({ items }: { items: any[] }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map, suppressMarkers: true }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || items.length < 2) {
      return;
    }

    // Filter valid locations for Routing
    // MUST have placeId OR coordinates. Pure names are risky if they are generic.
    const validItems = items.filter(item => 
      !item.isBreak && 
      (item.placeId || (item.lat && item.lng))
    );

    if (validItems.length < 2) {
      // Not enough points for a route
      directionsRenderer.setMap(null);
      return;
    }

    try {
      const originItem = validItems[0];
      const destItem = validItems[validItems.length - 1];

      const getLoc = (item: any) => {
        if (item.placeId) return { placeId: item.placeId };
        if (item.lat && item.lng) return { location: { lat: item.lat, lng: item.lng } };
        return { query: item.name }; // Fallback (should be covered by filter)
      };

      const origin = getLoc(originItem);
      const destination = getLoc(destItem);

      const waypoints = validItems.slice(1, -1).map(item => ({
        location: getLoc(item) as any, // Type cast for Google Maps
        stopover: true
      }));

      directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING
      }).then(response => {
        directionsRenderer.setMap(map); // Ensure map is set
        directionsRenderer.setDirections(response);
      }).catch(err => {
        console.error("Directions request failed", err);
        // Don't clear map here, let markers stay
      });
    } catch (err) {
      console.error("Directions: Error during route setup", err);
    } 

    return () => {
      directionsRenderer.setMap(null); // Cleanup
    };
  }, [directionsService, directionsRenderer, items]);

  return null;
}
```

## Client: Geofencing Hook
File: `client/odyssey/app/hooks/useGeofencing.ts`

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';

export interface GeofenceStatus {
  isInGeofence: boolean;
  place?: {
    placeId: string;
    placeName: string;
    latitude: number;
    longitude: number;
  };
  distance?: number;
  radius?: number;
  action?: 'auto_checked_in' | 'auto_checked_out' | 'already_in_progress' | 'no_action';
  visitLog?: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    entered_at: string;
    exited_at?: string;
    time_spent?: number;
  };
  error?: string;
}

export interface GeofenceHookOptions {
  enabled?: boolean;
  throttleInterval?: number;
  itineraryId?: string;
  autoCheckin?: boolean;
  mockLocation?: { lat: number; lng: number }; // For testing/presentation
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const useGeofencing = (options: GeofenceHookOptions = {}) => {
  const {
    enabled = true,
    throttleInterval = 10000, // 10 seconds default (10-15 range)
    itineraryId,
    autoCheckin = true,
  } = options;

  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Refs to manage throttling and cleanup
  const lastCheckRef = useRef<number>(0);
  const watchPositionIdRef = useRef<number | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request location permission (handles browser permissions)
   */
  const requestLocationPermission = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by this browser');
      return false;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setLocationEnabled(true);
      setError(null);
      return true;
    } catch (err: any) {
      const errorMsg =
        err.code === 1
          ? 'Location permission denied. Please enable location in your browser settings.'
          : err.code === 2
            ? 'Location unavailable. Please check your GPS signal.'
            : 'Unable to get location. Please try again.';

      setError(errorMsg);
      setLocationEnabled(false);
      return false;
    }
  }, []);

  /**
   * Check geofence status with the backend
   */
  const checkGeofenceStatus = useCallback(
    async (latitude: number, longitude: number) => {
      if (!itineraryId) {
        setError('Itinerary ID is required');
        return;
      }

      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          setError('Authentication token not found. Please login first.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/visits/geofence-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_latitude: latitude,
            user_longitude: longitude,
            itinerary_id: itineraryId,
            auto_checkin: autoCheckin,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to check geofence status');
        }

        const data: GeofenceStatus = await response.json();
        setGeofenceStatus(data);
        setError(null);
      } catch (err: any) {
        // Non-critical: geofence check can fail when no itinerary data exists yet
        console.warn('Geofence check:', err.message || 'Error checking geofence');
      } finally {
        setIsLoading(false);
      }
    },
    [itineraryId, autoCheckin]
  );

  /**
   * Handle position updates with throttling
   */
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;

      // Update local state for Map UI
      setUserLocation({ lat: latitude, lng: longitude });

      const now = Date.now();

      // Throttle: only check if enough time has passed
      if (now - lastCheckRef.current < throttleInterval) {
        return;
      }

      lastCheckRef.current = now;

      // Clear any existing timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      // Check geofence status
      checkGeofenceStatus(latitude, longitude);
    },
    [throttleInterval, checkGeofenceStatus]
  );

  /**
   * Start tracking location
   */
  const startTracking = useCallback(async () => {
    if (!enabled || !itineraryId) {
      return;
    }

    if (isTracking) {
      console.warn('Already tracking location');
      return;
    }

    // Request permission first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }

    try {
      // Start watching position with options for better accuracy
      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === 1) {
            setError('Location permission denied');
          } else if (error.code === 2) {
            setError('Location unavailable');
          } else {
            setError('Failed to get location');
          }
        },
        {
          enableHighAccuracy: true, // Use GPS instead of cell towers
          timeout: 15000, // 15 second timeout
          maximumAge: 5000, // Cache location for max 5 seconds
        }
      );

      setIsTracking(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to start tracking');
      console.error(err);
    }
  }, [enabled, itineraryId, isTracking, requestLocationPermission, handlePositionUpdate]);

  /**
   * Stop tracking location
   */
  const stopTracking = useCallback(() => {
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

    setIsTracking(false);
  }, []);

  /**
   * Auto-start tracking when component mounts or itinerary changes
   */
  useEffect(() => {
    if (enabled && itineraryId) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, itineraryId, startTracking, stopTracking]);

  // --- MOCK LOCATION LOGIC (For Presentation/Testing) ---
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (options.mockLocation) {
      setUserLocation(options.mockLocation);
      // Also trigger geofence check for the mock location
      checkGeofenceStatus(options.mockLocation.lat, options.mockLocation.lng);
    }
  }, [options.mockLocation, checkGeofenceStatus]);

  // Update handlePositionUpdate to also set local state for UI
  const originalHandlePositionUpdate = handlePositionUpdate;
  const enhancedHandlePositionUpdate = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    setUserLocation({ lat: latitude, lng: longitude });
    originalHandlePositionUpdate(position);
  }, [originalHandlePositionUpdate]);

  // Override the watcher to use the enhanced handler
  // Note: We need to re-implement startTracking to use enhancedHandlePositionUpdate if we want real-time updates
  // For now, let's just make sure when we DO get an update, we set state.
  // Actually, easier way: just modify the callback inside startTracking or the `handlePositionUpdate` definition itself.

  // Let's modify the return to include userLocation
  return {
    geofenceStatus,
    isLoading,
    error,
    locationEnabled,
    isTracking,
    startTracking,
    stopTracking,
    checkGeofenceStatus,
    requestLocationPermission,
    userLocation, // Expose raw location for Map UI
  };
};
```

## Client: Visit Tracking Hook
File: `client/odyssey/app/hooks/useVisitTracking.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface VisitLog {
  id: string;
  user_id: string;
  itinerary_id: string;
  place_id: string;
  place_name: string;
  entered_at: string;
  exited_at: string | null;
  time_spent: number | null;
  expected_duration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  entry_location: Location;
  exit_location: Location | null;
  user_rating: number | null;
  notes: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  skipped: number;
  completionPercent: number;
  totalTimeSpent: number;
}

export interface TripSummary {
  totalPlaces: number;
  placesVisited: number;
  completionPercent: number;
  totalTimeSpent: number;
  averageTimePerPlace: number;
  averageRating: number | null;
  startTime: string;
  endTime: string;
  visits: VisitLog[];
}

interface UseVisitTrackingReturn {
  currentVisit: VisitLog | null;
  visitHistory: VisitLog[];
  progress: ProgressStats | null;
  tripSummary: TripSummary | null;
  loading: boolean;
  error: string | null;
  checkIn: (data: {
    placeId: string;
    placeName: string;
    category?: string;
    location: Location;
    expectedDuration?: number;
  }) => Promise<VisitLog | null>;
  checkOut: (data: {
    location?: Location;
    userRating?: number;
    notes?: string;
    photos?: string[];
  }) => Promise<VisitLog | null>;
  addFeedback: (visitId: string, data: {
    userRating?: number;
    notes?: string;
    photos?: string[];
  }) => Promise<VisitLog | null>;
  skipPlace: (reason?: string) => Promise<void>;
  fetchProgress: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchVisitHistory: () => Promise<void>;
}

/**
 * Custom Hook for Visit Tracking
 * Manages all visit tracking operations and state
 */
export const useVisitTracking = (itineraryId: string, token: string): UseVisitTrackingReturn => {
  const [currentVisit, setCurrentVisit] = useState<VisitLog | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitLog[]>([]);
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Get current user location
  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (err) => reject(err)
      );
    });
  }, []);

  // Check In
  const checkIn = useCallback(
    async (data: {
      placeId: string;
      placeName: string;
      category?: string;
      location: Location;
      expectedDuration?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            itineraryId,
            placeId: data.placeId,
            placeName: data.placeName,
            category: data.category || 'landmark',
            location: data.location,
            expectedDuration: data.expectedDuration || 3600,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Check-in failed');
        }

        const result = await response.json();
        setCurrentVisit(result.data.visit);
        return result.data.visit;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Check-in failed';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [itineraryId, token, API_BASE]
  );

  // Check Out
  const checkOut = useCallback(
    async (data: {
      location?: Location;
      userRating?: number;
      notes?: string;
      photos?: string[];
    }) => {
      try {
        if (!currentVisit) {
          throw new Error('No active visit');
        }

        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/check-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            visitId: currentVisit.id,
            location: data.location,
            userRating: data.userRating,
            notes: data.notes,
            photos: data.photos,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Check-out failed');
        }

        const result = await response.json();
        setCurrentVisit(null);
        
        // Refresh history and progress
        await fetchVisitHistory();
        await fetchProgress();
        
        return result.data.visit;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Check-out failed';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentVisit, token, API_BASE]
  );

  // Add Feedback
  const addFeedback = useCallback(
    async (visitId: string, data: {
      userRating?: number;
      notes?: string;
      photos?: string[];
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/${visitId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add feedback');
        }

        const result = await response.json();
        
        // Update in history
        setVisitHistory((prev) =>
          prev.map((v) => (v.id === visitId ? result.data.visit : v))
        );

        return result.data.visit;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add feedback';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token, API_BASE]
  );

  // Skip Place
  const skipPlace = useCallback(
    async (reason?: string) => {
      try {
        if (!currentVisit) {
          throw new Error('No active visit');
        }

        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/${currentVisit.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to skip place');
        }

        setCurrentVisit(null);
        await fetchVisitHistory();
        await fetchProgress();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to skip place';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [currentVisit, token, API_BASE]
  );

  // Fetch Progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/visits/progress/${itineraryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setProgress(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  }, [itineraryId, token, API_BASE]);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/visits/summary/${itineraryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setTripSummary(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, [itineraryId, token, API_BASE]);

  // Fetch Visit History
  const fetchVisitHistory = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/visits/logs/${itineraryId}?page=1&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setVisitHistory(result.data);

        // Find current active visit
        const active = result.data.find((v: VisitLog) => v.status === 'in_progress');
        setCurrentVisit(active || null);
      }
    } catch (err) {
      console.error('Failed to fetch visit history:', err);
    }
  }, [itineraryId, token, API_BASE]);

  // Initial load
  useEffect(() => {
    if (itineraryId && token) {
      fetchVisitHistory();
      fetchProgress();
    }
  }, [itineraryId, token, fetchVisitHistory, fetchProgress]);

  return {
    currentVisit,
    visitHistory,
    progress,
    tripSummary,
    loading,
    error,
    checkIn,
    checkOut,
    addFeedback,
    skipPlace,
    fetchProgress,
    fetchSummary,
    fetchVisitHistory,
  };
};
```


## Server: AI Routes
File: `server/src/routes/ai.routes.js`

```javascript
const router = require("express").Router();
const { detectIntent } = require("../services/ai/intent");
const { searchPlaces } = require("../repositories/places.repo");
const { callGemini } = require("../services/ai/geminiClient");
const { makeValidator } = require("../services/ai/validate");
const authMiddleware = require("../middleware/authMiddleware");
const ChatHistory = require("../models/ChatHistory");
const googleMapsService = require("../services/googleMapsService");
const { supabase } = require("../config/supabaseClient");

// itinerary prompt
const {
  systemPrompt: itinerarySystemPrompt,
  responseSchema: itineraryResponseSchema,
} = require("../services/ai/prompts/itinerary.prompt");

// search prompt
const {
  systemPrompt: searchSystemPrompt,
  responseSchema: searchResponseSchema,
} = require("../services/ai/prompts/search.prompt");

// multi-itinerary prompt (Stage 2)
const {
  systemPrompt: multiItinerarySystemPrompt,
  responseSchema: multiItineraryResponseSchema,
} = require("../services/ai/prompts/multiItinerary.prompt");

const validateItinerary = makeValidator(itineraryResponseSchema);
const validateSearch = makeValidator(searchResponseSchema);
const validateMultiItinerary = makeValidator(multiItineraryResponseSchema);

router.post("/chat", async (req, res) => {
  try {
    const { message, userContext, selectedPlaces, conversationHistory: clientHistory } = req.body;

    // Try to get userId from auth, but make it optional
    let userId = null;
    let conversationHistory = [];

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;

        // Get conversation context from database if authenticated
        conversationHistory = await ChatHistory.getConversationContext(userId, 10);
      } catch (err) {
        console.log("Auth optional - continuing without user context");
      }
    }

    // If no database history but client sent session history (logged-out users), use that
    if (conversationHistory.length === 0 && clientHistory && Array.isArray(clientHistory)) {
      conversationHistory = clientHistory;
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required (string)" });
    }

    // Save user message to history (only if authenticated)
    if (userId) {
      await ChatHistory.saveMessage(userId, message, "user", null, {});
    }

    const intent = detectIntent(message);

    // 1) DB-first search (mock for now)
    const dbResults = await searchPlaces(message);

    // If DB found matches for search intent, return them
    if (intent === "search_places" && dbResults.length > 0) {
      const aiResponse = "Here are some places from our database.";

      // Save AI response to history (only if authenticated)
      if (userId) {
        await ChatHistory.saveMessage(userId, aiResponse, "ai", null, { cards: dbResults });
      }

      return res.json({
        message: aiResponse,
        cards: dbResults,
        itineraryPreview: null,
        source: "db",
      });
    }

    // 2) AI: itinerary
    if (intent === "generate_itinerary") {
      const payload = {
        message,
        userContext: userContext ?? null,
        selectedPlaces: selectedPlaces ?? [],
        dbResults: dbResults ?? [],
        conversationHistory, // Add conversation context
      };

      // ✅ Option A: do NOT pass schema to Gemini
      const itineraryJson = await callGemini({
        system: itinerarySystemPrompt,
        user: payload,
      });

      //  Validate AI output server-side
      const v = validateItinerary(itineraryJson);
      if (!v.ok) {
        console.error("Invalid itinerary JSON from AI:", v.errors);
        return res.status(502).json({
          message: "AI response was invalid. Please try again.",
          cards: [],
          itineraryPreview: null,
          source: "ai",
        });
      }

      const aiMessage = itineraryJson.reply ?? "Here is an itinerary preview.";

      // Save AI response to history (only if authenticated)
      if (userId) {
        await ChatHistory.saveMessage(userId, aiMessage, "ai", null, {
          itineraryPreview: itineraryJson.itineraryPreview,
          cards: itineraryJson.cards
        });
      }

      return res.json({
        message: aiMessage,
        itineraryPreview: itineraryJson.itineraryPreview ?? null,
        cards: itineraryJson.cards ?? [],
        source: "ai",
      });
    }

    // 3) AI: search/discovery
    const payload = {
      message,
      userContext: userContext ?? null,
      dbResults: dbResults ?? [],
      conversationHistory, // Add conversation context
    };

    async function getValidSearchJson(payload) {
      // 1st attempt
      const first = await callGemini({
        system: searchSystemPrompt,
        user: payload,
      });

      let v = validateSearch(first);
      if (v.ok) return first;

      console.error("Invalid search JSON from AI (attempt 1):", v.errors);

      // 2nd attempt (retry with strict instruction)
      const retryPayload = {
        ...payload,
        __validationError:
          "Your previous JSON failed validation. You MUST output at least 2 overviewBullets and 3 to 8 cards. Return ONLY valid JSON matching the required shape.",
      };

      const second = await callGemini({
        system: searchSystemPrompt,
        user: retryPayload,
      });

      v = validateSearch(second);
      if (v.ok) return second;

      console.error("Invalid search JSON from AI (attempt 2):", v.errors);
      return null;
    }

    const searchJson = await getValidSearchJson(payload);

    if (!searchJson) {
      return res.status(502).json({
        message: "AI response was invalid. Please try again.",
        bullets: [],
        cards: [],
        itineraryPreview: null,
        source: "ai",
      });
    }

    const aiMessage = searchJson.overviewParagraph ?? "Here are some suggestions.";

    // Save AI response to history (only if authenticated)
    if (userId) {
      await ChatHistory.saveMessage(userId, aiMessage, "ai", null, {
        bullets: searchJson.overviewBullets,
        cards: searchJson.cards
      });
    }

    //IMPORTANT: map the new fields from your updated search.prompt.js
    return res.json({
      message: aiMessage,
      bullets: searchJson.overviewBullets ?? [],
      cards: searchJson.cards ?? [],
      itineraryPreview: null,
      source: "ai",
    });

  } catch (err) {
    console.error("AI /chat error:", err);
    return res.status(500).json({ error: err.message || "AI error" });
  }
});

/**
 * POST /api/ai/generateItineraries
 * 
 * Stage 2: Generate 3 distinct itinerary options from selected places
 * 
 * Request body:
 * {
 *   selectedPlaces: [{ name, category, ... }],
 *   tripDuration: 3,
 *   userContext: { budget, pace, interests }
 * }
 * 
 * Response: 3 complete itineraries (Minimalist, Maximum, Balanced)
 */
router.post("/generateItineraries", async (req, res) => {
  try {
    const { selectedPlaces, tripDuration, userContext, customRequirements } = req.body;

    if (!selectedPlaces || !Array.isArray(selectedPlaces) || selectedPlaces.length === 0) {
      return res.status(400).json({ error: "selectedPlaces is required (non-empty array)" });
    }

    if (!tripDuration || tripDuration < 1) {
      return res.status(400).json({ error: "tripDuration is required (integer >= 1)" });
    }

    // Prepare payload for AI
    const payload = {
      selectedPlaces,
      tripDuration,
      userContext: userContext ?? null,
    };

    // Add custom requirements if provided
    if (customRequirements && customRequirements.trim()) {
      payload.customRequirements = customRequirements;
    }

    async function getValidMultiItineraryJson(payload, attempt = 1) {
      // Call Gemini with multi-itinerary prompt
      const multiItineraryJson = await callGemini({
        system: multiItinerarySystemPrompt,
        user: payload,
      });

      // Validate AI output server-side
      const validation = validateMultiItinerary(multiItineraryJson);
      if (validation.ok) return multiItineraryJson;

      console.error(`Invalid multi-itinerary JSON from AI (attempt ${attempt}):`, validation.errors);

      // If first attempt failed, retry with strict instructions
      if (attempt === 1) {
        const retryPayload = {
          ...payload,
          __validationError:
            "Your previous JSON failed validation. IMPORTANT: The 'time' field MUST be EXACTLY one of: 'morning', 'afternoon', or 'evening' (lowercase, no times). Return ONLY valid JSON matching the required shape with exactly 3 itineraries.",
        };

        const second = await callGemini({
          system: multiItinerarySystemPrompt,
          user: retryPayload,
        });

        const validationRetry = validateMultiItinerary(second);
        if (validationRetry.ok) return second;

        console.error(`Invalid multi-itinerary JSON from AI (attempt 2):`, validationRetry.errors);
        return null;
      }

      return null;
    }

    const multiItineraryJson = await getValidMultiItineraryJson(payload);

    if (!multiItineraryJson) {
      return res.status(502).json({
        error: "AI response was invalid after 2 attempts. Please try again.",
      });
    }

    // -------------------------------------------------------------------------
    // ENRICHMENT STEP: Resolve place locations (Collections -> Cache -> API)
    // -------------------------------------------------------------------------
    async function enrichItineraryWithLocations(itineraries, sourcePlaces) {
      // 1. Build a lookup map from source places (Collections) - FREE
      const sourceLookup = new Map();
      if (Array.isArray(sourcePlaces)) {
        sourcePlaces.forEach(p => {
          if (p.name) sourceLookup.set(p.name.toLowerCase().trim(), p);
        });
      }

      // 2. Collect all items needing resolution
      const itemsToResolve = [];
      const placeNamesToResolve = new Set();

      for (const itinerary of itineraries) {
        if (!itinerary.schedule) continue;
        for (const day of itinerary.schedule) {
          if (!day.items) continue;
          for (const item of day.items) {
            const nameKey = (item.place || item.name || "").toLowerCase().trim();
            if (!nameKey) continue;

            const sourceMatch = sourceLookup.get(nameKey);
            if (sourceMatch && sourceMatch.placeId) {
              // Exact match from collections - copy details
              item.placeId = sourceMatch.placeId;
              item.lat = sourceMatch.lat || sourceMatch.coordinates?.latitude;
              item.lng = sourceMatch.lng || sourceMatch.coordinates?.longitude;
            } else {
              // Needs resolution
              itemsToResolve.push(item);
              placeNamesToResolve.add(nameKey);
            }
          }
        }
      }

      // 3. Batch resolve unique missing names
      const uniqueNames = Array.from(placeNamesToResolve);
      console.log(`AI Itinerary: ${uniqueNames.length} places to resolve not in collections.`);

      if (uniqueNames.length === 0) return itineraries;

      // Rate limit concurrent API calls
      const RESOLUTION_LIMIT = 10; // Max items to geocode per request to save quota
      const namesToProcess = uniqueNames.slice(0, RESOLUTION_LIMIT);

      const resolvedMap = new Map();

      await Promise.all(namesToProcess.map(async (name) => {
        try {
          // Check DB Cache first - FREE
          // (Assuming googleMapsService.searchPlaces handles caching, but geocode might not?
          // Let's use searchPlaces or geocode. Geocode is cheaper/simpler if we just need coords)

          // Try exact name geocoding
          const result = await googleMapsService.geocode(name);
          if (result) {
            resolvedMap.set(name, result);
          }
        } catch (e) {
          console.error(`Failed to resolve place '${name}':`, e.message);
        }
      }));

      // 4. Apply resolved data back to items
      for (const item of itemsToResolve) {
        const nameKey = (item.place || item.name || "").toLowerCase().trim();
        const resolved = resolvedMap.get(nameKey);
        if (resolved) {
          item.placeId = resolved.placeId;
          item.lat = resolved.coordinates.lat;
          item.lng = resolved.coordinates.lng;
          // item.address = resolved.formattedAddress; // Optional
        }
      }

      return itineraries;
    }

    const startEnrich = Date.now();
    const enrichedItineraries = await enrichItineraryWithLocations(
      multiItineraryJson.itineraries,
      selectedPlaces
    );
    console.log(`Enrichment complete in ${Date.now() - startEnrich}ms`);

    // Success: return 3 enriched itinerary options
    return res.json({
      success: true,
      data: { itineraries: enrichedItineraries },
    });

  } catch (err) {
    console.error("AI /generateItineraries error:", err);
    return res.status(500).json({ error: err.message || "Itinerary generation error" });
  }
});

module.exports = router;
```

## Server: Itinerary Prompt
File: `server/src/services/ai/prompts/itinerary.prompt.js`

```javascript
// src/services/ai/prompts/itinerary.prompt.js

const systemPrompt = `
You are a travel planning assistant for a trip planning application.

Rules:
- Return ONLY valid JSON (no markdown, no extra text).
- Categories allowed: nature, history & museum, urban.
- visitDurationMin = typical minutes spent at the place (integer minutes).
- If not from the database, placeId must be null.
- Use time slots: morning, afternoon, evening.

CONVERSATION CONTEXT:
- If the user has previous messages in this conversation, they will be provided in the "conversationHistory" field.
- Use this context to understand the user's preferences and reference previous discussions naturally.
- For example, if they previously mentioned "I love beaches", prioritize coastal destinations.
- If they asked about a specific destination earlier, remember that context.

OUTPUT JSON SHAPE (example):
{
  "reply": "string",
  "itineraryPreview": {
    "days": [
      {
        "day": 1,
        "items": [
          {
            "placeId": null,
            "name": "string",
            "category": "nature|history & museum|urban",
            "visitDurationMin": 90,
            "time": "morning|afternoon|evening"
          }
        ]
      }
    ],
    "estimatedTotalCost": 0
  }
}
`.trim();

// KEEP THIS for AJV validation (do NOT send to Gemini in Option A)
const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    itineraryPreview: {
      type: "object",
      additionalProperties: false,
      properties: {
        days: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              day: { type: "integer", minimum: 1 },
              items: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    placeId: { type: ["string", "null"] },
                    name: { type: "string" },
                    category: { type: "string", enum: ["nature", "history & museum", "urban"] },
                    visitDurationMin: { type: "integer", minimum: 15, maximum: 1440 },
                    time: { type: "string", enum: ["morning", "afternoon", "evening"] }
                  },
                  required: ["placeId", "name", "category", "visitDurationMin", "time"]
                }
              }
            },
            required: ["day", "items"]
          }
        },
        estimatedTotalCost: { type: "number", minimum: 0 }
      },
      required: ["days", "estimatedTotalCost"]
    }
  },
  required: ["reply", "itineraryPreview"]
};

module.exports = { systemPrompt, responseSchema };
```

## Server: Visit Routes
File: `server/src/routes/visitRoutes.js`

```javascript
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const VisitLogModel = require("../models/VisitLog");
const VisitTrackerService = require("../services/visitTracker");
const GeofenceService = require("../services/geofenceService");
const VisitLog = require("../models/autoVisitLog");
const supabase = require("../config/supabaseClient");

/**
 * VISIT TRACKING API ROUTES
 */

// Middleware to protect all routes
router.use(authMiddleware);

router.post("/geofence-check", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, itineraryId } = req.body;
    const userId = req.user.id;

    if (!latitude || !longitude || !itineraryId) {
      return res.status(400).json({ error: "Missing coordinates or itinerary" });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const geofenceStatus = await GeofenceService.checkGeofenceStatus(
      userId,
      latitude,
      longitude,
      itineraryId
    );

    // If within geofence and auto-checkin enabled, perform auto check-in
    if (geofenceStatus.isInGeofence) {
      const settings = await GeofenceService.getUserGeofenceSettings(userId);
      if (settings.auto_checkin) {
        const checkInResult = await GeofenceService.autoCheckIn(
          userId,
          itineraryId,
          geofenceStatus.place,
          geofenceStatus.distance,
          { latitude, longitude }
        );
        return res.json({ ...geofenceStatus, ...checkInResult });
      }
    }

    res.json(geofenceStatus);
  } catch (error) {
    console.error("Geofence check error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/check-in", async (req, res) => {
  try {
    const { itineraryId, placeId, placeName, category, location, expectedDuration } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!itineraryId || !placeId || !placeName || !location) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: itineraryId, placeId, placeName, location",
      });
    }

    // Call service
    const result = await VisitTrackerService.handleCheckIn({
      userId,
      itineraryId,
      placeId,
      placeName,
      category,
      location,
      expectedDuration,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("POST /check-in error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.post("/check-out", async (req, res) => {
  try {
    const { visitId, location, userRating, notes, photos } = req.body;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: visitId",
      });
    }

    // Call service
    const result = await VisitTrackerService.handleCheckOut(visitId, {
      location,
      userRating,
      notes,
      photos,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("POST /check-out error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.post("/skip", authMiddleware, async (req, res) => {
  try {
    const { itineraryId, placeId, placeName } = req.body;
    const userId = req.user.id;

    if (!itineraryId || !placeId || !placeName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await GeofenceService.skipPlace(userId, itineraryId, placeId, placeName);

    res.json(result);
  } catch (error) {
    console.error("Skip place error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/logs/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const visits = await VisitLogModel.getItineraryVisits(itineraryId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return res.status(200).json({
      success: true,
      data: visits,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: visits.length,
      },
    });
  } catch (err) {
    console.error("GET /logs/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.get("/current/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const currentVisit = await VisitLogModel.getCurrentVisit(itineraryId);

    if (!currentVisit) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active visit",
      });
    }

    return res.status(200).json({
      success: true,
      data: currentVisit,
    });
  } catch (err) {
    console.error("GET /current/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.get("/stats/:itineraryId", authMiddleware, async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const userId = req.user.id;

    // Validate itinerary ownership
    const { data: itinerary, error: itineraryError } = await supabase
      .from("itineraries")
      .select("user_id")
      .eq("id", itineraryId)
      .single();

    if (itineraryError || !itinerary || itinerary.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const stats = await VisitLog.getStats(itineraryId);

    res.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/progress/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const progress = await VisitLogModel.getProgress(itineraryId);

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (err) {
    console.error("GET /progress/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.get("/summary/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const summary = await VisitLogModel.getTripSummary(itineraryId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error("GET /summary/:itineraryId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.get("/user", async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 50 } = req.query;

    const visits = await VisitLogModel.getUserVisits(userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return res.status(200).json({
      success: true,
      data: visits,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: visits.length,
      },
    });
  } catch (err) {
    console.error("GET /user error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.put("/:visitId", async (req, res) => {
  try {
    const { visitId } = req.params;
    const { userRating, notes, photos } = req.body;

    const result = await VisitTrackerService.addFeedback(visitId, {
      userRating,
      notes,
      photos,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("PUT /:visitId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.delete("/:visitId", async (req, res) => {
  try {
    const { visitId } = req.params;
    const { reason } = req.body;

    const result = await VisitTrackerService.skipPlace(visitId, reason);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("DELETE /:visitId error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

router.delete("/:visitLogId", authMiddleware, async (req, res) => {
  try {
    const { visitLogId } = req.params;
    const userId = req.user.id;

    // Validate ownership
    const visit = await VisitLog.getById(visitLogId);
    if (visit.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await VisitLog.delete(visitLogId);

    res.json({ success: true, message: "Visit log deleted" });
  } catch (error) {
    console.error("Delete visit error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/configure-geofence", authMiddleware, async (req, res) => {
  try {
    const { radius, autoCheckin, autoCheckout } = req.body;
    const userId = req.user.id;

    if (!radius || radius < 50 || radius > 500) {
      return res.status(400).json({ error: "Radius must be between 50-500 meters" });
    }

    // Try to update existing, or create if doesn't exist
    const { data: existing } = await supabase
      .from("geofence_settings")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("geofence_settings")
        .update({
          geofence_radius: radius,
          auto_checkin: autoCheckin !== false,
          auto_checkout: autoCheckout !== false,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } else {
      const { data, error } = await supabase
        .from("geofence_settings")
        .insert({
          user_id: userId,
          geofence_radius: radius,
          auto_checkin: autoCheckin !== false,
          auto_checkout: autoCheckout !== false,
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }
  } catch (error) {
    console.error("Configure geofence error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/settings", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await GeofenceService.getUserGeofenceSettings(userId);

    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Server: Visit Tracker Service
File: `server/src/services/visitTracker.js`

```javascript
const VisitLogModel = require("../models/VisitLog");

/**
 * VISIT TRACKER SERVICE
 * Business logic for visit tracking, geofencing, and location validation
 */

// Constants
const GEOFENCE_RADIUS_BY_CATEGORY = {
  restaurant: 50,
  museum: 100,
  park: 150,
  landmark: 100,
  hotel: 75,
  shop: 50,
  beach: 200,
  airport: 100,
  default: 100,
};

const VISIT_COMPLETION_THRESHOLD = 0.7; // 70% of expected duration
const DEFAULT_EXPECTED_DURATION = 3600; // 1 hour in seconds

class VisitTrackerService {
  /**
   * Handle check-in (start visit)
   */
  static async handleCheckIn(checkInData) {
    try {
      const { userId, itineraryId, placeId, placeName, category, location, expectedDuration } = checkInData;

      // Validate required fields
      if (!userId || !itineraryId || !placeId || !placeName) {
        throw new Error("Missing required check-in fields: userId, itineraryId, placeId, placeName");
      }

      // Validate location
      this.validateLocation(location);

      // Check if user already has an active visit for this place
      const hasActive = await VisitLogModel.hasActiveVisit(userId, placeId);
      if (hasActive) {
        throw new Error(`User already has an active visit for place: ${placeId}`);
      }

      // Determine expected duration
      const finalExpectedDuration = expectedDuration || DEFAULT_EXPECTED_DURATION;

      // Create visit log
      const visitLog = await VisitLogModel.createVisitLog(
        userId,
        itineraryId,
        placeId,
        placeName,
        location,
        finalExpectedDuration
      );

      return {
        success: true,
        message: `Check-in successful for ${placeName}`,
        visit: visitLog,
        expectedDuration: finalExpectedDuration,
      };
    } catch (err) {
      console.error("VisitTrackerService.handleCheckIn error:", err);
      throw err;
    }
  }

  /**
   * Handle check-out (end visit)
   */
  static async handleCheckOut(visitId, exitData) {
    try {
      const { location, userRating, notes, photos } = exitData || {};

      // Validate exit location
      if (location) {
        this.validateLocation(location);
      }

      // Fetch current visit
      const currentVisit = await VisitLogModel.getVisitLog(visitId);
      if (!currentVisit) {
        throw new Error(`Visit not found: ${visitId}`);
      }

      if (currentVisit.status !== "in_progress") {
        throw new Error(`Cannot check out: visit status is ${currentVisit.status}`);
      }

      // Calculate time spent
      const timeSpent = this.calculateTimeSpent(currentVisit.entered_at, new Date().toISOString());

      // Determine completion status
      const isComplete = this.isVisitComplete(timeSpent, currentVisit.expected_duration);

      // Prepare update data
      const updateData = {
        exited_at: new Date().toISOString(),
        time_spent: timeSpent,
        exit_location: location || null,
        status: isComplete ? "completed" : "pending",
      };

      // Add optional fields
      if (userRating !== undefined && userRating !== null) {
        updateData.user_rating = userRating;
      }
      if (notes) {
        updateData.notes = notes;
      }
      if (photos && Array.isArray(photos)) {
        updateData.photos = photos;
      }

      // Update visit log
      const updatedVisit = await VisitLogModel.updateVisitLog(visitId, updateData);

      return {
        success: true,
        message: `Check-out successful. Visit marked as ${updateData.status}`,
        visit: updatedVisit,
        timeSpent,
        isComplete,
        thresholdMet: isComplete,
      };
    } catch (err) {
      console.error("VisitTrackerService.handleCheckOut error:", err);
      throw err;
    }
  }

  /**
   * Calculate time spent in seconds between two timestamps
   */
  static calculateTimeSpent(enteredAt, exitedAt) {
    try {
      const entered = new Date(enteredAt);
      const exited = new Date(exitedAt);
      const diffMs = exited - entered;
      return Math.max(0, Math.round(diffMs / 1000)); // Convert to seconds
    } catch (err) {
      console.error("VisitTrackerService.calculateTimeSpent error:", err);
      throw new Error("Invalid timestamp format");
    }
  }

  /**
   * Determine if visit meets completion threshold
   */
  static isVisitComplete(timeSpent, expectedDuration) {
    if (!expectedDuration) {
      return timeSpent > 0; // Any time at location = complete
    }
    return (timeSpent / expectedDuration) >= VISIT_COMPLETION_THRESHOLD;
  }

  /**
   * Validate GPS coordinates
   */
  static validateLocation(location) {
    if (!location) {
      throw new Error("Location is required");
    }

    const { lat, lng, accuracy } = location;

    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      throw new Error("Invalid latitude: must be between -90 and 90");
    }

    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      throw new Error("Invalid longitude: must be between -180 and 180");
    }

    if (accuracy !== undefined && accuracy !== null && (typeof accuracy !== "number" || accuracy < 0)) {
      throw new Error("Invalid accuracy: must be a positive number");
    }
  }

  /**
   * Determine geofence radius based on place category
   */
  static determineGeofenceRadius(category) {
    return GEOFENCE_RADIUS_BY_CATEGORY[category?.toLowerCase()] || GEOFENCE_RADIUS_BY_CATEGORY.default;
  }

  /**
   * Check if user is within geofence
   */
  static isWithinGeofence(userLocation, geofenceCenter, radius) {
    try {
      const distance = this.calculateDistance(
        userLocation.lat,
        userLocation.lng,
        geofenceCenter.lat,
        geofenceCenter.lng
      );
      return distance <= radius;
    } catch (err) {
      console.error("VisitTrackerService.isWithinGeofence error:", err);
      return false;
    }
  }

  /**
   * Calculate distance between two GPS coordinates (Haversine formula)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get geofence recommendations based on place location
   */
  static getGeofenceConfig(placeLocation, category) {
    return {
      latitude: placeLocation.lat,
      longitude: placeLocation.lng,
      radius: this.determineGeofenceRadius(category),
      status: "active",
      place_category: category || "default",
    };
  }

  /**
   * Add rating and notes to completed visit
   */
  static async addFeedback(visitId, feedbackData) {
    try {
      const { userRating, notes, photos } = feedbackData;

      const visit = await VisitLogModel.getVisitLog(visitId);
      if (!visit) {
        throw new Error(`Visit not found: ${visitId}`);
      }

      const updateData = {};

      if (userRating !== undefined && userRating !== null) {
        if (userRating < 1 || userRating > 5) {
          throw new Error("Rating must be between 1 and 5");
        }
        updateData.user_rating = userRating;
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (photos && Array.isArray(photos)) {
        updateData.photos = photos;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("No feedback data provided");
      }

      const updatedVisit = await VisitLogModel.updateVisitLog(visitId, updateData);

      return {
        success: true,
        message: "Feedback added successfully",
        visit: updatedVisit,
      };
    } catch (err) {
      console.error("VisitTrackerService.addFeedback error:", err);
      throw err;
    }
  }

  /**
   * Skip a place (mark visit as skipped)
   */
  static async skipPlace(visitId, reason) {
    try {
      const visit = await VisitLogModel.getVisitLog(visitId);
      if (!visit) {
        throw new Error(`Visit not found: ${visitId}`);
      }

      const updateData = {
        status: "skipped",
        notes: reason || "Skipped by user",
      };

      // If already checked in, calculate partial time
      if (visit.entered_at && !visit.exited_at) {
        updateData.exited_at = new Date().toISOString();
        updateData.time_spent = this.calculateTimeSpent(visit.entered_at, updateData.exited_at);
      }

      const updatedVisit = await VisitLogModel.updateVisitLog(visitId, updateData);

      return {
        success: true,
        message: "Place skipped successfully",
        visit: updatedVisit,
      };
    } catch (err) {
      console.error("VisitTrackerService.skipPlace error:", err);
      throw err;
    }
  }
}

module.exports = VisitTrackerService;
```


## Server: Geofence Service
File: `server/src/services/geofenceService.js`

```javascript
const supabase = require("../config/supabaseClient");
const GoogleMapsService = require("./googleMapsService");

/**
 * Geofence Service
 * Handles distance calculations, geofence checks, and auto check-in/out logic
 */
class GeofenceService {
  /**
   * Haversine formula: calculate distance between two points in meters
   */
  static haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get user's geofence settings
   */
  static async getUserGeofenceSettings(userId) {
    const { data, error } = await supabase
      .from("geofence_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      const { data: newSettings } = await supabase
        .from("geofence_settings")
        .insert({
          user_id: userId,
          geofence_radius: 100,
          auto_checkin: true,
          auto_checkout: true,
        })
        .select()
        .single();

      if (!newSettings) {
        return {
          user_id: userId,
          geofence_radius: 100,
          auto_checkin: true,
          auto_checkout: true,
        };
      }
      return newSettings;
    }
    return data;
  }

  /**
   * Check geofence status
   */
  static async checkGeofenceStatus(userId, userLat, userLon, itineraryId) {
    try {
      const settings = await this.getUserGeofenceSettings(userId);
      const radius = settings.geofence_radius || 100;

      const { data: itinerary, error: itineraryError } = await supabase
        .from("itineraries")
        .select("selected_places")
        .eq("id", itineraryId)
        .single();

      if (itineraryError || !itinerary) {
        throw new Error("Itinerary not found");
      }

      const places = itinerary.selected_places || [];
      if (places.length === 0) {
        return {
          isInGeofence: false,
          place: null,
          distance: null,
          radius,
          message: "No places in itinerary",
        };
      }

      let nearest = null;
      let minDistance = Infinity;

      for (const place of places) {
        let placeLat, placeLng;

        if (place.coordinates && place.coordinates.latitude && place.coordinates.longitude) {
          placeLat = place.coordinates.latitude;
          placeLng = place.coordinates.longitude;
        } else if (place.placeId) {
          // Fallback: Fetch from Google Maps if missing
          try {
            // We can use a simpler cache check or just call details.
            // GoogleMapsService.getPlaceDetails handles caching internally.
            const details = await GoogleMapsService.getPlaceDetails(place.placeId);
            if (details && details.coordinates) {
              placeLat = details.coordinates.lat;
              placeLng = details.coordinates.lng;
            }
          } catch (err) {
            console.error(`Failed to fetch coords for place ${place.placeId}:`, err.message);
            continue;
          }
        }

        if (!placeLat || !placeLng) continue;

        const distance = this.haversineMeters(
          userLat,
          userLon,
          placeLat,
          placeLng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = { place, distance };
        }

        if (distance <= radius) {
          return {
            isInGeofence: true,
            place,
            distance,
            radius,
            nearest: { place: place.name, distance },
          };
        }
      }

      return {
        isInGeofence: false,
        place: null,
        distance: minDistance === Infinity ? null : minDistance,
        radius,
        nearest: nearest ? { place: nearest.place.name, distance: nearest.distance } : null,
      };
    } catch (error) {
      console.error("Geofence status check error:", error);
      throw error;
    }
  }

  /**
   * Auto check-in
   */
  static async autoCheckIn(userId, itineraryId, place, distance, location) {
    try {
      const { data: existingVisit } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("place_id", place.id)
        .eq("itinerary_id", itineraryId)
        .eq("status", "in_progress")
        .single();

      if (existingVisit) {
        return {
          action: "already_in_progress",
          visitLog: existingVisit,
          isNewCheckIn: false,
        };
      }

      const { data: newVisit, error: insertError } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: place.id,
          place_name: place.name,
          status: "in_progress",
          entered_at: new Date().toISOString(),
          entry_location: location,
          expected_duration: place.visitDurationMin || 60,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        action: "auto_checked_in",
        visitLog: newVisit,
        isNewCheckIn: true,
      };
    } catch (error) {
      console.error("Auto check-in error:", error);
      throw error;
    }
  }

  /**
   * Auto check-out
   */
  static async autoCheckOut(visitLogId, userLat, userLon) {
    try {
      const exitTime = new Date().toISOString();

      const { data: visitLog, error: fetchError } = await supabase
        .from("visit_logs")
        .select("entered_at, status")
        .eq("id", visitLogId)
        .single();

      if (fetchError) throw fetchError;

      if (visitLog.status !== "in_progress") {
        return {
          action: "already_completed",
          visitLog,
          isCheckOut: false,
        };
      }

      const timeSpent = Math.floor(
        (new Date(exitTime) - new Date(visitLog.entered_at)) / 1000
      );

      const { data: updatedVisit, error: updateError } = await supabase
        .from("visit_logs")
        .update({
          exited_at: exitTime,
          status: "completed",
          time_spent: timeSpent,
          exit_location: { latitude: userLat, longitude: userLon },
        })
        .eq("id", visitLogId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        action: "auto_checked_out",
        visitLog: updatedVisit,
        isCheckOut: true,
        timeSpent,
      };
    } catch (error) {
      console.error("Auto check-out error:", error);
      throw error;
    }
  }

  /**
   * Manual check-in
   */
  static async manualCheckIn(userId, itineraryId, placeId, placeName, expectedDuration = 60) {
    try {
      const { data: existing } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .eq("itinerary_id", itineraryId)
        .eq("status", "in_progress")
        .single();

      if (existing) {
        return {
          action: "already_in_progress",
          visitLog: existing,
          isNewCheckIn: false,
        };
      }

      const { data: newVisit, error } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: placeId,
          place_name: placeName,
          status: "in_progress",
          entered_at: new Date().toISOString(),
          expected_duration: expectedDuration,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        action: "manual_checked_in",
        visitLog: newVisit,
        isNewCheckIn: true,
      };
    } catch (error) {
      console.error("Manual check-in error:", error);
      throw error;
    }
  }

  /**
   * Manual check-out
   */
  static async manualCheckOut(visitLogId, userRating = null, notes = null) {
    try {
      const exitTime = new Date().toISOString();

      const { data: visitLog, error: fetchError } = await supabase
        .from("visit_logs")
        .select("entered_at, status")
        .eq("id", visitLogId)
        .single();

      if (fetchError) throw fetchError;

      if (visitLog.status !== "in_progress") {
        return {
          action: "already_completed",
          visitLog,
          isCheckOut: false,
        };
      }

      const timeSpent = Math.floor(
        (new Date(exitTime) - new Date(visitLog.entered_at)) / 1000
      );

      const updatePayload = {
        exited_at: exitTime,
        status: "completed",
        time_spent: timeSpent,
      };

      if (userRating) updatePayload.user_rating = userRating;
      if (notes) updatePayload.notes = notes;

      const { data: updatedVisit, error: updateError } = await supabase
        .from("visit_logs")
        .update(updatePayload)
        .eq("id", visitLogId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        action: "manual_checked_out",
        visitLog: updatedVisit,
        isCheckOut: true,
        timeSpent,
      };
    } catch (error) {
      console.error("Manual check-out error:", error);
      throw error;
    }
  }

  /**
   * Skip a place
   */
  static async skipPlace(userId, itineraryId, placeId, placeName) {
    try {
      const { data: existing } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .eq("itinerary_id", itineraryId)
        .in("status", ["pending", "in_progress"])
        .single();

      if (existing) {
        const { data: updated, error } = await supabase
          .from("visit_logs")
          .update({ status: "skipped" })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return { action: "skipped_existing", visitLog: updated };
      }

      const { data: newSkipped, error } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: placeId,
          place_name: placeName,
          status: "skipped",
          entered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { action: "skipped_new", visitLog: newSkipped };
    } catch (error) {
      console.error("Skip place error:", error);
      throw error;
    }
  }
}

module.exports = GeofenceService;
```

## Server: Visit Log Model
File: `server/src/models/VisitLog.js`

```javascript
const supabase = require("../config/supabaseClient");

/**
 * VISIT LOG MODEL
 * Handles all database operations for visit tracking
 */

class VisitLogModel {
  /**
   * Create a new visit log entry
   */
  static async createVisitLog(userId, itineraryId, placeId, placeName, location, expectedDuration = null) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .insert({
          user_id: userId,
          itinerary_id: itineraryId,
          place_id: placeId,
          place_name: placeName,
          entered_at: new Date().toISOString(),
          status: "in_progress",
          entry_location: location || null,
          expected_duration: expectedDuration,
        })
        .select();

      if (error) {
        console.error("Error creating visit log:", error);
        throw new Error(`Failed to create visit log: ${error.message}`);
      }

      return data[0];
    } catch (err) {
      console.error("VisitLogModel.createVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Get visit log by ID
   */
  static async getVisitLog(visitId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("id", visitId)
        .single();

      if (error) {
        console.error("Error fetching visit log:", error);
        throw new Error(`Failed to fetch visit log: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("VisitLogModel.getVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Update visit log (check-out or add feedback)
   */
  static async updateVisitLog(visitId, updateData) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitId)
        .select();

      if (error) {
        console.error("Error updating visit log:", error);
        throw new Error(`Failed to update visit log: ${error.message}`);
      }

      return data[0];
    } catch (err) {
      console.error("VisitLogModel.updateVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Get all visit logs for an itinerary
   */
  static async getItineraryVisits(itineraryId, options = {}) {
    try {
      const { page = 1, pageSize = 50 } = options;
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("visit_logs")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .order("entered_at", { ascending: false });

      // Add pagination
      if (pageSize) {
        query = query.range(offset, offset + pageSize - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching itinerary visits:", error);
        throw new Error(`Failed to fetch itinerary visits: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("VisitLogModel.getItineraryVisits error:", err);
      throw err;
    }
  }

  /**
   * Get all visit logs for a user
   */
  static async getUserVisits(userId, options = {}) {
    try {
      const { page = 1, pageSize = 50 } = options;
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("visit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("entered_at", { ascending: false });

      if (pageSize) {
        query = query.range(offset, offset + pageSize - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching user visits:", error);
        throw new Error(`Failed to fetch user visits: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("VisitLogModel.getUserVisits error:", err);
      throw err;
    }
  }

  /**
   * Get currently active visit for an itinerary
   */
  static async getCurrentVisit(itineraryId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .eq("status", "in_progress")
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (expected for no active visit)
        console.error("Error fetching current visit:", error);
        throw new Error(`Failed to fetch current visit: ${error.message}`);
      }

      return data || null;
    } catch (err) {
      console.error("VisitLogModel.getCurrentVisit error:", err);
      throw err;
    }
  }

  /**
   * Get visit progress for an itinerary
   */
  static async getProgress(itineraryId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("status, time_spent, expected_duration")
        .eq("itinerary_id", itineraryId);

      if (error) {
        console.error("Error fetching progress:", error);
        throw new Error(`Failed to fetch progress: ${error.message}`);
      }

      const completed = data.filter(v => v.status === "completed").length;
      const inProgress = data.filter(v => v.status === "in_progress").length;
      const pending = data.filter(v => v.status === "pending").length;
      const skipped = data.filter(v => v.status === "skipped").length;
      const total = data.length;

      const totalTimeSpent = data
        .filter(v => v.time_spent)
        .reduce((sum, v) => sum + v.time_spent, 0);

      const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        inProgress,
        pending,
        skipped,
        completionPercent,
        totalTimeSpent,
      };
    } catch (err) {
      console.error("VisitLogModel.getProgress error:", err);
      throw err;
    }
  }

  /**
   * Delete (or skip) a visit log
   */
  static async deleteVisitLog(visitId, markSkipped = true) {
    try {
      if (markSkipped) {
        return await this.updateVisitLog(visitId, { status: "skipped" });
      } else {
        const { data, error } = await supabase
          .from("visit_logs")
          .delete()
          .eq("id", visitId)
          .select();

        if (error) {
          console.error("Error deleting visit log:", error);
          throw new Error(`Failed to delete visit log: ${error.message}`);
        }

        return data[0];
      }
    } catch (err) {
      console.error("VisitLogModel.deleteVisitLog error:", err);
      throw err;
    }
  }

  /**
   * Get summary statistics for a trip
   */
  static async getTripSummary(itineraryId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .order("entered_at", { ascending: true });

      if (error) {
        console.error("Error fetching trip summary:", error);
        throw new Error(`Failed to fetch trip summary: ${error.message}`);
      }

      const completed = data.filter(v => v.status === "completed");
      const total = data.length;
      const totalTimeSpent = data
        .filter(v => v.time_spent)
        .reduce((sum, v) => sum + v.time_spent, 0);

      const ratings = completed
        .filter(v => v.user_rating)
        .map(v => v.user_rating);

      const averageRating = ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null;

      const firstVisit = data[0];
      const lastVisit = data[data.length - 1];

      return {
        totalPlaces: total,
        placesVisited: completed.length,
        completionPercent: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        totalTimeSpent,
        averageTimePerPlace: completed.length > 0 ? Math.round(totalTimeSpent / completed.length) : 0,
        averageRating,
        startTime: firstVisit?.entered_at,
        endTime: lastVisit?.exited_at,
        visits: data,
      };
    } catch (err) {
      console.error("VisitLogModel.getTripSummary error:", err);
      throw err;
    }
  }

  /**
   * Check if user already has an active visit for this place
   */
  static async hasActiveVisit(userId, placeId) {
    try {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .eq("status", "in_progress")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking active visit:", error);
        throw new Error(`Failed to check active visit: ${error.message}`);
      }

      return data !== null && data !== undefined;
    } catch (err) {
      console.error("VisitLogModel.hasActiveVisit error:", err);
      throw err;
    }
  }
}

module.exports = VisitLogModel;
```

## Server: Map Routes
File: `server/src/routes/mapRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const googleMapsService = require('../services/googleMapsService');
const { supabase } = require('../config/supabaseClient');

/**
 * POST /api/map/search-places
 * Search for places using Google Places Autocomplete
 */
router.post('/search-places', async (req, res) => {
  try {
    const { query, location } = req.body;
    
    if (!query || query.length < 3) {
      return res.status(400).json({ 
        error: 'Query must be at least 3 characters' 
      });
    }
    
    const results = await googleMapsService.searchPlaces(query, location);
    
    res.json({
      success: true,
      results: results,
      cached: false
    });
  } catch (error) {
    console.error('Search places error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        retryAfter: 'tomorrow'
      });
    }
    
    res.status(500).json({ 
      error: 'Search failed. Please try again.' 
    });
  }
});

/**
 * GET /api/map/place-details/:placeId
 * Get detailed information about a specific place
 */
router.get('/place-details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({ error: 'Place ID required' });
    }
    
    const details = await googleMapsService.getPlaceDetails(placeId);
    
    res.json({
      success: true,
      place: details
    });
  } catch (error) {
    console.error('Place details error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        retryAfter: 'tomorrow'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch place details' 
    });
  }
});

/**
 * POST /api/map/generate-route
 * Generate route between waypoints
 */
router.post('/generate-route', async (req, res) => {
  try {
    const { waypoints, transportMode = 'walking' } = req.body;
    
    if (!waypoints || waypoints.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 waypoints required' 
      });
    }
    
    const route = await googleMapsService.generateRoute(waypoints, transportMode);
    
    res.json({
      success: true,
      route: route
    });
  } catch (error) {
    console.error('Route generation error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        retryAfter: 'tomorrow'
      });
    }
    
    res.status(500).json({ 
      error: 'Route generation failed' 
    });
  }
});

/**
 * POST /api/map/create-manual-itinerary
 * Create a manually planned itinerary
 */
router.post('/create-manual-itinerary', async (req, res) => {
  try {
    const { trip_name, days, user_id } = req.body;
    
    if (!trip_name || !days || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: trip_name, days, user_id' 
      });
    }
    
    // Flatten all places from all days
    const allPlaces = days.flatMap(day => 
      day.places.map((place, index) => ({
        ...place,
        day: day.day,
        order: index + 1
      }))
    );
    
    // Generate routes for each day
    const routesByDay = {};
    
    for (const day of days) {
      if (day.places.length >= 2) {
        const waypoints = day.places.map(p => p.placeId || { lat: p.lat, lng: p.lng });
        const route = await googleMapsService.generateRoute(waypoints, 'walking');
        routesByDay[`day${day.day}`] = route;
      }
    }
    
    // Save to database
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .insert({
        user_id: user_id,
        trip_name: trip_name,
        selected_places: allPlaces,
        map_routes: routesByDay,
        creation_method: 'manual',
        transport_mode: 'walking',
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save itinerary');
    }
    
    res.json({
      success: true,
      itinerary: itinerary
    });
  } catch (error) {
    console.error('Create manual itinerary error:', error);
    res.status(500).json({ 
      error: 'Failed to create itinerary' 
    });
  }
});

/**
 * PUT /api/map/itinerary/:id/reorder
 * Update place order within a day
 */
router.put('/itinerary/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { day, places } = req.body;
    
    // Fetch current itinerary
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    
    // Update places for this day
    let updatedPlaces = itinerary.selected_places || [];
    updatedPlaces = updatedPlaces.filter(p => p.day !== day);
    updatedPlaces.push(...places.map((p, index) => ({ ...p, day, order: index + 1 })));
    
    // Recalculate route for this day
    const waypoints = places.map(p => p.placeId || { lat: p.lat, lng: p.lng });
    const newRoute = await googleMapsService.generateRoute(waypoints, itinerary.transport_mode || 'walking');
    
    const updatedRoutes = itinerary.map_routes || {};
    updatedRoutes[`day${day}`] = newRoute;
    
    // Update database
    const { data: updated, error: updateError } = await supabase
      .from('itineraries')
      .update({
        selected_places: updatedPlaces,
        map_routes: updatedRoutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      throw new Error('Failed to update itinerary');
    }
    
    res.json({
      success: true,
      itinerary: updated
    });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ 
      error: 'Failed to reorder places' 
    });
  }
});

module.exports = router;
```

---
**End of Context Progress File**
This file marks the completion of the "Expanding Context File" task. It includes the full code for all key client and server components modified between Step 760 and Step 990 (Phases 3 and 4).

