"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MapComponent from "../components/MapComponent";
import { useVisitTracking } from "../hooks/useVisitTracking";
import { useGeofencing } from "../hooks/useGeofencing";

// --- TYPES ---
type Item = {
    id: string;
    placeId?: string;
    name: string;
    category?: string;
    visitDurationMin?: number;
    time?: string;
    description?: string;
    lat?: number;
    lng?: number;
    isBreak?: boolean;
    isCommute?: boolean;
    commuteMode?: "transit" | "driving";
    commuteDurationMin?: number;
    coordinates?: {
        lat: number;
        lng: number;
    };
};

type ItineraryDay = {
    day: number;
    items: Item[];
};

type GroupInfo = {
    id: string;
    title: string;
    memberCount: number;
};

/** Decode JWT payload without a library – payload is just base64url JSON. */
function decodeJwtId(token: string): string | null {
    try {
        const payload = token.split('.')[1];
        const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return json.id || json.sub || null;
    } catch {
        return null;
    }
}

/** Short display name for a user_id (e.g. "User …a3f9b2") */
function shortUser(userId: string): string {
    return `User …${userId.slice(-6)}`;
}

/** Normalize schedule from backend — handles both Record<number, Item[]> and Array<{day, items}> formats */
function normalizeScheduleToArray(schedule: any): ItineraryDay[] {
    if (!schedule) return [];

    // Already array format
    if (Array.isArray(schedule)) {
        return schedule.map((d: any) => ({
            day: d.day,
            items: (d.items || []).map((item: any, idx: number) => ({
                id: item.id || `item-${d.day}-${idx}`,
                placeId: item.placeId,
                name: item.name || item.place || 'Unknown',
                category: item.category,
                visitDurationMin: item.visitDurationMin || 60,
                time: item.time || '09:00',
                description: item.description,
                lat: item.lat || item.coordinates?.latitude || item.coordinates?.lat,
                lng: item.lng || item.coordinates?.longitude || item.coordinates?.lng,
                isBreak: item.isBreak || false,
                isCommute: item.isCommute || false,
                commuteMode: item.commuteMode,
                commuteDurationMin: item.commuteDurationMin,
            }))
        }));
    }

    // Record format: { "1": [...], "2": [...] }
    if (typeof schedule === 'object') {
        return Object.keys(schedule)
            .map(Number)
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b)
            .map(dayNum => ({
                day: dayNum,
                items: (Array.isArray(schedule[dayNum]) ? schedule[dayNum] : (schedule[String(dayNum)] || [])).map((item: any, idx: number) => ({
                    id: item.id || `item-${dayNum}-${idx}`,
                    placeId: item.placeId,
                    name: item.name || item.place || 'Unknown',
                    category: item.category,
                    visitDurationMin: item.visitDurationMin || 60,
                    time: item.time || '09:00',
                    description: item.description,
                    lat: item.lat || item.coordinates?.latitude || item.coordinates?.lat,
                    lng: item.lng || item.coordinates?.longitude || item.coordinates?.lng,
                    isBreak: item.isBreak || false,
                    isCommute: item.isCommute || false,
                    commuteMode: item.commuteMode,
                    commuteDurationMin: item.commuteDurationMin,
                }))
            }));
    }

    return [];
}

export default function TripPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [savedItinerary, setSavedItinerary] = useState<any>(null);
    const [savedItineraryId, setSavedItineraryId] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [mapCollapsed, setMapCollapsed] = useState(false);
    const [geoEnabled, setGeoEnabled] = useState(true);
    const [showMobileMap, setShowMobileMap] = useState(false);

    // Group-trip state
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Load Itinerary — prefer "active" trip, not just latest
    useEffect(() => {
        const loadSavedItinerary = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    router.push("/login");
                    return;
                }

                const uid = decodeJwtId(token);
                setCurrentUserId(uid);

                // ── GROUP CHECK ──────────────────────────────
                const groupRes = await fetch("http://localhost:4000/api/groups/mine/active", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (groupRes.ok) {
                    const groupData = await groupRes.json();
                    if (groupData.group && groupData.itinerary) {
                        const itin = groupData.itinerary;
                        const selectedItin = itin.selected_itinerary;
                        setSavedItineraryId(itin.id);
                        setSavedItinerary({
                            id: itin.id,
                            tripName: `${groupData.group.title}`,
                            schedule: normalizeScheduleToArray(selectedItin?.schedule),
                        });
                        setGroupInfo({
                            id: groupData.group.id,
                            title: groupData.group.title,
                            memberCount: groupData.group.member_count ?? 0,
                        });
                        return;
                    }
                }

                // ── PERSONAL ITINERARY — FIND ACTIVE PLAN ──────────────────
                const res = await fetch("http://localhost:4000/api/trips", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error("Failed to fetch trips");

                const data = await res.json();
                if (data.success && data.data && data.data.length > 0) {
                    // Prefer trip with status "active", fall back to first non-completed
                    const activeTrip = data.data.find((t: any) => t.status === "active");
                    const fallbackTrip = data.data.find((t: any) => t.status !== "completed") || data.data[0];
                    const selectedTrip = activeTrip || fallbackTrip;

                    if (selectedTrip) {
                        const selectedItin = selectedTrip.selected_itinerary;
                        setSavedItineraryId(selectedTrip.id);
                        setSavedItinerary({
                            id: selectedTrip.id,
                            tripName: selectedTrip.trip_name,
                            schedule: normalizeScheduleToArray(selectedItin?.schedule),
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading saved itinerary:", err);
            } finally {
                setLoading(false);
            }
        };

        loadSavedItinerary();
    }, [router]);

    // Visit Tracking Hook
    const {
        currentVisit,
        visitHistory,
        checkIn,
        checkOut,
        fetchVisitHistory,
    } = useVisitTracking(
        savedItineraryId || "",
        typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '',
        currentUserId ?? undefined,
    );

    // ── GROUP SYNC via SSE ────────────────────────────────────────────────────
    useEffect(() => {
        if (!groupInfo || !savedItineraryId) return;

        const token = localStorage.getItem('token') || '';
        const url = `http://localhost:4000/api/visits/stream/${savedItineraryId}?token=${encodeURIComponent(token)}`;

        let fallbackInterval: ReturnType<typeof setInterval> | null = null;
        const es = new EventSource(url);

        es.addEventListener('changed', () => {
            fetchVisitHistory();
        });

        es.addEventListener('unavailable', () => {
            console.warn('[GroupTrip] Realtime unavailable, falling back to 30s poll.');
            fallbackInterval = setInterval(() => fetchVisitHistory(), 30_000);
        });

        es.onerror = () => {
            console.warn('[GroupTrip] SSE reconnecting...');
        };

        return () => {
            es.close();
            if (fallbackInterval) clearInterval(fallbackInterval);
        };
    }, [groupInfo, savedItineraryId, fetchVisitHistory]);

    // Geofencing Hook — respect geoEnabled toggle
    const { geofenceStatus, userLocation } = useGeofencing({
        enabled: geoEnabled && !!savedItineraryId,
        itineraryId: savedItineraryId || undefined,
        autoCheckin: geoEnabled,
        throttleInterval: 10000,
    });

    // Request Notification Permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            Notification.requestPermission();
        }
    }, []);

    // Send Notification helper
    const sendNotification = (title: string, body: string) => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon.png' });
        }
    };

    // Handle Auto-Actions & Notifications
    useEffect(() => {
        if (!geoEnabled) return;
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
    }, [geofenceStatus, currentVisit, checkIn, checkOut, geoEnabled]);

    // Compute the "next" unvisited location for navigation routing
    const nextLocation = useMemo(() => {
        if (!savedItinerary?.schedule) return null;
        const currentDayData = savedItinerary.schedule.find((d: any) => d.day === selectedDay);
        if (!currentDayData) return null;
        for (const item of currentDayData.items) {
            if (item.isCommute || item.isBreak) continue;
            const placeKey = item.placeId || item.id;
            const isCompleted = visitHistory.some((v: any) => v.place_id === placeKey && v.status === 'completed');
            const isCurrent = currentVisit?.place_id === placeKey;
            if (!isCompleted && !isCurrent && (item.lat || item.placeId)) {
                return item;
            }
        }
        return null;
    }, [savedItinerary, selectedDay, visitHistory, currentVisit]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#FFF5E9]">
                <div className="text-xl font-odyssey text-gray-600 animate-pulse">Loading Trip...</div>
            </div>
        );
    }

    if (!savedItinerary) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#FFF5E9]">
                <div className="text-xl font-odyssey text-gray-600 mb-2">No active trip found.</div>
                <p className="text-sm text-gray-500 mb-4">Go to Planner and activate a trip to use Trip Mode.</p>
                <button
                    onClick={() => router.push("/planner2")}
                    className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                    Go to Planner
                </button>
            </div>
        );
    }

    const currentDayItems = savedItinerary.schedule.find((d: any) => d.day === selectedDay)?.items || [];
    const visitedCount = visitHistory.filter((v: any) => v.status === 'completed').length;

    // Filter items suitable for map display (need coordinates or placeId)
    const mapItems = currentDayItems.filter((i: Item) =>
        (i.placeId || (i.lat && i.lng)) && !i.isBreak && !i.isCommute
    );

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-[#FFF5E9]">

            {/* LEFT PANEL: Timeline */}
            <div className={`flex flex-col transition-all duration-300 ${mapCollapsed ? 'w-full' : 'w-full md:w-[450px] lg:w-[500px]'} bg-white border-r border-gray-200 shadow-xl z-10`}>

                {/* Group Banner */}
                {groupInfo && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#4A9B7F] text-white text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        <span className="truncate">Group Trip · {groupInfo.title}</span>
                        <span className="ml-auto flex-shrink-0 text-white/80">syncing</span>
                    </div>
                )}

                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <h1 className="text-2xl font-bold font-odyssey text-gray-900 mb-2">{savedItinerary.tripName}</h1>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm text-gray-500 font-medium">
                            {visitedCount} place{visitedCount !== 1 ? 's' : ''} visited{groupInfo ? ' (group total)' : ''}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Geolocation Toggle */}
                            <button
                                onClick={() => setGeoEnabled(!geoEnabled)}
                                className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1 border transition-all ${geoEnabled
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}
                            >
                                📍 {geoEnabled ? 'Auto-detect ON' : 'Auto-detect OFF'}
                            </button>
                            {/* Map Toggle */}
                            <button
                                onClick={() => { setMapCollapsed(!mapCollapsed); setShowMobileMap(false); }}
                                className="text-sm bg-gray-100 px-3 py-1 rounded-lg hidden md:block"
                            >
                                {mapCollapsed ? 'Show Map' : 'Hide Map'}
                            </button>
                            <button
                                onClick={() => setShowMobileMap(!showMobileMap)}
                                className="text-sm bg-gray-100 px-3 py-1 rounded-lg md:hidden"
                            >
                                {showMobileMap ? 'Hide Map' : 'Show Map'}
                            </button>
                        </div>
                    </div>
                    {/* Next destination indicator */}
                    {nextLocation && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-sm">
                            <span className="text-blue-500 font-bold">→</span>
                            <span className="text-blue-800 font-medium">Next: {nextLocation.name}</span>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${nextLocation.lat && nextLocation.lng ? `${nextLocation.lat},${nextLocation.lng}` : encodeURIComponent(nextLocation.name)}${nextLocation.placeId ? `&destination_place_id=${nextLocation.placeId}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                            >
                                Navigate →
                            </a>
                        </div>
                    )}
                </div>

                {/* Day Tabs */}
                <div className="flex overflow-x-auto p-4 gap-2 border-b border-gray-100 scrollbar-hide">
                    {savedItinerary.schedule.map((day: any) => (
                        <button
                            key={day.day}
                            onClick={() => setSelectedDay(day.day)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${selectedDay === day.day
                                ? "bg-black text-white shadow-md"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Day {day.day}
                        </button>
                    ))}
                </div>

                {/* Vertical Timeline */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[35px] top-6 bottom-6 w-0.5 bg-gray-200" />

                    <div className="space-y-8 relative">
                        {currentDayItems.map((item: Item, index: number) => {
                            // Skip commute cards in trip mode timeline (they're visual-only in planner)
                            if (item.isCommute) {
                                const durationMin = item.commuteDurationMin || 15;
                                return (
                                    <div key={`${item.id || 'commute'}-${index}`} className="flex gap-6 relative">
                                        <div className="w-5 h-5 rounded-full border-4 z-10 flex-shrink-0 mt-1 bg-gray-100 border-gray-200" />
                                        <div className="flex-1 rounded-xl px-4 py-2 bg-gray-50 border border-dashed border-gray-200">
                                            <span className="text-xs text-gray-400 flex items-center gap-2">
                                                {item.commuteMode === 'driving' ? '🚗' : '🚌'} {durationMin} min travel
                                                <span className="font-mono text-gray-300">{item.time || ''}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            const placeKey = item.placeId || item.id;
                            const visitLog = visitHistory.find((v: any) => v.place_id === placeKey);
                            const completedLog = visitHistory.find(
                                (v: any) => v.place_id === placeKey && v.status === 'completed'
                            );
                            const isCurrent = currentVisit?.place_id === placeKey;
                            const isCompleted = !!completedLog;
                            const isPending = !visitLog && !isCurrent;
                            const completedBy =
                                completedLog?.user_id === currentUserId
                                    ? 'You'
                                    : completedLog?.user_id
                                        ? shortUser(completedLog.user_id)
                                        : null;

                            // Build navigation URL — use coordinates if placeId is missing
                            const navUrl = item.placeId
                                ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.name)}&destination_place_id=${item.placeId}`
                                : item.lat && item.lng
                                    ? `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`;

                            return (
                                <div key={`${item.id || 'item'}-${index}`} className="flex gap-6 relative group">
                                    {/* Node */}
                                    <div className={`
                                        w-5 h-5 rounded-full border-4 z-10 flex-shrink-0 mt-1 transition-all duration-300
                                        ${isCompleted ? 'bg-green-500 border-green-200' :
                                            isCurrent ? 'bg-blue-500 border-blue-200 animate-pulse' :
                                                'bg-white border-gray-300'}
                                    `} />

                                    {/* Card */}
                                    <div className={`
                                        flex-1 rounded-2xl p-4 transition-all duration-300 border
                                        ${isCurrent ? 'bg-blue-50 border-blue-200 shadow-md transform scale-[1.02]' :
                                            isCompleted ? 'bg-gray-50 border-gray-100 opacity-75' :
                                                item.isBreak ? 'bg-orange-50 border-orange-200' :
                                                    'bg-white border-gray-100 shadow-sm hover:shadow-md'}
                                    `}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                                                    {item.time || 'Flexible Time'}
                                                </span>
                                                <h3 className={`font-bold text-gray-900 ${isCurrent ? 'text-lg' : 'text-base'} ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                                    {item.isBreak ? `🍽️ ${item.name}` : item.name}
                                                </h3>
                                            </div>
                                            {isCurrent && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full animate-pulse">
                                                    Active
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <span className="text-green-500 font-bold text-lg">✓</span>
                                            )}
                                        </div>

                                        {item.description && (
                                            <p className={`text-sm text-gray-600 line-clamp-2 mb-3 ${isCompleted ? 'line-through opacity-50' : ''}`}>
                                                {item.description}
                                            </p>
                                        )}

                                        {/* Duration */}
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                            <span>⏱ {item.visitDurationMin || 60} min</span>
                                            {item.category && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>}
                                        </div>

                                        {/* Completed-by attribution (group trips) */}
                                        {isCompleted && completedBy && groupInfo && (
                                            <p className="text-xs text-gray-400 mb-2 italic">
                                                Visited by {completedBy}
                                            </p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 mt-2">
                                            {/* Navigate Button */}
                                            <a
                                                href={navUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                                                title="Open in Google Maps"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                                                </svg>
                                                Navigate
                                            </a>

                                            {!isCompleted && !isCurrent && !item.isBreak && (
                                                <button
                                                    onClick={() => checkIn({
                                                        placeId: placeKey,
                                                        placeName: item.name,
                                                        location: {
                                                            lat: item.lat || 0,
                                                            lng: item.lng || 0
                                                        }
                                                    })}
                                                    className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                                                >
                                                    Check In
                                                </button>
                                            )}
                                            {isCurrent && (
                                                <button
                                                    onClick={() => checkOut({})}
                                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    Check Out
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {currentDayItems.length === 0 && (
                            <div className="text-center text-gray-400 py-10">No activities scheduled for this day.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Map (Desktop) */}
            {!mapCollapsed && (
                <div className="hidden md:block flex-1 relative h-full bg-gray-100">
                    <MapComponent
                        items={mapItems}
                        userLocation={userLocation}
                        geofences={mapItems
                            .filter((i: Item) => i.lat && i.lng)
                            .map((i: Item) => {
                                const isCurrent = currentVisit?.place_id === (i.placeId || i.id);
                                const isCompleted = visitHistory.find((v: any) => v.place_id === (i.placeId || i.id))?.status === 'completed';
                                let color = '#22c55e';
                                if (isCurrent) color = '#3b82f6';
                                if (isCompleted) color = '#9ca3af';

                                return {
                                    lat: i.lat!,
                                    lng: i.lng!,
                                    radius: 100,
                                    color
                                };
                            })}
                        onClose={() => { }}
                    />

                    {/* Collapse Button */}
                    <button
                        onClick={() => setMapCollapsed(true)}
                        className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 z-[400] text-gray-600"
                        title="Expand Timeline"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                    </button>

                    {/* Next destination banner on map */}
                    {nextLocation && (
                        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg z-[400] flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 font-medium">Next Stop</div>
                                <div className="text-sm font-bold text-gray-900 truncate">{nextLocation.name}</div>
                            </div>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${nextLocation.lat && nextLocation.lng ? `${nextLocation.lat},${nextLocation.lng}` : encodeURIComponent(nextLocation.name)}${nextLocation.placeId ? `&destination_place_id=${nextLocation.placeId}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                Go →
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Re-expand button when map is collapsed (desktop) */}
            {mapCollapsed && (
                <button
                    onClick={() => setMapCollapsed(false)}
                    className="hidden md:flex absolute top-1/2 right-0 bg-white p-3 rounded-l-xl shadow-lg hover:bg-gray-50 z-50 text-gray-600 transform -translate-y-1/2 border border-r-0 border-gray-200 flex-col items-center gap-1"
                    title="Show Map"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l3-3m-3 3l-3-3m9-1.5V15m0 0l3-3m-3 3l-3-3" />
                    </svg>
                    <span className="block text-xs font-bold mt-1">MAP</span>
                </button>
            )}

            {/* Mobile Map Overlay */}
            {showMobileMap && (
                <div className="fixed inset-0 z-50 md:hidden bg-gray-100">
                    <MapComponent
                        items={mapItems}
                        userLocation={userLocation}
                        geofences={mapItems
                            .filter((i: Item) => i.lat && i.lng)
                            .map((i: Item) => ({
                                lat: i.lat!,
                                lng: i.lng!,
                                radius: 100,
                                color: currentVisit?.place_id === (i.placeId || i.id) ? '#3b82f6' :
                                    visitHistory.find((v: any) => v.place_id === (i.placeId || i.id))?.status === 'completed' ? '#9ca3af' : '#22c55e'
                            }))}
                        onClose={() => setShowMobileMap(false)}
                    />
                    {/* Close button */}
                    <button
                        onClick={() => setShowMobileMap(false)}
                        className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg z-[400]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {/* Next destination on mobile map */}
                    {nextLocation && (
                        <div className="absolute bottom-6 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg z-[400] flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500">Next Stop</div>
                                <div className="text-sm font-bold truncate">{nextLocation.name}</div>
                            </div>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${nextLocation.lat && nextLocation.lng ? `${nextLocation.lat},${nextLocation.lng}` : encodeURIComponent(nextLocation.name)}${nextLocation.placeId ? `&destination_place_id=${nextLocation.placeId}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold"
                            >
                                Go →
                            </a>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
