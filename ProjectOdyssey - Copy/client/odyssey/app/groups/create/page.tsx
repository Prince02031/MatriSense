"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Itinerary {
  id: string;
  trip_name: string;
  status: string;
  created_at: string;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    itineraryId:     "",
    title:           "",
    description:     "",
    destinationTags: "",   // comma-separated input
    dateRangeStart:  "",
    dateRangeEnd:    "",
    activityType:    "",
    maxParticipants: 10,
    costPerPerson:   0,
    currency:        "BDT",
    isPublic:        true,
    autoApprove:     false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    fetch(`${API}/api/trips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setItineraries(d.data || d.itineraries || d.trips || []);
      })
      .catch(() => setItineraries([]))
      .finally(() => setLoading(false));
  }, [router]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) { setError("Title is required."); return; }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    const payload = {
      ...form,
      destinationTags: form.destinationTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      itineraryId: form.itineraryId || undefined,
    };

    try {
      const res = await fetch(`${API}/api/groups/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/groups/${data.group.id}`);
      } else {
        setError(data.error || "Failed to create group trip.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9]">
        <div className="w-8 h-8 border-4 border-[#4A9B7F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] font-body px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm mb-4 flex items-center gap-1 transition">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Group Trip</h1>
          <p className="text-gray-500 text-sm mt-1">Share one of your itineraries and invite others to join.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Link Itinerary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="font-semibold text-gray-900">Link an Itinerary <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
            {itineraries.length === 0 ? (
              <p className="text-gray-400 text-sm">No itineraries found. You can still create a group trip without one.</p>
            ) : (
              <select
                value={form.itineraryId}
                onChange={(e) => set("itineraryId", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
              >
                <option value="">— No itinerary —</option>
                {itineraries.map((it) => (
                  <option key={it.id} value={it.id}>{it.trip_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Basic Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">Trip Details</h2>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Trip Title *</label>
              <input
                type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Cox's Bazar Winter Getaway"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
                maxLength={150}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description} onChange={(e) => set("description", e.target.value)}
                rows={3} placeholder="What's the vibe? What will you do?"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Destinations <span className="text-gray-400">(comma-separated)</span></label>
              <input
                type="text" value={form.destinationTags} onChange={(e) => set("destinationTags", e.target.value)}
                placeholder="Cox's Bazar, Dhaka, Sylhet"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="date" value={form.dateRangeStart} onChange={(e) => set("dateRangeStart", e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="date" value={form.dateRangeEnd} onChange={(e) => set("dateRangeEnd", e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Activity Type</label>
              <select
                value={form.activityType} onChange={(e) => set("activityType", e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
              >
                <option value="">— Select type —</option>
                {["adventure", "beach", "cultural", "food", "hiking", "road trip", "relaxation", "other"].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Membership Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">Membership</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Max Participants</label>
                <input
                  type="number" min={2} max={100} value={form.maxParticipants}
                  onChange={(e) => set("maxParticipants", parseInt(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Cost per Person</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} value={form.costPerPerson}
                    onChange={(e) => set("costPerPerson", parseFloat(e.target.value))}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                  />
                  <select
                    value={form.currency} onChange={(e) => set("currency", e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                  >
                    {["BDT", "USD", "EUR", "GBP", "INR"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set("isPublic", !form.isPublic)}
                  className={`w-10 h-5.5 rounded-full transition-colors ${form.isPublic ? "bg-[#4A9B7F]" : "bg-gray-200"} relative flex items-center px-0.5 cursor-pointer`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublic ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">Public Trip</p>
                  <p className="text-xs text-gray-500">Visible on the Discover page</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set("autoApprove", !form.autoApprove)}
                  className={`w-10 h-5.5 rounded-full transition-colors ${form.autoApprove ? "bg-[#4A9B7F]" : "bg-gray-200"} relative flex items-center px-0.5 cursor-pointer`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoApprove ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">Auto-approve Discovery Joins</p>
                  <p className="text-xs text-gray-500">People who find your trip on Discover join instantly</p>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={submitting}
            className="w-full bg-[#4A9B7F] hover:bg-[#3d8a6d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
          >
            {submitting ? "Creating…" : "Create Group Trip 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}
