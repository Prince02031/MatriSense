"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  closestCorners
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";

// Components
import ItinerarySetup from "./components/ItinerarySetup";
import ItinerarySidebar from "./components/ItinerarySidebar";
import DayTabs from "./components/DayTabs";
import TimelineView from "./components/TimelineView";
import ResourcePanel from "./components/ResourcePanel";
import PrintView from "./components/PrintView";
import MapComponent from "../components/MapComponent";
import LocationModal from "../components/LocationModal";
import ClusteringView from "../components/ClusteringView";
import MultiOptionSelector from "../components/MultiOptionSelector";
import ConfirmationModal from "../components/ConfirmationModal";
import { VisitTrackingPanel } from "../components/visit/VisitTrackingPanel";
import { useGeofencing } from "../hooks/useGeofencing";

// Icons & UI
import { Menu, Map as MapIcon, List, Sparkles, Printer } from "lucide-react";

// Types
type ItineraryItem = {
  id: string;
  name: string;
  placeId?: string;
  category?: string;
  visitDurationMin?: number;
  time?: string;
  description?: string;
  images?: string[];
  reviews?: any[];
  source?: "db" | "ai";
  lat?: number;
  lng?: number;
  isBreak?: boolean;
  isCommute?: boolean;
  commuteMode?: "transit" | "driving";
  commuteDurationMin?: number;
  country?: string;
  entryCost?: number | null;
  currency?: string;
};

type Trip = {
  id: string;
  tripName: string;
  startDate?: string;
  status: "draft" | "confirmed" | "completed" | "active";
  trip_status?: "planning" | "active" | "completed" | "cancelled";
  days: number;
  travelers: number;
  schedule: Record<number, ItineraryItem[]>;
};

export default function PlannerPage() {
  const router = useRouter();

  // --- STATE ---

  // 1. Navigation / View Modes
  const [showSetup, setShowSetup] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"itinerary" | "map">("itinerary");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 2. Data
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  // True when the active trip is a shared group trip — locks switching & creation
  const [isGroupTrip, setIsGroupTrip] = useState(false);
  // The ID of the group trip (persists even when user browses another trip)
  const [groupTripId, setGroupTripId] = useState<string | null>(null);

  // Derived active trip
  const activeTrip = trips.find(t => t.id === activeTripId) || null;

  // 3. Active Trip State
  const [currentDay, setCurrentDay] = useState(1);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [dayStartTime, setDayStartTime] = useState("04:00");
  const [showPrintView, setShowPrintView] = useState(false);

  // 4. Resource Panel State
  const [activeRightTab, setActiveRightTab] = useState<"chat" | "destinations" | "summaries" | "visits">("chat");
  const [destinationsView, setDestinationsView] = useState<"search" | "collections">("search");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [searchResults, setSearchResults] = useState<ItineraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSource, setSearchSource] = useState<"google" | "db">("google");
  const [collections, setCollections] = useState<ItineraryItem[]>([]);

  // 5. Chat & AI State
  const [loading, setLoading] = useState(false);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true);

  // 6. Clustering State (Stage 1)
  const [stage, setStage] = useState<"chat" | "clustering" | "options" | "confirmation">("chat");
  const [clusteringData, setClusteringData] = useState<any>(null);
  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [aiClusteringEnabled, setAiClusteringEnabled] = useState(false); // user-controlled toggle
  const [exploreSurroundings, setExploreSurroundings] = useState(true); // strict vs broad search

  // 7. Itinerary Generation State (Stage 2)
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [itineraryOptions, setItineraryOptions] = useState<any[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [customRequirements, setCustomRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");

  // 8. Saved Itinerary State
  const [savedItinerary, setSavedItinerary] = useState<any>(null);
  const [savedItineraryId, setSavedItineraryId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayCheckboxes, setDayCheckboxes] = useState<{ [key: string]: boolean }>({});

  // 9. Visit Tracking
  const [visitCount, setVisitCount] = useState(0);

  // 10. Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);
  const [mockLocation, setMockLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // 11. Drag & Drop State
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // 12. Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ItineraryItem | null>(null);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  );

  // Geofencing Hook
  const { userLocation } = useGeofencing({
    itineraryId: savedItineraryId || undefined,
    enabled: !!savedItineraryId,
    autoCheckin: true,
    mockLocation: mockLocation
  });

  // --- EFFECTS ---

  // Load Trips on mount
  useEffect(() => {
    loadTrips();
    // Load collections from localStorage
    const savedCollections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');
    if (savedCollections.length > 0) {
      setCollections(savedCollections);
    }
  }, []);

  // Load chat history when active trip changes (scoped by trip ID)
  useEffect(() => {
    if (activeTripId) {
      loadChatHistory(activeTripId);
    } else {
      setChatMessages([]);
      setChatHistoryLoading(false);
    }
  }, [activeTripId]);

  // Simulation Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const allItems = activeTrip ? Object.values(activeTrip.schedule).flat() : [];

    if (isSimulating && allItems.length > 0) {
      interval = setInterval(() => {
        setSimulationIndex(prev => {
          const next = prev + 1;
          if (next >= allItems.length) {
            setIsSimulating(false);
            return prev;
          }
          const item = allItems[next];
          if (item.lat && item.lng) {
            setMockLocation({ lat: item.lat, lng: item.lng });
          }
          return next;
        });
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [isSimulating, activeTrip]);

  // --- DATA LOADERS ---

  // Normalize schedule from backend — may be array [{day, items}] or Record<number, Item[]>
  const normalizeSchedule = (raw: any, days: number): Record<number, ItineraryItem[]> => {
    const schedule: Record<number, ItineraryItem[]> = {};
    // Initialize empty days
    for (let i = 1; i <= days; i++) schedule[i] = [];

    if (Array.isArray(raw)) {
      // AI format: [{day: 1, items: [{name, category, ...}]}]
      for (const dayObj of raw) {
        const dayNum = dayObj.day || 1;
        const items = (dayObj.items || []).map((ai: any, idx: number) => ({
          id: ai.id || `loaded-${dayNum}-${idx}-${Date.now()}`,
          name: ai.name || ai.place || "Unnamed",
          placeId: ai.placeId || undefined,
          lat: ai.lat || ai.coordinates?.latitude || undefined,
          lng: ai.lng || ai.coordinates?.longitude || undefined,
          category: ai.category || ai.activity || "place",
          visitDurationMin: ai.visitDurationMin || 60,
          time: ai.time || ai.timeRange?.split("-")[0] || "09:00",
          description: ai.notes || ai.description || "",
          isBreak: ai.isBreak || false,
          source: (ai.source || "db") as "db" | "ai",
        }));
        schedule[dayNum] = items;
      }
    } else if (raw && typeof raw === "object") {
      // Record format: {"1": [...], "2": [...]}
      for (const key of Object.keys(raw)) {
        const dayNum = Number(key);
        if (isNaN(dayNum)) continue;
        const items = Array.isArray(raw[key]) ? raw[key].map((ai: any, idx: number) => ({
          id: ai.id || `loaded-${dayNum}-${idx}-${Date.now()}`,
          name: ai.name || "Unnamed",
          placeId: ai.placeId || undefined,
          lat: ai.lat || ai.coordinates?.latitude || undefined,
          lng: ai.lng || ai.coordinates?.longitude || undefined,
          category: ai.category || "place",
          visitDurationMin: ai.visitDurationMin || 60,
          time: ai.time || "09:00",
          description: ai.description || "",
          isBreak: ai.isBreak || false,
          source: (ai.source || "db") as "db" | "ai",
        })) : [];
        schedule[dayNum] = items;
      }
    }

    return schedule;
  };

  const loadTrips = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // ── Priority 1: active group trip ────────────────────────────────────
      const groupRes = await fetch("http://localhost:4000/api/groups/mine/active", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        if (groupData.success && groupData.group && groupData.itinerary) {
          const itin = groupData.itinerary;
          const selectedItin = itin.selected_itinerary;
          const days = selectedItin?.days || 3;
          const groupTrip: Trip = {
            id: itin.id,
            tripName: `[Group] ${groupData.group.title}`,
            startDate: selectedItin?.startDate || "2024-06-01",
            days,
            travelers: selectedItin?.travelers || 1,
            status: "confirmed",
            schedule: normalizeSchedule(selectedItin?.schedule, days),
          };
          setSavedItineraryId(itin.id);
          setSavedItinerary({
            id: itin.id,
            tripName: groupTrip.tripName,
            title: selectedItin?.title,
            description: selectedItin?.description,
            paceDescription: selectedItin?.paceDescription,
            estimatedCost: selectedItin?.estimatedCost,
            schedule: Array.isArray(selectedItin?.schedule) ? selectedItin.schedule : [],
          });
          setIsGroupTrip(true);
          setGroupTripId(groupTrip.id);
          setActiveTripId(groupTrip.id);

          // Also load personal trips so they appear in the sidebar (just not active)
          try {
            const personalRes = await fetch("http://localhost:4000/api/trips", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (personalRes.ok) {
              const personalData = await personalRes.json();
              const personalTrips = (personalData.success && personalData.data)
                ? personalData.data.map((t: any) => {
                    const d = t.selected_itinerary?.days || 3;
                    return {
                      id: t.id,
                      tripName: t.trip_name,
                      startDate: t.selected_itinerary?.startDate || "2024-06-01",
                      days: d,
                      travelers: t.selected_itinerary?.travelers || 1,
                      status: t.status || "draft",
                      trip_status: t.trip_status || "planning",
                      schedule: normalizeSchedule(t.selected_itinerary?.schedule, d),
                    };
                  })
                : [];
              // Group trip pinned first, personal trips follow — dedupe by ID
              const combined = [groupTrip, ...personalTrips];
              const seen = new Set<string>();
              const deduped = combined.filter(t => {
                if (seen.has(t.id)) return false;
                seen.add(t.id);
                return true;
              });
              setTrips(deduped);
            } else {
              setTrips([groupTrip]);
            }
          } catch {
            setTrips([groupTrip]);
          }
          return;
        }
      }

      // ── Priority 2: personal itineraries ─────────────────────────────────
      setIsGroupTrip(false);
      setGroupTripId(null);
      const res = await fetch("http://localhost:4000/api/trips", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const loadedTrips = data.data.map((t: any) => {
            const days = t.selected_itinerary?.days || 3;
            return {
              id: t.id,
              tripName: t.trip_name,
              startDate: t.selected_itinerary?.startDate || "2024-06-01",
              days,
              travelers: t.selected_itinerary?.travelers || 1,
              status: t.status || "draft",
              trip_status: t.trip_status || "planning",
              schedule: normalizeSchedule(t.selected_itinerary?.schedule, days)
            };
          });
          setTrips(loadedTrips);

          if (loadedTrips.length > 0) {
            // Prefer whichever trip was last marked active; fall back to first non-completed
            const wasActive = loadedTrips.find((t: any) => t.trip_status === "active");
            const firstPlanning = loadedTrips.find((t: any) => t.status !== "completed");
            const toActivate = wasActive || firstPlanning;
            if (toActivate) setActiveTripId(toActivate.id);
            else setShowSetup(true);
          } else {
            setShowSetup(true);
          }
        }
      }
    } catch (e) { console.error("Failed to load trips", e); }
  };

  const loadChatHistory = async (tripId: string) => {
    setChatHistoryLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // For logged-out users, try localStorage scoped to trip
        const savedChat = localStorage.getItem(`guestChat_${tripId}`);
        if (savedChat) {
          try {
            const parsed = JSON.parse(savedChat);
            setChatMessages(parsed.map((m: any) => ({
              ...m,
              cards: (m.cards || []).map((c: any, cIdx: number) => ({
                ...c,
                id: c.id || `guest-card-${Date.now()}-${cIdx}-${Math.random()}`
              }))
            })));
          }
          catch { setChatMessages([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]); }
        } else {
          setChatMessages([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]);
        }
        setChatHistoryLoading(false);
        return;
      }

      // Migrate guest chat for this trip if exists
      const guestChat = localStorage.getItem(`guestChat_${tripId}`);
      if (guestChat) {
        try {
          const parsedGuestChat = JSON.parse(guestChat);
          for (const msg of parsedGuestChat) {
            if (msg.sender && msg.text) {
              await fetch("http://localhost:4000/api/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  message: msg.text,
                  role: msg.sender === "user" ? "user" : "ai",
                  sessionId: tripId,
                  metadata: { cards: msg.cards || [], migratedFromGuest: true }
                })
              });
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          localStorage.removeItem(`guestChat_${tripId}`);
        } catch (e) { console.error("Error migrating guest chat:", e); }
      }

      // Load chat history scoped to this trip (using sessionId)
      const res = await fetch(`http://localhost:4000/api/chat/history?limit=50&sessionId=${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const msgs = data.data.map((m: any) => ({
            id: m.id,
            text: m.message,
            sender: m.role === 'user' ? 'user' : 'ai',
            cards: (m.metadata?.cards || []).map((c: any, cIdx: number) => ({
              ...c,
              id: c.id || `history-card-${Date.now()}-${cIdx}-${Math.random()}`
            })),
            bullets: m.metadata?.bullets || []
          }));
          setChatMessages(msgs);
        } else {
          setChatMessages([{ id: "init", text: "Hello! Where are we going?", sender: "ai" }]);
        }
      } else {
        setChatMessages([{ id: "init", text: "Hello! Where are we going?", sender: "ai" }]);
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
      setChatMessages([{ id: "init", text: "Hello! Where are we going?", sender: "ai" }]);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  // --- HELPERS ---

  const recalculateDayTimes = (items: ItineraryItem[], startTime?: string): ItineraryItem[] => {
    const effectiveStart = startTime || dayStartTime || "04:00";
    let currentTime = new Date(`2000-01-01T${effectiveStart}`);
    return items.map((item, idx) => {
      const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const duration = item.isCommute ? (item.commuteDurationMin || 15) : (item.visitDurationMin || 60);
      currentTime.setMinutes(currentTime.getMinutes() + duration);
      return { ...item, time: timeStr };
    });
  };

  // --- Insert commute cards between activities that have coordinates ---
  const insertCommutes = (items: ItineraryItem[]): ItineraryItem[] => {
    if (items.length < 2) return items;
    const result: ItineraryItem[] = [];
    for (let i = 0; i < items.length; i++) {
      result.push(items[i]);
      // Don't add commute after the last item, after breaks, after commutes, or if next is a commute
      if (i < items.length - 1 && !items[i].isBreak && !items[i].isCommute && !items[i + 1].isCommute) {
        const hasCoords = items[i].lat && items[i].lng && items[i + 1].lat && items[i + 1].lng;
        result.push({
          id: `commute-${items[i].id}-${items[i + 1].id}`,
          name: 'Travel',
          isCommute: true,
          commuteMode: 'transit',
          commuteDurationMin: hasCoords ? 20 : 15, // Estimate; can be refined via Directions API
          category: 'commute',
        });
      }
    }
    return result;
  };

  // Helper to safely get day items (schedule keys can be numbers or strings from backend)
  const getDayItems = (schedule: Record<number | string, ItineraryItem[]>, day: number): ItineraryItem[] => {
    const raw = schedule[day] ?? schedule[String(day)];
    return Array.isArray(raw) ? raw : [];
  };

  // --- ACTIONS ---

  // Switch the active trip — updates trip_status in DB (skip for group trips)
  const handleSelectTrip = async (id: string) => {
    const token = localStorage.getItem("token");
    if (token && !isGroupTrip) {
      // Demote old active trip back to planning
      if (activeTripId && activeTripId !== id) {
        fetch(`http://localhost:4000/api/trips/${activeTripId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ trip_status: "planning" })
        }).catch(() => {});
        setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, trip_status: "planning" as const } : t));
      }
      // Promote new trip to active
      fetch(`http://localhost:4000/api/trips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trip_status: "active" })
      }).catch(() => {});
      setTrips(prev => prev.map(t => t.id === id ? { ...t, trip_status: "active" as const } : t));
    }
    setActiveTripId(id);
  };

  const handleCreateTrip = async (data: { title: string; days: number; travelers: number; startDate: string }) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to create a trip");
      return;
    }

    const schedule: Record<number, ItineraryItem[]> = {};
    for (let i = 1; i <= data.days; i++) schedule[i] = [];

    const newTripPayload = {
      tripName: data.title,
      selectedPlaces: [],
      status: "draft",
      // When group trip is active, new personal trips stay as planning (not activated)
      trip_status: isGroupTrip ? "planning" : "active",
      selectedItinerary: {
        title: data.title,
        days: data.days,
        travelers: data.travelers,
        startDate: data.startDate,
        schedule: schedule
      }
    };

    try {
      // Demote current active trip to planning before creating a new active one
      if (!isGroupTrip && activeTripId) {
        fetch(`http://localhost:4000/api/trips/${activeTripId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ trip_status: "planning" })
        }).catch(() => {});
        setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, trip_status: "planning" as const } : t));
      }
      const res = await fetch("http://localhost:4000/api/trips/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTripPayload)
      });
      if (res.ok) {
        const json = await res.json();
        const createdTrip = {
          id: json.data.id || "temp-id",
          tripName: data.title,
          days: data.days,
          travelers: data.travelers,
          startDate: data.startDate,
          status: "draft" as const,
          trip_status: (isGroupTrip ? "planning" : "active") as "planning" | "active",
          schedule: schedule
        };
        setTrips([createdTrip, ...trips]);
        if (!isGroupTrip) setActiveTripId(createdTrip.id); // keep group trip active if locked
        setShowSetup(false);
      }
    } catch (e) {
      console.error("Error creating trip", e);
    }
  };

  // --- HANDLER: VIEW DETAILS ---
  const handleViewDetails = (item: ItineraryItem) => {
    setSelectedLocation(item);
    setLocationModalOpen(true);
  };

  // --- HANDLER: ADD TO COLLECTIONS ---
  const handleAddToCollections = (card: ItineraryItem) => {
    if (!collections.find(c => c.name === card.name)) {
      const newCollections = [...collections, { ...card, id: `col-${Date.now()}-${Math.random()}` }];
      setCollections(newCollections);
      localStorage.setItem('odyssey_collections', JSON.stringify(newCollections));
    }
  };

  // --- HANDLER: REMOVE FROM COLLECTIONS ---
  const handleRemoveFromCollections = (itemId: string) => {
    const newCollections = collections.filter(i => i.id !== itemId);
    setCollections(newCollections);
    localStorage.setItem('odyssey_collections', JSON.stringify(newCollections));
  };

  // --- HANDLER: SEND MESSAGE (AI) ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { id: Date.now().toString(), text: chatInput, sender: "user" };
    setChatMessages(prev => {
      const newChat = [...prev, userMsg];
      // Save to localStorage for logged-out users (scoped to trip)
      const token = localStorage.getItem("token");
      if (!token && activeTripId) {
        localStorage.setItem(`guestChat_${activeTripId}`, JSON.stringify(newChat));
      }
      return newChat;
    });
    setChatInput("");
    setLoading(true);

    // Save user message to database (scoped to trip via sessionId)
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("http://localhost:4000/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: userMsg.text, role: "user", sessionId: activeTripId })
        });
      } catch (err) { console.error("Error saving user message:", err); }
    }

    // Build temp history for logged-out users
    let tempConversationHistory: any[] = [];
    if (!token) {
      const recentMessages = chatMessages.slice(-10);
      tempConversationHistory = recentMessages.map(msg => ({
        message: msg.text,
        role: msg.sender === "user" ? "user" : "ai",
        created_at: new Date().toISOString()
      }));
    }

    try {
      // Check if this is a clustering request
      // (Bypass the old fragile keyword heuristics — if the toggle is ON, trigger clustering)
      const isClusteringRequest = aiClusteringEnabled;

      if (isClusteringRequest) {
        setClusteringLoading(true);
        const clusterRes = await fetch("http://localhost:4000/api/clustering/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
          body: JSON.stringify({ message: userMsg.text, userContext: { budget: "medium", pace: "moderate", exploreSurroundings } })
        });

        if (clusterRes.ok) {
          const clusterData = await clusterRes.json();
          setClusteringData(clusterData.data);
          setStage("clustering");

          const aiMessage = "I've analyzed your request and found these place clusters. Select the ones you'd like to visit!";
          setChatMessages(prev => {
            const newChat = [...prev, { id: Date.now().toString() + "ai", text: aiMessage, sender: "ai", cards: [], hasClustering: true }];
            if (!token && activeTripId) localStorage.setItem(`guestChat_${activeTripId}`, JSON.stringify(newChat));
            return newChat;
          });

          if (token) {
            try {
              await fetch("http://localhost:4000/api/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: aiMessage, role: "ai", sessionId: activeTripId })
              });
            } catch (err) { console.error("Error saving AI message:", err); }
          }

          setClusteringLoading(false);
          setLoading(false);
          return;
        }
      }

      // Regular chat flow
      const res = await fetch("http://localhost:4000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          message: userMsg.text,
          collections,
          itinerary: activeTrip ? Object.values(activeTrip.schedule).flat() : [],
          conversationHistory: tempConversationHistory
        })
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      let aiCards: ItineraryItem[] = [];
      if (data.cards) {
        aiCards = data.cards.map((c: any, cIdx: number) => ({
          ...c,
          id: c.id || `ai-card-${Date.now()}-${cIdx}-${Math.random()}`
        }));
      }
      if (data.itineraryPreview?.days) {
        data.itineraryPreview.days.forEach((day: any) => {
          if (day.items) {
            day.items.forEach((item: any) => {
              aiCards.push({
                ...item,
                id: `ai-${Date.now()}-${Math.random()}`,
                description: `Day ${day.day} - ${item.time || 'Visit'}`,
                source: "ai"
              });
            });
          }
        });
      }

      const aiMessage = data.message || data.reply || "Here is a plan for you.";
      setChatMessages(prev => {
        const newChat = [...prev, { id: Date.now().toString() + "ai", text: aiMessage, sender: "ai", cards: aiCards, bullets: data.bullets || [] }];
        if (!token && activeTripId) localStorage.setItem(`guestChat_${activeTripId}`, JSON.stringify(newChat));
        return newChat;
      });

      // Save AI response to backend
      if (token && activeTripId) {
        try {
          await fetch("http://localhost:4000/api/chat/message", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ message: aiMessage, role: "ai", sessionId: activeTripId, metadata: { cards: aiCards, bullets: data.bullets || [] } })
          });
        } catch (err) { console.error("Error saving AI response:", err); }
      }

    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { id: "err", text: "Error connecting to AI.", sender: "ai" }]);
    } finally {
      setLoading(false);
      setClusteringLoading(false);
    }
  };

  // --- HANDLER: Clustering Continue (Stage 1 → Stage 2) ---
  const handleClusteringContinue = (selectedPlaces: any[]) => {
    const newPlaces = selectedPlaces.map((place: any) => ({
      id: `cluster-${Date.now()}-${Math.random()}`,
      name: place.name,
      category: place.category,
      source: "ai" as const
    }));
    setCollections(prev => {
      const updated = [...prev, ...newPlaces];
      localStorage.setItem('odyssey_collections', JSON.stringify(updated));
      return updated;
    });

    setChatMessages(prev => [...prev, {
      id: Date.now().toString() + "ai",
      text: `Great! I've added ${selectedPlaces.length} place(s) to your collection. Drag and drop them into your itinerary, then click "Generate Itineraries" to see multiple options!`,
      sender: "ai", cards: []
    }]);

    setStage("chat");
    setClusteringData(null);
  };

  // --- HANDLER: Generate Itineraries (Stage 2) ---
  const handleGenerateItineraries = async () => {
    if (collections.length === 0) {
      alert("Please add places to your collections first!");
      return;
    }

    setOptionsLoading(true);
    setStage("options");

    try {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString() + "thinking",
        text: "Generating itineraries based on your collections...",
        sender: "ai", cards: []
      }]);

      const res = await fetch("http://localhost:4000/api/ai/generateItineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPlaces: collections.map(item => ({
            name: item.name,
            category: item.category || "place",
            placeId: item.placeId || undefined,
            lat: item.lat || undefined,
            lng: item.lng || undefined,
            country: item.country || undefined,
          })),
          tripDuration: activeTrip?.days || 3,
          userContext: { budget: "medium", pace: "moderate" },
          customRequirements: customRequirements.length > 0 ? customRequirements.join(" | ") : undefined
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to generate itineraries");
      setItineraryOptions(data.data.itineraries);

      setChatMessages(prev => [...prev, {
        id: Date.now().toString() + "options",
        text: `Perfect! I've created 3 itinerary options for you. Review them below and select your preferred option!`,
        sender: "ai", cards: []
      }]);
    } catch (err) {
      console.error(err);
      alert("Error generating itineraries: " + (err as any).message);
      setStage("chat");
    } finally {
      setOptionsLoading(false);
    }
  };

  // --- HANDLER: Confirm & Save Itinerary ---
  const handleConfirmItinerary = async (finalTripName: string) => {
    if (!selectedItinerary) { alert("No itinerary selected"); return; }
    if (!activeTrip) { alert("No active trip to confirm"); return; }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        const confirmRedirect = confirm("You need to login to save your itinerary.\n\nClick OK to go to login.");
        if (confirmRedirect) router.push("/login?from=planner2");
        return;
      }

      const newTripName = finalTripName || activeTrip.tripName || "My Trip";

      // --- Merge AI schedule into local trip timeline ---
      let newSchedule: Record<number, ItineraryItem[]> = { ...activeTrip.schedule };

      if (selectedItinerary.schedule && Array.isArray(selectedItinerary.schedule)) {
        // Build a lookup of original items by normalized name for placeId/coords injection
        // Include both current timeline items AND collections (since generation now uses collections)
        const timelineItems = Object.values(activeTrip.schedule).flat();
        const originalItems = [...timelineItems, ...collections];

        const originalLookup = new Map<string, ItineraryItem>();
        for (const item of originalItems) {
          if (item.name) originalLookup.set(item.name.toLowerCase().trim(), item);
        }

        const rebuiltSchedule: Record<number, ItineraryItem[]> = {};
        for (const dayObj of selectedItinerary.schedule) {
          const dayNum = dayObj.day || 1;
          const items: ItineraryItem[] = (dayObj.items || []).map((ai: any, idx: number) => {
            const aiName = (ai.name || ai.place || "Unnamed").toLowerCase().trim();
            const original = originalLookup.get(aiName);
            return {
              id: `ai-${dayNum}-${idx}-${Date.now()}`,
              name: ai.name || ai.place || "Unnamed",
              placeId: ai.placeId || original?.placeId || undefined,
              lat: ai.lat || original?.lat || undefined,
              lng: ai.lng || original?.lng || undefined,
              category: ai.category || ai.activity || "place",
              visitDurationMin: ai.visitDurationMin || original?.visitDurationMin || 60,
              time: ai.timeRange?.split("-")[0] || "09:00",
              description: ai.notes || "",
              source: "ai" as const,
              entryCost: ai.entryCost ?? null,
              currency: ai.currency || selectedItinerary.currency || undefined,
            };
          });
          rebuiltSchedule[dayNum] = recalculateDayTimes(items);
        }
        newSchedule = rebuiltSchedule;
      }

      const updatedTrip = { ...activeTrip, tripName: newTripName, schedule: newSchedule };
      setTrips(trips.map(t => t.id === updatedTrip.id ? updatedTrip : t));

      setSavedItineraryId(updatedTrip.id);
      setSavedItinerary({
        id: updatedTrip.id,
        tripName: newTripName,
        title: selectedItinerary.title,
        description: selectedItinerary.description,
        paceDescription: selectedItinerary.paceDescription,
        estimatedCost: selectedItinerary.estimatedCost,
        schedule: newSchedule
      });

      setChatMessages(prev => [...prev, {
        id: Date.now().toString() + "saved",
        text: `✅ Trip saved successfully! The itinerary has been placed in your timeline.`,
        sender: "ai", cards: []
      }]);

      setConfirmationOpen(false);
      setStage("chat");
      setSelectedItinerary(null);
      setItineraryOptions([]);

      // Persist the changes to the database
      await saveTrip(updatedTrip);

    } catch (err) {
      console.error("Error saving trip:", err);
      alert(`Error saving trip: ${(err as any).message}`);
    }
  };

  // --- HANDLER: Edit & Regenerate ---
  const handleEditAndRegenerate = () => {
    setConfirmationOpen(false);
    setStage("chat");
    setItineraryOptions([]);
    setSelectedItinerary(null);
    setCustomRequirements([]);
    setChatMessages(prev => [...prev, {
      id: Date.now().toString() + "edit",
      text: "Great! You can now:\n1. Add or remove places from your itinerary\n2. Add custom requirements\n\nWhen ready, click 'Generate Itineraries' again!",
      sender: "ai", cards: []
    }]);
  };

  // --- HANDLER: Custom Requirements ---
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
      if (searchSource === "google") {
        const res = await fetch(`http://localhost:4000/api/map/search-places`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery })
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const places = (data.results || []).map((p: any) => ({
          id: p.place_id || `search-${Date.now()}-${Math.random()}`,
          name: p.name,
          placeId: p.place_id,
          category: p.types?.[0] || 'Place',
          visitDurationMin: 60,
          description: p.formatted_address || '',
          images: p.photos && p.photos.length > 0 ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`] : [],
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          source: 'db' as const,
        }));
        setSearchResults(places);
      } else {
        const res = await fetch(`http://localhost:4000/api/places?search_query=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const places = (data.places || []).map((p: any) => ({
          id: p.id || `db-${Date.now()}-${Math.random()}`,
          name: p.name,
          placeId: p.place_id || p.id,
          category: p.type || 'Place',
          visitDurationMin: 60,
          description: p.short_desc || '',
          images: p.img_url ? [p.img_url] : [`https://source.unsplash.com/400x300/?${p.name}`],
          lat: p.latitude,
          lng: p.longitude,
          country: p.country || undefined,
          source: 'db' as const,
        }));
        setSearchResults(places);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    }
  };

  // --- HANDLER: Add Meal Break ---
  const handleAddMealBreak = (day: number, afterIndex?: number) => {
    if (!activeTrip) return;
    const breakItem: ItineraryItem = {
      id: `break-${Date.now()}-${Math.random()}`,
      name: 'Meal Break',
      category: 'Break',
      visitDurationMin: 60,
      isBreak: true,
      source: 'db',
    };
    const currentList = getDayItems(activeTrip.schedule, day).filter(i => !i.isCommute);
    let newList: ItineraryItem[];
    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < currentList.length) {
      // Insert after the specified index
      newList = [...currentList.slice(0, afterIndex + 1), breakItem, ...currentList.slice(afterIndex + 1)];
      
      // If the preceding item has coordinates, try to search for nearby restaurants
      const precedingItem = currentList[afterIndex];
      if (precedingItem?.lat && precedingItem?.lng) {
        // Fire off nearby search (non-blocking) — update the break item with a restaurant
        searchNearbyMeals(precedingItem.lat, precedingItem.lng, breakItem.id, day);
      }
    } else {
      newList = [...currentList, breakItem];
    }
    const withCommutes = insertCommutes(newList);
    const recalculated = recalculateDayTimes(withCommutes);
    const newSchedule = { ...activeTrip.schedule };
    newSchedule[day] = recalculated;
    updateTripSchedule(newSchedule);
  };

  // --- Search nearby meals and update break item ---
  const searchNearbyMeals = async (lat: number, lng: number, breakId: string, day: number) => {
    try {
      const res = await fetch('http://localhost:4000/api/map/search-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `restaurants`, location: { lat, lng } })
      });
      if (!res.ok) return;
      const data = await res.json();
      const places = data.results || [];
      if (places.length > 0) {
        // Auto-select the first result but the user can change it
        const topPlace = places[0];
        setTrips(prev => prev.map(t => {
          if (t.id !== activeTripId) return t;
          const schedule = { ...t.schedule };
          const dayItems = getDayItems(schedule, day).map(item => {
            if (item.id === breakId) {
              return {
                ...item,
                name: `🍽️ ${topPlace.name || 'Restaurant'}`,
                placeId: topPlace.placeId,
                description: topPlace.secondaryText || topPlace.description || '',
              };
            }
            return item;
          });
          schedule[day] = dayItems;
          return { ...t, schedule };
        }));
      }
    } catch (err) {
      console.error('Nearby meal search error:', err);
    }
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
    setActiveDragItem(event.active.data.current);
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
      // Get non-commute items for reordering
      const daySchedule = getDayItems(activeTrip.schedule, currentDay).filter(i => !i.isCommute);
      const oldIndex = daySchedule.findIndex(i => i.id === activeId);
      const newIndex = daySchedule.findIndex(i => i.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(daySchedule, oldIndex, newIndex);
        const withCommutes = insertCommutes(newOrder);
        const newSchedule = { ...activeTrip.schedule };
        newSchedule[currentDay] = recalculateDayTimes(withCommutes);
        updateTripSchedule(newSchedule);
      }
    }
  };

  const addItemToSchedule = (item: ItineraryItem, day: number) => {
    if (!activeTrip) return;
    // Schedule keys may be strings from backend — try both
    const currentList = getDayItems(activeTrip.schedule, day).filter(i => !i.isCommute);
    const newItem = {
      ...item,
      id: `${item.id}-${Date.now()}`,
      visitDurationMin: item.visitDurationMin || 60,
      source: "db" as const
    };
    const newList = [...currentList, newItem];
    const withCommutes = insertCommutes(newList);
    const recalculatedList = recalculateDayTimes(withCommutes);
    const newSchedule = { ...activeTrip.schedule };
    newSchedule[day] = recalculatedList;
    updateTripSchedule(newSchedule);
  };

  const removeItemFromSchedule = (itemId: string, day: number) => {
    if (!activeTrip) return;
    const newSchedule = { ...activeTrip.schedule };
    const raw = newSchedule[day] ?? newSchedule[String(day) as any];
    const dayItems = Array.isArray(raw) ? raw : [];
    const filtered = dayItems.filter(i => i.id !== itemId && !i.isCommute);
    const withCommutes = insertCommutes(filtered);
    newSchedule[day] = recalculateDayTimes(withCommutes);
    updateTripSchedule(newSchedule);
  };

  const updateTripSchedule = (newSchedule: Record<number, ItineraryItem[]>) => {
    const updatedTrip = { ...activeTrip!, schedule: newSchedule };
    setTrips(trips.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    saveTrip(updatedTrip);
  };

  // --- HANDLER: Activate Trip for Trip Mode ---
  const handleActivateTrip = async (tripId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      // Deactivate all other trips first
      for (const trip of trips) {
        if (trip.status === 'active' && trip.id !== tripId) {
          await fetch(`http://localhost:4000/api/trips/${trip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'draft' })
          });
        }
      }
      // Activate the selected trip
      await fetch(`http://localhost:4000/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'active' })
      });
      // Update local state
      setTrips(prev => prev.map(t => ({
        ...t,
        status: t.id === tripId ? 'active' as const : (t.status === 'active' ? 'draft' as const : t.status)
      })));
    } catch (e) { console.error('Failed to activate trip', e); }
  };

  // --- HANDLER: Add Day ---
  const handleAddDay = () => {
    if (!activeTrip) return;
    const newDays = activeTrip.days + 1;
    const newSchedule = { ...activeTrip.schedule, [newDays]: [] };
    const updatedTrip = { ...activeTrip, days: newDays, schedule: newSchedule };
    setTrips(trips.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    saveTrip(updatedTrip);
  };

  // --- HANDLER: Remove Day ---
  const handleRemoveDay = () => {
    if (!activeTrip || activeTrip.days <= 1) return;
    const newDays = activeTrip.days - 1;
    const newSchedule = { ...activeTrip.schedule };
    delete newSchedule[activeTrip.days]; // Remove last day
    const updatedTrip = { ...activeTrip, days: newDays, schedule: newSchedule };
    if (currentDay > newDays) setCurrentDay(newDays);
    setTrips(trips.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    saveTrip(updatedTrip);
  };

  // --- HANDLER: Commute Mode Change ---
  const handleCommuteChange = (commuteId: string, mode: "transit" | "driving") => {
    if (!activeTrip) return;
    const newSchedule = { ...activeTrip.schedule };
    const dayItems = getDayItems(newSchedule, currentDay).map(item => {
      if (item.id === commuteId) {
        return { ...item, commuteMode: mode, commuteDurationMin: mode === 'driving' ? 15 : 25 };
      }
      return item;
    });
    newSchedule[currentDay] = recalculateDayTimes(dayItems);
    updateTripSchedule(newSchedule);
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
          tripName: trip.tripName,
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
      // Soft delete — mark cancelled so it disappears from the sidebar but data is preserved
      await fetch(`http://localhost:4000/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trip_status: "cancelled" })
      });
      setTrips(prev => {
        const remaining = prev.filter(t => t.id !== tripId);
        if (activeTripId === tripId) {
          const next = remaining.find(t => t.trip_status !== "cancelled" && t.status !== "completed");
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
      <div className="flex h-[calc(100vh-110px)] w-full max-w-[1800px] mx-auto bg-[#FFF5E9] overflow-hidden px-4 md:px-8 pb-6 pt-2">
        <div className="flex w-full h-full bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden relative">

          {/* Sidebar */}
          {sidebarOpen ? (
            <ItinerarySidebar
              itineraries={trips}
              activeItineraryId={activeTripId}
              onSelectItinerary={handleSelectTrip}
              onNewTrip={() => setShowSetup(true)}
              onDeleteTrip={handleDeleteTrip}
              onActivateTrip={handleActivateTrip}
              isGroupTrip={isGroupTrip}
              groupTripId={groupTripId}
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
                    <MapIcon size={16} /> Preview Map
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Print Button */}
                <button
                  onClick={() => setShowPrintView(true)}
                  disabled={!activeTrip}
                  className="flex items-center gap-2 text-gray-600 border border-gray-300 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                  title="Print itinerary"
                >
                  <Printer size={16} /> Print
                </button>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateItineraries}
                  disabled={collections.length === 0 || optionsLoading}
                  className={`flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all ${collections.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#4A9B7F] to-[#2E6B56]"
                    }`}
                  title={collections.length === 0 ? "Add places to your collections first" : "Generate 3 itinerary options"}
                >
                  <Sparkles size={16} />
                  {optionsLoading ? "Generating..." : "Generate Itineraries"}
                </button>
              </div>
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
                        onAddDay={handleAddDay}
                        onRemoveDay={handleRemoveDay}
                        startDate={activeTrip.startDate}
                      />
                    </div>
                    <div className="flex-1 overflow-hidden rounded-2xl shadow-sm border border-gray-200 bg-white">
                      <TimelineView
                        day={currentDay}
                        items={getDayItems(activeTrip.schedule, currentDay)}
                        onRemoveItem={(id) => removeItemFromSchedule(id, currentDay)}
                        onEditItem={handleViewDetails}
                        onAddItem={handleAddItem}
                        onAddMealBreak={(afterIndex) => handleAddMealBreak(currentDay, afterIndex)}
                        onCommuteChange={handleCommuteChange}
                        startTime={dayStartTime}
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
                          className={`px-3 py-1 rounded-md text-sm font-bold text-white transition-colors ${isSimulating ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
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
                  searchSource={searchSource}
                  onSearchSourceChange={setSearchSource}
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
                  aiClusteringEnabled={aiClusteringEnabled}
                  onAiClusteringToggle={setAiClusteringEnabled}
                  exploreSurroundings={exploreSurroundings}
                  onExploreSurroundingsToggle={setExploreSurroundings}
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

      {/* Print View */}
      {showPrintView && activeTrip && (
        <PrintView
          tripName={activeTrip.tripName}
          startDate={activeTrip.startDate}
          days={activeTrip.days}
          travelers={activeTrip.travelers}
          schedule={activeTrip.schedule}
          onClose={() => setShowPrintView(false)}
        />
      )}

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