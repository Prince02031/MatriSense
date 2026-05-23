// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react"; // Import useEffect
import { useRouter } from "next/navigation";
import Image from "next/image";
import ReviewModal from "@/components/ReviewModal";

// --- Types & Interfaces ---
interface Itinerary {
  id: string;
  trip_name: string;
  selected_places: any[];
  selected_itinerary: any;
  status: "draft" | "confirmed";
  created_at: string;
  updated_at: string;
}

import RecommendedPlaces from "./RecommendedPlaces";

// --- Types & Interfaces ---

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // --- PROTECTION LOGIC ---
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem("token");

      // 1. Immediate check: No token? Go to login.
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // 2. Verification check: Ask backend if token is valid
        // NOTE: Use the same IP/URL that worked for your login (e.g., localhost:4000 or your PC IP)
        const res = await fetch("http://localhost:4000/api/user/profile", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        // 3. If backend says error (401/403), the token is bad/expired
        if (!res.ok) {
          throw new Error("Invalid token");
        }

        // 4. Token is good! Load user data
        const data = await res.json();
        setUser(data.user);

        // Optional: Update local storage with fresh user data
        localStorage.setItem("user", JSON.stringify(data.user));

        // 5. Fetch user's trips for Recent Drafts
        try {
          const tripsRes = await fetch("http://localhost:4000/api/trips", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          });
          if (tripsRes.ok) {
            const tripsData = await tripsRes.json();
            if (tripsData.success && Array.isArray(tripsData.data)) {
              setTrips(tripsData.data);
            }
          }
        } catch (tripErr) {
          console.error("Failed to fetch trips:", tripErr);
        } finally {
          setTripsLoading(false);
        }

      } catch (err) {
        console.error("Session expired:", err);
        alert("session expired, please login again");
        // 5. CRITICAL: Wipe storage so Login page doesn't bounce us back
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
        document.cookie = "token=; path=/; max-age=0";

        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [router]);

  // Prevent flash of content while checking auth
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9]">Loading Odyssey...</div>;
  }

  return (
    <div className="bg-[#FFF5E9] min-h-screen font-body">


      {/* --- Main Content --- */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">

        {/* Hero Section with Search */}
        <div className="relative mb-12 rounded-3xl overflow-hidden h-64 sm:h-96 shadow-xl">
          {/* Ensure this path points to your public folder */}
          <img
            src="/dashboard-bg.jpg"
            alt="Travel"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-full max-w-xl px-4">
              <div
                onClick={() => router.push('/destinations')}
                className="flex items-center bg-gray-900 bg-opacity-70 rounded-full overflow-hidden cursor-pointer hover:bg-opacity-80 transition"
              >
                <input
                  type="text"
                  placeholder="Search your next destination..."
                  className="flex-1 px-4 sm:px-6 py-3 bg-transparent text-white placeholder-gray-300 focus:outline-none pointer-events-none"
                  readOnly
                />
                <button className="mt-2 mx-4 sm:mt-0 sm:ml-2 bg-white text-gray-800 px-4 py-1 rounded-full text-sm font-medium hover:bg-gray-100 transition flex items-center gap-1 mb-2 sm:mb-0 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#F19E39">
                    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
                  </svg>
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Drafts Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Recent Drafts</h2>
          <div className="flex flex-wrap gap-4">
            {tripsLoading ? (
              <div className="text-gray-500 text-sm italic">Loading your trips...</div>
            ) : trips.length === 0 ? (
              <div
                onClick={() => router.push('/planner')}
                className="w-full sm:w-auto flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/60 border-2 border-dashed border-gray-300 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition shadow-sm"
              >
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-gray-600 font-medium">No trips yet — start planning!</span>
              </div>
            ) : (
              trips.map((trip) => {
                // Search for an image across selected_places and itinerary schedule items
                const getTripImage = (): string | null => {
                  // 1. Check selected_places for images
                  if (Array.isArray(trip.selected_places)) {
                    for (const place of trip.selected_places) {
                      if (place?.images?.[0]) return place.images[0];
                      if (place?.image) return place.image;
                    }
                  }
                  // 2. Check selected_itinerary.schedule items for images
                  const schedule = trip.selected_itinerary?.schedule;
                  if (Array.isArray(schedule)) {
                    // Array format: [{day, items: [{name, images, ...}]}]
                    for (const dayObj of schedule) {
                      const items = dayObj?.items || [];
                      for (const item of items) {
                        if (item?.images?.[0]) return item.images[0];
                        if (item?.image) return item.image;
                      }
                    }
                  } else if (schedule && typeof schedule === "object") {
                    // Record format: {"1": [{name, images, ...}], ...}
                    for (const key of Object.keys(schedule)) {
                      const items = schedule[key];
                      if (Array.isArray(items)) {
                        for (const item of items) {
                          if (item?.images?.[0]) return item.images[0];
                          if (item?.image) return item.image;
                        }
                      }
                    }
                  }
                  return null;
                };
                const tripImage = getTripImage();

                return (
                  <div
                    key={trip.id}
                    onClick={() => router.push('/planner')}
                    className="relative w-1/2 sm:w-44 h-36 rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition shadow-lg group"
                  >
                    {tripImage ? (
                      <img src={tripImage} alt={trip.trip_name} className="w-full h-full object-cover brightness-75 group-hover:brightness-[0.6] transition" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Status badge */}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${trip.status === 'confirmed'
                      ? 'bg-green-500/90 text-white'
                      : 'bg-white/80 text-gray-700'
                      }`}>
                      {trip.status}
                    </span>

                    {/* Trip name */}
                    <span className="absolute bottom-3 left-3 right-3 text-white text-sm font-semibold truncate">
                      {trip.trip_name}
                    </span>
                  </div>
                );
              })
            )}

            {/* 'Add New' Placeholder */}
            <div
              onClick={() => router.push('/planner')}
              className="w-1/2 sm:w-44 h-36 rounded-2xl bg-gray-300/60 flex items-center justify-center cursor-pointer hover:bg-gray-400/60 transition shadow-lg"
            >
              <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Recommended Section */}
        <RecommendedPlaces />

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#3A3A3A] text-white rounded-2xl p-8 flex flex-col items-center justify-center h-52 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-center">Check out what your Friends are doing!</h3>
            <button
              onClick={() => router.push("/groups")}
              className="bg-gray-300 text-gray-800 px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-400 transition font-semibold text-sm"
            >
              👥 Browse Group Trips <span className="font-bold text-xl">→</span>
            </button>
          </div>
          <div
            onClick={() => setShowReviewModal(true)}
            className="bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl h-52 cursor-pointer hover:bg-gray-800 transition"
          >
            <h3 className="text-3xl font-bold">Review a place</h3>
          </div>
          <div
            onClick={() => router.push('/timeline')}
            className="bg-[#ADC4CE] text-gray-900 rounded-2xl flex flex-col items-center justify-center shadow-xl h-52 cursor-pointer hover:brightness-95 transition group"
          >
            <span className="text-5xl mb-3">📅</span>
            <h3 className="text-3xl font-bold">Your Timeline</h3>
            <span className="mt-3 text-sm font-medium text-gray-600 group-hover:translate-x-1 transition-transform inline-block">View all trips →</span>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />

      {/* Footer */}
      <footer className="bg-gray-300 py-6 text-center mt-16">
        <p className="text-gray-800 text-sm">
          ©Odyssey. Made with <span className="text-red-500">❤️</span> by Route6
        </p>
      </footer>
    </div>
  );
};

export default DashboardPage;
