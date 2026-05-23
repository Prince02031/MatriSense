"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { useGeofencing } from "../hooks/useGeofencing"; // Import useGeofencing
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import LocationModal from "../components/LocationModal"; // Import the modal
import ClusteringView from "../components/ClusteringView"; // Import clustering view
import MultiOptionSelector from "../components/MultiOptionSelector"; // Import multi-option selector
import ConfirmationModal from "../components/ConfirmationModal"; // Import confirmation modal
import MapComponent from "../components/MapComponent"; // Import MapComponent
import { VisitTrackingPanel } from "../components/visit/VisitTrackingPanel"; // Import visit tracking

// --- TYPES (Updated to include data for Modal) ---
type Item = {
  id: string;
  placeId?: string;
  name: string;               // Map 'text' to 'name'
  text?: string;              // Keep 'text' for compatibility with your UI
  description?: string;
  category?: string;
  visitDurationMin?: number;
  time?: string;
  images?: string[];
  reviews?: any[];
  source?: "db" | "ai";
};

type ActiveTab = "chat" | "destinations" | "summaries" | "map" | "visits";
type DestinationsView = "search" | "collections";

/* -------------------- Custom Collision Logic (YOUR ORIGINAL) -------------------- */
const customCollisionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
};

/* -------------------- Sortable Item (MODIFIED: Added Info Button) -------------------- */
function SortableItem({
  id,
  text,
  isIndicatorBefore,
  onAction,
  actionType = "remove",
  disabled = false,
  // New props
  itemData,
  onViewDetails
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  };

  const handleActionClick = (e: any) => {
    e.stopPropagation();
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    if (onAction) onAction(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-item ${isDragging ? "z-50" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        padding: "12px",
        background: isHovered ? "#f9fafb" : "#fff",
        borderRadius: "12px",
        marginBottom: "10px",
        border: isHovered ? "1px solid #22c55e" : "1px solid #e5e7eb",
        boxShadow: isHovered ? "0 4px 12px rgba(34, 197, 94, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        {/* Drop Indicator Logic */}
        {isIndicatorBefore !== undefined && (
          <div style={{
            position: "absolute",
            left: 0, right: 0,
            height: "2px",
            background: "#22c55e",
            transition: "all 0.2s",
            top: isIndicatorBefore ? "-6px" : "auto",
            bottom: isIndicatorBefore ? "auto" : "-6px"
          }} />
        )}

        {/* --- MAIN CARD CONTENT (Draggable) --- */}
        <div
          style={{ flex: 1, cursor: disabled ? "default" : "grab", display: "flex", flexDirection: "column" }}
          {...attributes}
          {...listeners}
        >
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#1f2937" }}>{text}</span>

          {/* Optional: Show tiny details below name */}
          {itemData?.category && (
            <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", marginTop: "2px" }}>
              {itemData.category} {itemData.visitDurationMin ? `• ${itemData.visitDurationMin}m` : ""}
            </span>
          )}
        </div>

        {/* --- BUTTON GROUP --- */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

          {/* 1. INFO BUTTON (New) */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Don't trigger drag
              if (onViewDetails) onViewDetails(itemData);
            }}
            onPointerDown={(e) => e.stopPropagation()} // Don't start drag
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#bfdbfe";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#eff6ff";
              e.currentTarget.style.transform = "scale(1)";
            }}
            style={{
              background: "#eff6ff",
              color: "#3b82f6",
              border: "1px solid #dbeafe",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              transition: "all 0.2s ease"
            }}
            title="View Details"
          >
            i
          </button>

          {/* 2. ACTION BUTTON (Add/Remove) */}
          {onAction && (
            <button
              onClick={handleActionClick}
              onPointerDown={(e) => e.stopPropagation()} // Don't start drag
              onMouseEnter={(e) => {
                if (actionType === "add") {
                  e.currentTarget.style.background = "#d1fae5";
                } else {
                  e.currentTarget.style.background = "#fee2e2";
                }
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = actionType === "add" ? "#ecfdf5" : "#fef2f2";
                e.currentTarget.style.transform = "scale(1)";
              }}
              style={{
                background: actionType === "add" ? "#ecfdf5" : "#fef2f2",
                color: actionType === "add" ? "#059669" : "#dc2626",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "16px",
                transform: isClicked ? "scale(0.85)" : "scale(1)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              {actionType === "add" ? "+" : "×"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Column Component (YOUR ORIGINAL + Prop passing) -------------------- */
function Column({ id, items, actionType, onActionItem, dropIndicatorIndex, transparent, isSortable = true, onViewDetails }: any) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: transparent ? "transparent" : "rgba(255,255,255,0.5)",
        borderRadius: "16px",
        border: transparent ? "none" : "2px dashed #d1d5db",
        transition: "background 0.2s"
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="custom-scrollbar">
        {isSortable ? (
          <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item: any, index: number) => (
              <SortableItem
                key={item.id}
                id={item.id}
                text={item.name} // Display Name
                itemData={item}  // Pass full object
                actionType={actionType}
                onAction={onActionItem}
                onViewDetails={onViewDetails} // Pass down function
                isIndicatorBefore={
                  dropIndicatorIndex === index ? true :
                    dropIndicatorIndex === index + 1 ? false : undefined
                }
              />
            ))}
          </SortableContext>
        ) : (
          // Non-sortable items (e.g., search results)
          items.map((item: any) => (
            <SortableItem
              key={item.id}
              id={item.id}
              text={item.name}
              itemData={item}
              actionType={actionType}
              onAction={onActionItem}
              onViewDetails={onViewDetails}
              disabled={true}
            />
          ))
        )}

        {items.length === 0 && !transparent && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "14px", fontStyle: "italic" }}>
            Drop items here
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Chat Column (Updated for Cards) -------------------- */
function ChatColumn({ messages, chatInput, setChatInput, onSendMessage, onAddCard, onViewDetails, loading, chatHistoryLoading, clusteringData, stage, setStage }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {chatHistoryLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af" }}>
            <div>Loading conversation history...</div>
          </div>
        ) : (
          messages.map((msg: any, msgIndex: number) => {
            // Check if this is a separator message
            const isSeparator = msg.text === "--- New chat context ---";

            if (isSeparator) {
              return (
                <div key={msg.id || `separator-${msgIndex}`} style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                  <div style={{
                    padding: "8px 20px",
                    background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    borderRadius: "20px",
                    boxShadow: "0 2px 8px rgba(251, 191, 36, 0.3)",
                    textAlign: "center"
                  }}>
                    📌 New chat context
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id || `msg-${msgIndex}`} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: "16px",
                  borderTopLeftRadius: msg.sender === "ai" ? "4px" : "16px",
                  borderTopRightRadius: msg.sender === "user" ? "4px" : "16px",
                  background: msg.sender === "user" ? "#1f2937" : "#ffffff",
                  color: msg.sender === "user" ? "#ffffff" : "#1f2937",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                  {msg.text}
                </div>

                {/* RENDER AI CARDS */}
                {msg.cards && msg.cards.length > 0 && (
                  <div style={{ marginTop: "10px", width: "90%" }}>
                    {msg.cards.map((card: any, cardIdx: number) => (
                      <SortableItem
                        key={card.id || `card-${msgIndex}-${cardIdx}`}
                        id={card.id || `card-${msgIndex}-${cardIdx}`}
                        text={card.name}
                        itemData={card}
                        actionType="add"
                        onAction={() => onAddCard(card)} // Add to collections
                        onViewDetails={onViewDetails}    // View details
                        disabled={true}                  // Chat items are fixed
                      />
                    ))}
                  </div>
                )}

                {/* RENDER BULLETS (if available) */}
                {msg.bullets && msg.bullets.length > 0 && (
                  <div style={{ marginTop: "10px", width: "90%", padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#374151" }}>
                      {msg.bullets.map((bullet: string, idx: number) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* RENDER CLUSTERING BUTTON (if this message has clustering data) */}
                {msg.hasClustering && clusteringData && stage === "chat" && (
                  <div style={{ marginTop: "10px", width: "90%" }}>
                    <button
                      onClick={() => setStage("clustering")}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "13px",
                        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
                      }}
                    >
                      🗺️ View Places by Region
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: "16px", background: "#f3f4f6", color: "#6b7280", fontSize: "14px" }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSendMessage} style={{ padding: "10px", background: "#fff", borderTop: "1px solid #e5e7eb" }}>
        <div style={{ position: "relative" }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask Odyssey..."
            style={{ width: "100%", padding: "12px 40px 12px 16px", borderRadius: "99px", background: "#f3f4f6", border: "none", outline: "none", fontSize: "14px" }}
          />
          <button type="submit" style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "28px", height: "28px", borderRadius: "50%", background: "#000", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}

/* -------------------- MAIN PAGE -------------------- */
export default function PlannerPage() {
  const router = useRouter();

  /* -------------------- State -------------------- */
  // --- STATE ---
  const [tripName, setTripName] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [destinationsView, setDestinationsView] = useState<DestinationsView>("search");
  const [visitCount, setVisitCount] = useState(0); // Added for visit tracking

  // Clustering State (NEW - Stage 1)
  const [stage, setStage] = useState<"chat" | "clustering" | "options" | "confirmation">("chat");
  const [clusteringData, setClusteringData] = useState<any>(null);
  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [selectedPlacesFromClustering, setSelectedPlacesFromClustering] = useState<any[]>([]);

  // Itinerary Generation State (NEW - Stage 2)
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [itineraryOptions, setItineraryOptions] = useState<any[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [customRequirements, setCustomRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");

  const [itinerary, setItinerary] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Item[]>([]);
  const [searchResults, setSearchResults] = useState<Item[]>([]);

  // Saved Itinerary State (NEW)
  const [savedItinerary, setSavedItinerary] = useState<any>(null);
  const [savedItineraryId, setSavedItineraryId] = useState<string | null>(null);

  // Day tracking state
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayCheckboxes, setDayCheckboxes] = useState<{ [key: string]: boolean }>({});

  const [chat, setChat] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);
  const [mockLocation, setMockLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Geofencing Hook
  const { userLocation } = useGeofencing({
    itineraryId: savedItineraryId || undefined,
    enabled: !!savedItineraryId,
    autoCheckin: true,
    mockLocation: mockLocation
  });

  // Simulation Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSimulating && itinerary.length > 0) {
      interval = setInterval(() => {
        setSimulationIndex(prev => {
          const next = prev + 1;
          if (next >= itinerary.length) {
            setIsSimulating(false); // Stop when done
            return prev;
          }
          const item = itinerary[next];
          // We need coordinates for simulation.
           if ((item as any).lat && (item as any).lng) {
             setMockLocation({ lat: (item as any).lat, lng: (item as any).lng });
           }
          return next;
        });
      }, 3000); // Move every 3 seconds
    }

    return () => clearInterval(interval);
  }, [isSimulating, itinerary]);

  const startSimulation = () => {
    if (itinerary.length === 0) return;
    setIsSimulating(true);
    setSimulationIndex(-1); // Will start at 0
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setMockLocation(undefined); // Reset to real location logic
  };

  // Load collections from localStorage on mount
  useEffect(() => {
    const savedCollections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');
    if (savedCollections.length > 0) {
      setCollections(savedCollections);
    }
  }, []);
  const [input, setInput] = useState("");

  // Drag State
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ column: string; index: number } | null>(null);

  // Modal State (NEW)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Item | null>(null);

  // Load saved itinerary from backend on mount
  useEffect(() => {
    const loadSavedItinerary = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // First: check if user is in an active group trip — that takes priority
        const groupRes = await fetch("http://localhost:4000/api/groups/mine/active", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          if (groupData.success && groupData.group) {
            // User is in an active group — use the group's itinerary (or empty if none linked)
            const groupItinerary = groupData.itinerary;
            if (groupItinerary) {
              const selectedItin = groupItinerary.selected_itinerary;
              setSavedItineraryId(groupItinerary.id);
              setSavedItinerary({
                id: groupItinerary.id,
                tripName: `[Group] ${groupData.group.title}`,
                title: selectedItin?.title,
                description: selectedItin?.description,
                paceDescription: selectedItin?.paceDescription,
                estimatedCost: selectedItin?.estimatedCost,
                schedule: Array.isArray(selectedItin?.schedule) ? selectedItin.schedule : []
              });
            } else {
              // Group exists but has no itinerary — show empty planner
              setSavedItineraryId(null);
              setSavedItinerary(null);
            }
            return; // Don't fall through to personal itineraries
          }
        }

        // No active group — load user's own most recent itinerary
        const res = await fetch("http://localhost:4000/api/trips", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Get the most recent itinerary
          const latestItinerary = data.data[0];

          // Reconstruct the saved itinerary format
          const selectedItin = latestItinerary.selected_itinerary;
          setSavedItineraryId(latestItinerary.id);
          setSavedItinerary({
            id: latestItinerary.id,
            tripName: latestItinerary.trip_name,
            title: selectedItin?.title,
            description: selectedItin?.description,
            paceDescription: selectedItin?.paceDescription,
            estimatedCost: selectedItin?.estimatedCost,
            schedule: Array.isArray(selectedItin?.schedule) ? selectedItin.schedule : []
          });
        }
      } catch (err) {
        console.error("Error loading saved itinerary:", err);
      }
    };

    loadSavedItinerary();
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setChatHistoryLoading(false);

          // For logged-out users, try to load from localStorage
          const savedChat = localStorage.getItem("guestChat");
          if (savedChat) {
            try {
              const parsedChat = JSON.parse(savedChat);
              setChat(parsedChat);
            } catch (e) {
              setChat([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]);
            }
          } else {
            setChat([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]);
          }
          return;
        }

        // Check if there's unsaved guest chat to migrate
        const guestChat = localStorage.getItem("guestChat");
        if (guestChat) {
          try {
            const parsedGuestChat = JSON.parse(guestChat);
            console.log(`Migrating ${parsedGuestChat.length} guest messages to database...`);

            // Save separator message first
            await fetch("http://localhost:4000/api/chat/message", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                message: "--- New chat context ---",
                role: "ai",
                metadata: { type: "separator" }
              })
            });

            // Save all guest messages to database sequentially
            for (const msg of parsedGuestChat) {
              if (msg.sender && msg.text) {
                await fetch("http://localhost:4000/api/chat/message", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    message: msg.text,
                    role: msg.sender === "user" ? "user" : "ai",
                    metadata: {
                      cards: msg.cards || [],
                      bullets: msg.bullets || [],
                      migratedFromGuest: true
                    }
                  })
                });
              }
            }

            // Small delay to ensure database writes complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Clear guest chat from localStorage
            localStorage.removeItem("guestChat");
            console.log("✅ Guest chat migrated successfully!");
          } catch (e) {
            console.error("❌ Error migrating guest chat:", e);
            // Don't clear localStorage if migration failed
          }
        }

        const res = await fetch("http://localhost:4000/api/chat/history?limit=50", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) {
          setChatHistoryLoading(false);
          setChat([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]);
          return;
        }

        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Convert chat history to chat messages format
          const chatMessages = data.data.map((msg: any) => {
            const metadata = msg.metadata || {};
            return {
              id: msg.id,
              text: msg.message,
              sender: msg.role === 'user' ? 'user' : 'ai',
              cards: metadata.cards || [],
              bullets: metadata.bullets || []
            };
          });
          setChat(chatMessages);
        } else {
          // No history, show welcome message
          setChat([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
        setChat([{ id: "m1", text: "Hello! Where are we going?", sender: "ai", cards: [] }]);
      } finally {
        setChatHistoryLoading(false);
      }
    };

    loadChatHistory();
  }, []);

  // --- HANDLER: OPEN MODAL ---
  const handleViewDetails = (item: Item) => {
    setSelectedLocation(item);
    setModalOpen(true);
  };

  // --- HANDLER: ADD TO COLLECTIONS ---
  const handleAddToCollections = (card: Item) => {
    // Avoid duplicates
    if (!collections.find(c => c.name === card.name)) {
      const newCollections = [...collections, { ...card, id: `col-${Date.now()}-${Math.random()}` }];
      setCollections(newCollections);
      // Persist to localStorage
      localStorage.setItem('odyssey_collections', JSON.stringify(newCollections));
    }
  };

  // --- HANDLER: SAVE TRIP ---
  const handleSaveTrip = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to save.");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: tripName, itinerary, collections })
      });
      if (res.ok) {
        alert("Trip Saved Successfully!");
      } else {
        alert("Failed to save trip.");
      }
    } catch (e) { console.error(e); }
  };

  // --- HANDLER: SEND MESSAGE (AI) ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { id: Date.now().toString(), text: chatInput, sender: "user" };
    setChat(prev => {
      const newChat = [...prev, userMsg];

      // Save to localStorage for logged-out users
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.setItem("guestChat", JSON.stringify(newChat));
      }

      return newChat;
    });
    setChatInput("");
    setLoading(true);

    // Save user message to database (only if logged in)
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("http://localhost:4000/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            message: userMsg.text,
            role: "user"
          })
        });
      } catch (err) {
        console.error("Error saving user message:", err);
      }
    }

    // For logged-out users: create temporary conversation history from chat state
    let tempConversationHistory: any[] = [];
    if (!token) {
      // Get last 10 messages from current chat
      const recentMessages = chat.slice(-10);
      tempConversationHistory = recentMessages.map(msg => ({
        message: msg.text,
        role: msg.sender === "user" ? "user" : "ai",
        created_at: new Date().toISOString()
      }));
    }

    try {
      // Check if this is a clustering request
      const lowerInput = chatInput.toLowerCase();

      // 1. Explicit trip planning keywords
      const hasTripKeywords = lowerInput.includes("trip") ||
        lowerInput.includes("itinerary");

      // 2. Multi-day planning ("3 day", "5 days", etc)
      const hasMultiDayPlan = /\d+\s*(day|days)/.test(lowerInput);

      // 3. Multiple locations with clear travel intent
      const hasMultipleLocations = () => {
        // Must have "plan" or "visit" or "travel" or "explore"
        const hasTravelVerb = lowerInput.includes('plan') ||
          lowerInput.includes('visit') ||
          lowerInput.includes('travel') ||
          lowerInput.includes('explore');

        if (!hasTravelVerb) return false;

        // Count location separators (comma or "and")
        const commaCount = (chatInput.match(/,/g) || []).length;
        const hasAndSeparator = lowerInput.match(/\s+and\s+/g);
        const separatorCount = commaCount + (hasAndSeparator ? hasAndSeparator.length : 0);

        // Need at least 1 separator (meaning 2+ locations)
        return separatorCount >= 1;
      };

      const isClusteringRequest = hasTripKeywords || hasMultiDayPlan || hasMultipleLocations();

      if (isClusteringRequest) {
        // Call clustering endpoint
        setClusteringLoading(true);
        const clusterRes = await fetch("http://localhost:4000/api/clustering/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            message: userMsg.text,
            userContext: { budget: "medium", pace: "moderate" }
          })
        });

        if (clusterRes.ok) {
          const clusterData = await clusterRes.json();
          setClusteringData(clusterData.data);
          setStage("clustering");

          const aiMessage = "I've analyzed your request and found these place clusters. Select the ones you'd like to visit!";

          // Add AI response to chat
          setChat(prev => {
            const newChat = [...prev, {
              id: Date.now().toString() + "ai",
              text: aiMessage,
              sender: "ai",
              cards: [],
              hasClustering: true
            }];

            // Save to localStorage for logged-out users
            if (!token) {
              localStorage.setItem("guestChat", JSON.stringify(newChat));
            }

            return newChat;
          });

          // Save AI message to database
          if (token) {
            try {
              await fetch("http://localhost:4000/api/chat/message", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                  message: aiMessage,
                  role: "ai"
                })
              });
            } catch (err) {
              console.error("Error saving AI message:", err);
            }
          }

          setClusteringLoading(false);
          setLoading(false);
          return;
        }
      }

      // Regular chat flow (existing)
      const res = await fetch("http://localhost:4000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          message: userMsg.text,
          collections,
          itinerary,
          conversationHistory: tempConversationHistory // Send session-based history for logged-out users
        })
      });

      if (!res.ok) {
        console.error("AI Chat API Error:", res.status, res.statusText);
        const errorText = await res.text();
        console.error("Error details:", errorText);
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      console.log("AI Response:", data);

      // PARSE THE AI RESPONSE
      let aiCards: Item[] = [];

      // 1. Direct cards
      if (data.cards) aiCards = [...aiCards, ...data.cards];

      // 2. Itinerary Preview (Nested days)
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

      setChat(prev => {
        const newChat = [...prev, {
          id: Date.now().toString() + "ai",
          text: aiMessage,
          sender: "ai",
          cards: aiCards,
          bullets: data.bullets || []
        }];

        // Save to localStorage for logged-out users
        if (!token) {
          localStorage.setItem("guestChat", JSON.stringify(newChat));
        }

        return newChat;
      });

      // Note: AI messages from /api/ai/chat are already saved by the backend
      // No need to save again here

    } catch (err) {
      console.error(err);
      setChat(prev => [...prev, { id: "err", text: "Error connecting to AI.", sender: "ai" }]);
    } finally {
      setLoading(false);
      setClusteringLoading(false);
    }
  };

  // --- HANDLER: Clustering Continue (Stage 1 → Stage 2) ---
  const handleClusteringContinue = (selectedPlaces: any[]) => {
    setSelectedPlacesFromClustering(selectedPlaces);
    // Add selected places to collections for drag-drop
    const newPlaces = selectedPlaces.map((place: any) => ({
      id: `cluster-${Date.now()}-${Math.random()}`,
      name: place.name,
      category: place.category,
      source: "ai" as const
    }));
    setCollections(prev => [...prev, ...newPlaces]);

    // Show next step message in chat
    setChat(prev => [...prev, {
      id: Date.now().toString() + "ai",
      text: `Great! I've added ${selectedPlaces.length} place(s) to your collection. Drag and drop them into your itinerary, then click "Generate Itineraries" to see multiple options!`,
      sender: "ai",
      cards: []
    }]);

    // Reset clustering
    setStage("chat");
    setClusteringData(null);
  };

  // --- HANDLER: Generate Itineraries (Stage 2) ---
  const handleGenerateItineraries = async () => {
    if (itinerary.length === 0) {
      alert("Please add places to your itinerary first!");
      return;
    }

    setOptionsLoading(true);
    setStage("options");

    try {
      // Add AI thinking message
      setChat(prev => [...prev, {
        id: Date.now().toString() + "thinking",
        text: "Odyssey is generating 3 different itinerary options for you...",
        sender: "ai",
        cards: []
      }]);

      const res = await fetch("http://localhost:4000/api/ai/generateItineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPlaces: itinerary.map(item => ({
            name: item.name,
            category: item.category || "place",
          })),
          tripDuration: Math.ceil(itinerary.length / 2), // Rough estimate
          userContext: { budget: "medium", pace: "moderate" },
          customRequirements: customRequirements.length > 0 ? customRequirements.join(" | ") : undefined
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate itineraries");
      }

      setItineraryOptions(data.data.itineraries);

      // Add success message
      setChat(prev => [...prev, {
        id: Date.now().toString() + "options",
        text: `Perfect! I've created 3 itinerary options for you. Review them below and select your preferred option!`,
        sender: "ai",
        cards: []
      }]);

    } catch (err) {
      console.error(err);
      alert("Error generating itineraries: " + (err as any).message);
      setStage("chat");
    } finally {
      setOptionsLoading(false);
    }
  };

  // Handler for confirming and saving itinerary
  const handleConfirmItinerary = async (finalTripName: string) => {
    if (!selectedItinerary) {
      alert("No itinerary selected");
      return;
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        // User not logged in - redirect to login with message
        const confirmRedirect = confirm(
          "You need to login or register to save your itinerary and access further features.\n\n" +
          "Click OK to go to the login page, or Cancel to continue planning without saving."
        );
        if (confirmRedirect) {
          router.push("/login?from=planner");
        }
        return;
      }

      console.log("Token from localStorage:", token ? "✓ Found" : "✗ Not found");

      const tripData = {
        tripName: finalTripName || tripName || "My Trip",
        selectedPlaces: itinerary.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category || "place",
          placeId: item.placeId,
          // DB expects coordinates in { latitude, longitude } format for GeofenceService
          coordinates: (item as any).coordinates || ((item as any).lat && (item as any).lng ? { latitude: (item as any).lat, longitude: (item as any).lng } : null)
        })),
        selectedItinerary: {
          id: selectedItinerary.id,
          title: selectedItinerary.title,
          description: selectedItinerary.description,
          paceDescription: selectedItinerary.paceDescription,
          estimatedCost: selectedItinerary.estimatedCost,
          schedule: selectedItinerary.schedule
        },
        status: "draft"
      };

      const res = await fetch("http://localhost:4000/api/trips/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(tripData)
      });

      const data = await res.json();
      console.log("Save response status:", res.status);
      console.log("Save response data:", data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to save trip");
      }

      // Store the saved itinerary ID and details
      const itineraryId = data.data.id;
      const savedItineraryData = {
        id: itineraryId,
        tripName: finalTripName || tripName || "My Trip",
        title: tripData.selectedItinerary.title,
        description: tripData.selectedItinerary.description,
        paceDescription: tripData.selectedItinerary.paceDescription,
        estimatedCost: tripData.selectedItinerary.estimatedCost,
        schedule: tripData.selectedItinerary.schedule
      };

      setSavedItineraryId(itineraryId);
      setSavedItinerary(savedItineraryData);

      // Add success message
      setChat(prev => [...prev, {
        id: Date.now().toString() + "saved",
        text: `✅ Trip saved successfully! Trip ID: ${itineraryId}. You can view it in your dashboard.`,
        sender: "ai",
        cards: []
      }]);

      // Close confirmation modal
      setConfirmationOpen(false);
      setStage("chat");
      setSelectedItinerary(null);
      setItineraryOptions([]);
      // Keep itinerary displayed in left box - don't clear it!

    } catch (err) {
      console.error("Error saving trip:", err);
      const errorMsg = (err as any).message || "Unknown error";
      alert(`Error saving trip: ${errorMsg}`);
    }
  };

  // Handler for Edit & Regenerate
  const handleEditAndRegenerate = () => {
    setConfirmationOpen(false);
    setStage("chat");
    setItineraryOptions([]);
    setSelectedItinerary(null);
    setCustomRequirements([]); // Clear requirements for fresh edit

    // Show instruction message
    setChat(prev => [...prev, {
      id: Date.now().toString() + "edit",
      text: "Great! You can now:\n1. Add or remove places from your itinerary (drag them in/out)\n2. Add custom requirements in the box below (e.g., 'visit museum first', 'sunset at beach')\n\nWhen ready, click 'Generate Itineraries' again!",
      sender: "ai",
      cards: []
    }]);
  };

  // Add custom requirement
  const handleAddRequirement = () => {
    if (requirementInput.trim()) {
      setCustomRequirements(prev => [...prev, requirementInput.trim()]);
      setRequirementInput("");
    }
  };

  // Remove custom requirement
  const handleRemoveRequirement = (index: number) => {
    setCustomRequirements(prev => prev.filter((_, i) => i !== index));
  };

  // --- DRAG HANDLERS (EXACT ORIGINAL LOGIC) ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Only drag from Collections or Itinerary (Chat is disabled for drag)
    const item = collections.find((i) => i.id === active.id) || itinerary.find((i) => i.id === active.id);
    if (item) setActiveItem(item);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = over.id;
    const overColumnId = overId === "itinerary" || itinerary.some(i => i.id === overId) ? "itinerary" :
      overId === "collections" || collections.some(i => i.id === overId) ? "collections" : null;

    if (!overColumnId) return;

    if (overColumnId === "itinerary") {
      const overIndex = itinerary.findIndex(i => i.id === overId);
      const index = overIndex === -1 ? itinerary.length : overIndex;
      setDropIndicator({ column: "itinerary", index });
    } else if (overColumnId === "collections") {
      const overIndex = collections.findIndex(i => i.id === overId);
      const index = overIndex === -1 ? collections.length : overIndex;
      setDropIndicator({ column: "collections", index });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setDropIndicator(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumnId = collections.some(i => i.id === activeId) ? "collections" : "itinerary";
    const overColumnId = overId === "itinerary" || itinerary.some(i => i.id === overId) ? "itinerary" :
      overId === "collections" || collections.some(i => i.id === overId) ? "collections" : null;

    if (!overColumnId) return;

    if (activeColumnId === overColumnId) {
      if (activeColumnId === "itinerary") {
        const oldIndex = itinerary.findIndex(i => i.id === activeId);
        const newIndex = itinerary.findIndex(i => i.id === overId);
        if (oldIndex !== newIndex) setItinerary(arrayMove(itinerary, oldIndex, newIndex));
      } else {
        const oldIndex = collections.findIndex(i => i.id === activeId);
        const newIndex = collections.findIndex(i => i.id === overId);
        if (oldIndex !== newIndex) setCollections(arrayMove(collections, oldIndex, newIndex));
      }
    } else {
      if (activeColumnId === "collections" && overColumnId === "itinerary") {
        const item = collections.find(i => i.id === activeId);
        if (item) {
          setItinerary(prev => [...prev, item]);
          setCollections(prev => prev.filter(i => i.id !== activeId));
        }
      } else if (activeColumnId === "itinerary" && overColumnId === "collections") {
        const item = itinerary.find(i => i.id === activeId);
        if (item) {
          setCollections(prev => [...prev, item]);
          setItinerary(prev => prev.filter(i => i.id !== activeId));
        }
      }
    }
  };

  const sharedTabStyles = (isActive: boolean) => ({
    flex: 1, padding: "6px", borderRadius: "8px", border: "none",
    background: isActive ? "#fff" : "transparent",
    fontWeight: isActive ? 600 : 400, cursor: "pointer", fontSize: "14px"
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Inter, sans-serif", background: "#ffffff", overflow: "hidden" }}>

      {/* Header */}
      <header style={{ padding: "12px 5%", height: "64px", flexShrink: 0, display: "flex", alignItems: "center", background: "#fff6eb", gap: "12px", borderBottom: "1px solid #e5e7eb" }}>
        <input
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          placeholder="Trip name"
          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #d9d9d9", background: "#fff" }}
        />
        <button
          onClick={handleGenerateItineraries}
          disabled={itinerary.length === 0 || optionsLoading}
          style={{
            padding: "8px 14px",
            background: itinerary.length === 0 ? "#d1d5db" : "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: itinerary.length === 0 ? "not-allowed" : "pointer",
            opacity: optionsLoading ? 0.7 : 1
          }}
          title={itinerary.length === 0 ? "Add places to itinerary first" : "Generate 3 itinerary options"}
        >
          {optionsLoading ? "Generating..." : "✨ Generate Itineraries"}
        </button>
        <button onClick={handleSaveTrip} style={{ padding: "8px 14px", background: "#1db954", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Save</button>
        <button onClick={() => setActiveTab("map")} style={{ padding: "8px 14px", background: activeTab === "map" ? "#000" : "#fff", color: activeTab === "map" ? "#fff" : "#000", border: "1px solid #d9d9d9", borderRadius: "8px", cursor: "pointer" }}>Maps</button>
        <button style={{ padding: "8px 14px", background: "#fff", color: "#000", border: "1px solid #d9d9d9", borderRadius: "8px" }}>Summaries</button>
      </header>

      <main style={{ padding: "20px 5%", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <DndContext
          collisionDetection={customCollisionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          <div style={{ display: "flex", gap: "30px", marginBottom: "12px", flexShrink: 0 }}>
            <div style={{ width: "55%", display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => router.push("/dashboard")} style={{ background: "white", border: "1px solid #d9d9d9", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>←</button>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: "20px" }}>Itinerary</h3>
            </div>
            <div style={{ width: "45%", display: "flex", gap: "4px", background: "#d1d5db", borderRadius: "10px", padding: "4px" }}>
              <button onClick={() => setActiveTab("chat")} style={sharedTabStyles(activeTab === "chat")}>Chat</button>
              <button onClick={() => setActiveTab("destinations")} style={sharedTabStyles(activeTab === "destinations")}>Destinations</button>
              <button onClick={() => setActiveTab("map")} style={sharedTabStyles(activeTab === "map")}>Map</button>
              <button onClick={() => setActiveTab("visits")} style={sharedTabStyles(activeTab === "visits")}>
                Visits {visitCount > 0 && <span style={{ marginLeft: "4px", background: "#ef4444", color: "white", borderRadius: "50%", padding: "0 6px", fontSize: "12px" }}>{visitCount}</span>}
              </button>
              <button onClick={() => setActiveTab("summaries")} style={sharedTabStyles(activeTab === "summaries")}>Summaries</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "row", gap: "30px", flex: 1, overflow: "hidden", minHeight: 0 }}>
            <div style={{ width: "55%", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              {/* Show Saved Itinerary Info */}
              {savedItinerary && (
                <div style={{
                  padding: "16px",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "2px solid #22c55e",
                  marginBottom: "16px",
                  flexShrink: 0,
                  maxHeight: "60vh",
                  overflowY: "auto"
                }}>
                  {/* Header with Title and Clear Button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: "2px solid #22c55e" }}>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#15803d" }}>
                      ✅ {savedItinerary.tripName}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => router.push(`/groups/create?itineraryId=${savedItineraryId}`)}
                        style={{
                          background: "#6366f1",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        👥 Plan as Group
                      </button>
                      <button
                        onClick={() => {
                          setSavedItinerary(null);
                          setSavedItineraryId(null);
                        }}
                        style={{
                          background: "#22c55e",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#22c55e", fontWeight: 600 }}>Duration</p>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#15803d" }}>
                        {savedItinerary.schedule?.length || 0} days
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#22c55e", fontWeight: 600 }}>Cost</p>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#15803d" }}>
                        ${savedItinerary.estimatedCost?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#22c55e", fontWeight: 600 }}>Pace</p>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#15803d" }}>
                        {savedItinerary.paceDescription?.split(",")[0] || "Moderate"}
                      </p>
                    </div>
                  </div>

                  {/* Day View or Full Schedule */}
                  {selectedDay !== null ? (
                    // DAY VIEW - Selected Day with Checkboxes
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <button
                          onClick={() => setSelectedDay(null)}
                          style={{
                            background: "#22c55e",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          ← Back to Full Plan
                        </button>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#15803d" }}>
                          📅 Day {savedItinerary.schedule?.[selectedDay]?.day} • {savedItinerary.schedule?.[selectedDay]?.date}
                        </h4>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {savedItinerary.schedule?.[selectedDay]?.items?.map((item: any, idx: number) => {
                          const checkboxKey = `${selectedDay}-${idx}`;
                          const isChecked = dayCheckboxes[checkboxKey] || false;

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: "12px",
                                background: isChecked ? "#e8f5e9" : "#fff",
                                border: "2px solid #22c55e",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "12px"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setDayCheckboxes(prev => ({
                                    ...prev,
                                    [checkboxKey]: e.target.checked
                                  }));
                                }}
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  cursor: "pointer",
                                  marginTop: "2px",
                                  accentColor: "#22c55e"
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: "13px",
                                      color: "#15803d",
                                      textDecoration: isChecked ? "line-through" : "none",
                                      opacity: isChecked ? 0.6 : 1
                                    }}
                                  >
                                    {item.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      padding: "2px 8px",
                                      borderRadius: "3px",
                                      textTransform: "capitalize"
                                    }}
                                  >
                                    {item.time}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "12px",
                                    color: "#166534",
                                    opacity: isChecked ? 0.6 : 1
                                  }}
                                >
                                  ⏱️ {item.visitDurationMin}m • {item.timeRange}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "11px",
                                    color: "#999",
                                    fontStyle: "italic"
                                  }}
                                >
                                  {item.notes}
                                </p>
                              </div>
                              <button
                                onClick={() => handleViewDetails(item)}
                                style={{
                                  background: "#22c55e",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 12px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  flexShrink: 0
                                }}
                              >
                                ℹ️ Info
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // FULL SCHEDULE VIEW
                    <div>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: "#15803d", paddingTop: "12px", borderTop: "2px solid #22c55e" }}>
                        📅 Full Schedule
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {savedItinerary.schedule?.map((day: any) => (
                          <div
                            key={day.day}
                            onClick={() => setSelectedDay(day.day - 1)}
                            style={{
                              padding: "12px",
                              background: "#f9fafb",
                              border: "2px solid #22c55e",
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#e8f5e9";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(34, 197, 94, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f9fafb";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 700, color: "#15803d" }}>
                              Day {day.day} • {day.date}
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {day.items?.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    fontSize: "11px",
                                    color: "#166534",
                                    padding: "8px",
                                    background: "#fff",
                                    borderRadius: "6px",
                                    border: "1px solid #22c55e",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: "8px"
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                      <span style={{ fontWeight: 600, color: "#15803d" }}>
                                        {item.name}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          background: "#fef3c7",
                                          color: "#92400e",
                                          padding: "2px 6px",
                                          borderRadius: "3px",
                                          textTransform: "capitalize"
                                        }}
                                      >
                                        {item.time}
                                      </span>
                                    </div>
                                    <p style={{ margin: "0", fontSize: "10px", color: "#166534" }}>
                                      ⏱️ {item.visitDurationMin}m • {item.timeRange} • {item.notes}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(item);
                                    }}
                                    style={{
                                      background: "#22c55e",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "4px 8px",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0
                                    }}
                                    title="View details"
                                  >
                                    ℹ️
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Column
                id="itinerary"
                items={itinerary}
                actionType="remove"
                dropIndicatorIndex={dropIndicator?.column === "itinerary" ? dropIndicator.index : null}
                onActionItem={(id: string) => setItinerary(itinerary.filter(i => i.id !== id))}
                onViewDetails={handleViewDetails} // Pass Modal trigger
              />
            </div>

            <div style={{ width: "45%", display: "flex", flexDirection: "column", background: "#e5e7eb", borderRadius: "20px", padding: "12px", overflow: "hidden", minHeight: 0 }}>
              {activeTab === "chat" && (
                <>
                  {/* Clustering Stage Display */}
                  {stage === "clustering" && clusteringData && (
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", marginBottom: "12px", padding: "12px", background: "#fff", borderRadius: "12px" }}>
                      <ClusteringView
                        data={clusteringData}
                        loading={clusteringLoading}
                        onContinue={handleClusteringContinue}
                        onCancel={() => setStage("chat")}
                      />
                    </div>
                  )}

                  {/* Options Selection Stage Display */}
                  {stage === "options" && itineraryOptions.length > 0 && (
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", marginBottom: "12px", padding: "12px", background: "#fff", borderRadius: "12px" }}>
                      <MultiOptionSelector
                        itineraries={itineraryOptions}
                        onSelect={(option) => {
                          setSelectedItinerary(option);
                          setConfirmationOpen(true);
                        }}
                      />
                    </div>
                  )}

                  {/* Regular Chat Display */}
                  {stage === "chat" && (
                    <ChatColumn
                      messages={chat}
                      chatInput={chatInput}
                      setChatInput={setChatInput}
                      onSendMessage={handleSendMessage}
                      onAddCard={handleAddToCollections}
                      onViewDetails={handleViewDetails}
                      loading={loading}
                      chatHistoryLoading={chatHistoryLoading}
                    />
                  )}

                  {/* Custom Requirements Box - Only show when editing options */}
                  {stage === "chat" && itineraryOptions.length > 0 && (
                    <div style={{
                      marginTop: "12px",
                      padding: "12px",
                      background: "#fef3c7",
                      borderRadius: "12px",
                      border: "2px solid #fcd34d",
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#92400e", marginBottom: "8px" }}>
                        📋 Custom Requirements (Regeneration Only)
                      </div>

                      {/* Input for new requirement */}
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <input
                          type="text"
                          value={requirementInput}
                          onChange={(e) => setRequirementInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddRequirement()}
                          placeholder="e.g., 'visit museum first' or 'sunset at beach'"
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #fcd34d",
                            borderRadius: "8px",
                            fontSize: "13px",
                            background: "#fff",
                            outline: "none"
                          }}
                        />
                        <button
                          onClick={handleAddRequirement}
                          disabled={!requirementInput.trim()}
                          style={{
                            padding: "8px 14px",
                            background: requirementInput.trim() ? "#fcd34d" : "#e5d4a4",
                            color: "#92400e",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "12px",
                            cursor: requirementInput.trim() ? "pointer" : "not-allowed",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            if (requirementInput.trim()) {
                              (e.currentTarget as HTMLButtonElement).style.background = "#fbbf24";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (requirementInput.trim()) {
                              (e.currentTarget as HTMLButtonElement).style.background = "#fcd34d";
                            }
                          }}
                        >
                          + Add
                        </button>
                      </div>

                      {/* Requirements List */}
                      {customRequirements.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {customRequirements.map((req, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "#fff",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                color: "#92400e",
                                border: "1px solid #fcd34d"
                              }}
                            >
                              <span>✓ {req}</span>
                              <button
                                onClick={() => handleRemoveRequirement(idx)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  padding: "0 4px",
                                  fontSize: "16px",
                                  fontWeight: "bold"
                                }}
                                title="Remove requirement"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {customRequirements.length === 0 && (
                        <div style={{ fontSize: "12px", color: "#a16207", fontStyle: "italic" }}>
                          No custom requirements added yet. Add requirements to regenerate itineraries that prioritize your preferences.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === "destinations" && (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
                  <div style={{ display: "flex", gap: "12px", background: "#d1d5db", borderRadius: "10px", padding: "4px", marginBottom: "16px", flexShrink: 0 }}>
                    <button onClick={() => setDestinationsView("search")} style={sharedTabStyles(destinationsView === "search")}>Search</button>
                    <button onClick={() => setDestinationsView("collections")} style={sharedTabStyles(destinationsView === "collections")}>Collections ({collections.length})</button>
                  </div>

                  {destinationsView === "search" ? (
                    <Column id="search" items={searchResults} actionType="add" onActionItem={handleAddToCollections} transparent isSortable={false} onViewDetails={handleViewDetails}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexShrink: 0 }}>
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendMessage(e)}
                          placeholder="Search destinations..."
                          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none", background: "#ffffff" }}
                        />
                        <button onClick={handleSendMessage} style={{ padding: "8px 14px", background: "#000", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                          Search
                        </button>
                      </div>
                    </Column>
                  ) : (
                    <Column
                      id="collections"
                      items={collections}
                      actionType="remove"
                      dropIndicatorIndex={dropIndicator?.column === "collections" ? dropIndicator.index : null}
                      onActionItem={(id: string) => setCollections(collections.filter(i => i.id !== id))}
                      transparent
                      isSortable={true}
                      onViewDetails={handleViewDetails}
                    />
                  )}
                </div>
              )}

              {activeTab === "summaries" && <div style={{ textAlign: "center", padding: "20px" }}>No summaries.</div>}

              {activeTab === "map" && (
                <div className="flex-1 relative">
                  <MapComponent 
                    items={itinerary} 
                    userLocation={userLocation}
                    geofences={itinerary.filter((i:any) => i.lat && i.lng).map((i:any) => ({ lat: i.lat, lng: i.lng, radius: 100, color: "#22c55e" }))}
                    onClose={() => setActiveTab("chat")} 
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
                         Visiting place {simulationIndex + 1} of {itinerary.length}
                       </div>
                     )}
                  </div>
                </div>
              )}

              {activeTab === "visits" && savedItinerary && (
                <div style={{ height: "100%", overflowY: "auto", padding: "16px", borderRadius: "12px", background: "#f3f4f6" }}>
                  <VisitTrackingPanel
                    itineraryId={savedItineraryId || ""}
                    places={savedItinerary.schedule?.flatMap((day: any) =>
                      day.items?.map((item: any) => ({
                        id: item.placeId || item.id || `place-${Math.random()}`,
                        name: item.place,
                        category: item.activity,
                        expectedDuration: 3600 // Default 1 hour
                      })) || []
                    ) || []}
                    token={typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}
                    onVisitChange={(count) => setVisitCount(count)}
                  />
                </div>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div style={{
                padding: "14px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                width: "100%",
                maxWidth: "300px",
                fontSize: "14px",
                opacity: 0.9
              }}>
                {activeItem.name}
              </div>
            )}
          </DragOverlay>

          {/* Modal Injection */}
          <LocationModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            data={selectedLocation}
          />

          {/* Confirmation Modal */}
          <ConfirmationModal
            isOpen={confirmationOpen}
            itinerary={selectedItinerary}
            tripName={tripName}
            onConfirm={handleConfirmItinerary}
            onClose={() => setConfirmationOpen(false)}
            onEdit={handleEditAndRegenerate}
          />

        </DndContext>
      </main>

      <footer style={{ height: "48px", flexShrink: 0, padding: "0 5%", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid #d9d9d9", background: "#f5f5f5", fontSize: "14px", color: "#666" }}>
        ©Odyssey. Made with ❤️ by Route6
      </footer>
    </div>
  );
}