"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GroupTripCard, { GroupTrip } from "./components/GroupTripCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Tab = "discover" | "mine";

const ACTIVITY_TYPES = ["adventure", "beach", "cultural", "food", "hiking", "road trip", "relaxation", "other"];

interface DiscoverFilters {
  destination: string;
  activityType: string;
  maxCost: string;
}

export default function GroupsHubPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("discover");

  // Discover state
  const [discoverTrips, setDiscoverTrips]   = useState<GroupTrip[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [filters, setFilters] = useState<DiscoverFilters>({ destination: "", activityType: "", maxCost: "" });

  // My Groups state
  const [myTrips, setMyTrips]       = useState<GroupTrip[]>([]);
  const [myLoading, setMyLoading]   = useState(false);
  const [myLoaded, setMyLoaded]     = useState(false);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ── Fetch Discover ─────────────────────────────────────────────────────────
  const fetchDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    const params = new URLSearchParams();
    if (filters.destination)  params.set("destination",  filters.destination);
    if (filters.activityType) params.set("activityType", filters.activityType);
    if (filters.maxCost)      params.set("maxCost",      filters.maxCost);

    try {
      const res = await fetch(`${API}/api/groups/discover?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setDiscoverTrips(data.trips || []);
    } catch {
      setDiscoverTrips([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, [filters]);

  // ── Fetch My Groups ────────────────────────────────────────────────────────
  const fetchMine = useCallback(async () => {
    setMyLoading(true);
    try {
      const res = await fetch(`${API}/api/groups/mine`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setMyTrips(data.trips || []);
    } catch {
      setMyTrips([]);
    } finally {
      setMyLoading(false);
      setMyLoaded(true);
    }
  }, []);

  useEffect(() => {
    const t = token();
    if (!t) { router.replace("/login"); return; }
    fetchDiscover();
  }, [fetchDiscover, router]);

  useEffect(() => {
    if (tab === "mine" && !myLoaded) fetchMine();
  }, [tab, myLoaded, fetchMine]);

  function setFilter(k: keyof DiscoverFilters, v: string) {
    setFilters((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] font-body">
      {/* Page Header */}
      <div className="px-4 pt-10 pb-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Trips</h1>
            <p className="text-gray-500 text-sm mt-1">Discover trips to join, or manage the ones you&apos;re part of.</p>
          </div>
          <Link
            href="/groups/create"
            className="bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            + Create Trip
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {(["discover", "mine"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition capitalize ${
                tab === t ? "bg-[#4A9B7F] text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t === "discover" ? "🔍 Discover" : "🧳 My Groups"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* ── DISCOVER TAB ── */}
        {tab === "discover" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="🔍 Destination…"
                value={filters.destination}
                onChange={(e) => setFilter("destination", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDiscover()}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F] w-48"
              />
              <select
                value={filters.activityType}
                onChange={(e) => { setFilter("activityType", e.target.value); }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
              >
                <option value="">All types</option>
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
              <input
                type="number"
                placeholder="Max cost / person"
                value={filters.maxCost}
                onChange={(e) => setFilter("maxCost", e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F] w-44"
              />
              <button
                onClick={fetchDiscover}
                className="bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white text-sm px-4 py-2 rounded-lg transition"
              >
                Search
              </button>
              {(filters.destination || filters.activityType || filters.maxCost) && (
                <button
                  onClick={() => { setFilters({ destination: "", activityType: "", maxCost: "" }); }}
                  className="text-gray-500 hover:text-gray-900 text-sm px-3 py-2 rounded-lg border border-gray-200 transition"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results */}
            {discoverLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : discoverTrips.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3 opacity-40">🔭</p>
                <p className="text-gray-500">No public trips found.</p>
                {(filters.destination || filters.activityType || filters.maxCost) && (
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoverTrips.map((trip) => (
                  <GroupTripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY GROUPS TAB ── */}
        {tab === "mine" && (
          <div className="space-y-6">
            {myLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : myTrips.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3 opacity-40">🧳</p>
                <p className="text-gray-500">You&apos;re not part of any group trips yet.</p>
                <div className="flex gap-3 justify-center mt-4">
                  <button onClick={() => setTab("discover")} className="text-sm text-[#4A9B7F] hover:underline">
                    Discover trips
                  </button>
                  <span className="text-gray-300">·</span>
                  <Link href="/groups/create" className="text-sm text-[#4A9B7F] hover:underline">
                    Create one
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Organising */}
                {myTrips.filter((t) => t.membership?.role === "organizer").length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-600 mb-3">Organising</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myTrips
                        .filter((t) => t.membership?.role === "organizer")
                        .map((trip) => <GroupTripCard key={trip.id} trip={trip} showBadge />)}
                    </div>
                  </div>
                )}

                {/* Joined */}
                {myTrips.filter((t) => t.membership?.role !== "organizer").length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-600 mb-3">Joined</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myTrips
                        .filter((t) => t.membership?.role !== "organizer")
                        .map((trip) => <GroupTripCard key={trip.id} trip={trip} showBadge />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
