"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Itinerary {
  id: string;
  trip_name: string;
  status: string;
}

interface FormState {
  itinerary_id:    string;
  title:           string;
  description:     string;
  destination_tags: string;  // comma-separated in the input
  date_range_start: string;
  date_range_end:   string;
  activity_type:   string;
  max_participants: number;
  cost_per_person:  number;
  currency:        string;
  is_public:       boolean;
  auto_approve:    boolean;
}

export default function EditGroupPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  const [form, setForm] = useState<FormState>({
    itinerary_id:    "",
    title:           "",
    description:     "",
    destination_tags:"",
    date_range_start:"",
    date_range_end:  "",
    activity_type:   "",
    max_participants: 10,
    cost_per_person:  0,
    currency:        "BDT",
    is_public:       true,
    auto_approve:    false,
  });

  function set(field: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    // Load group data and user's itineraries in parallel
    Promise.all([
      fetch(`${API}/api/groups/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/api/trips`,        { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([groupRes, tripsRes]) => {
        const g = groupRes.group;
        if (!g) { router.replace(`/groups/${id}`); return; }

        // Verify organizer
        if (groupRes.membership?.role !== "organizer") {
          router.replace(`/groups/${id}`);
          return;
        }

        setItineraries(tripsRes.data || tripsRes.itineraries || tripsRes.trips || []);

        // Pre-populate form with existing values
        setForm({
          itinerary_id:    g.itinerary_id    || "",
          title:           g.title           || "",
          description:     g.description     || "",
          destination_tags:(Array.isArray(g.destination_tags) ? g.destination_tags.join(", ") : ""),
          date_range_start:(g.date_range_start ? g.date_range_start.slice(0, 10) : ""),
          date_range_end:  (g.date_range_end   ? g.date_range_end.slice(0, 10)   : ""),
          activity_type:   g.activity_type   || "",
          max_participants: g.max_participants ?? 10,
          cost_per_person:  g.cost_per_person  ?? 0,
          currency:        g.currency        || "BDT",
          is_public:       g.is_public       ?? true,
          auto_approve:    g.auto_approve     ?? false,
        });
      })
      .catch(() => setError("Failed to load group data."))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError("Title is required."); return; }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    // Build snake_case payload — matches what GroupTripModel.update() expects
    const payload: Record<string, unknown> = {
      title:           form.title.trim(),
      description:     form.description || null,
      destination_tags: form.destination_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      date_range_start: form.date_range_start || null,
      date_range_end:   form.date_range_end   || null,
      activity_type:    form.activity_type    || null,
      max_participants: form.max_participants,
      cost_per_person:  form.cost_per_person,
      currency:         form.currency,
      is_public:        form.is_public,
      auto_approve:     form.auto_approve,
      itinerary_id:     form.itinerary_id || null,
    };

    try {
      const res = await fetch(`${API}/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/groups/${id}`);
      } else {
        setError(data.error || "Failed to update group trip.");
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
          <button
            onClick={() => router.push(`/groups/${id}`)}
            className="text-gray-500 hover:text-gray-900 text-sm mb-4 flex items-center gap-1 transition"
          >
            ← Back to trip
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Group Trip</h1>
          <p className="text-gray-500 text-sm mt-1">
            Members, tasks, and expenses are preserved — only the trip details are updated.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Link Itinerary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="font-semibold text-gray-900">
              Linked Itinerary <span className="text-gray-400 font-normal text-sm">(optional)</span>
            </h2>
            {itineraries.length === 0 ? (
              <p className="text-gray-400 text-sm">No itineraries found.</p>
            ) : (
              <select
                value={form.itinerary_id}
                onChange={(e) => set("itinerary_id", e.target.value)}
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
                type="text" value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Cox's Bazar Winter Getaway"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
                maxLength={150}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="What's the vibe? What will you do?"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Destinations <span className="text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text" value={form.destination_tags}
                onChange={(e) => set("destination_tags", e.target.value)}
                placeholder="Cox's Bazar, Dhaka, Sylhet"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4A9B7F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="date" value={form.date_range_start}
                  onChange={(e) => set("date_range_start", e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="date" value={form.date_range_end}
                  onChange={(e) => set("date_range_end", e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Activity Type</label>
              <select
                value={form.activity_type}
                onChange={(e) => set("activity_type", e.target.value)}
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
                  type="number" min={1} max={500} value={form.max_participants}
                  onChange={(e) => set("max_participants", parseInt(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Cost per Person</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} value={form.cost_per_person}
                    onChange={(e) => set("cost_per_person", parseFloat(e.target.value))}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#4A9B7F]"
                  />
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
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
                  onClick={() => set("is_public", !form.is_public)}
                  className={`w-10 h-5.5 rounded-full transition-colors ${form.is_public ? "bg-[#4A9B7F]" : "bg-gray-200"} relative flex items-center px-0.5 cursor-pointer`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_public ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">Public Trip</p>
                  <p className="text-xs text-gray-500">Visible on the Discover page</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set("auto_approve", !form.auto_approve)}
                  className={`w-10 h-5.5 rounded-full transition-colors ${form.auto_approve ? "bg-[#4A9B7F]" : "bg-gray-200"} relative flex items-center px-0.5 cursor-pointer`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.auto_approve ? "translate-x-5" : "translate-x-0"}`} />
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

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/groups/${id}`)}
              className="flex-1 border border-gray-200 hover:border-gray-300 text-gray-600 font-medium py-3 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#4A9B7F] hover:bg-[#3d8a6d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
            >
              {submitting ? "Saving…" : "Save Changes ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
