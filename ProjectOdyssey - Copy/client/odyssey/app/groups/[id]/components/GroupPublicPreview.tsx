"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface GroupTrip {
  id: string;
  title: string;
  description?: string;
  cover_image?: string;
  destination_tags: string[];
  date_range_start?: string;
  date_range_end?: string;
  activity_type?: string;
  max_participants: number;
  cost_per_person: number;
  currency: string;
  status: string;
  organizer_id: string;
  organizer_name?: string;
  auto_approve: boolean;
}

interface MemberRow {
  status: string;
  joined_via?: string;
}

interface Props {
  group: GroupTrip;
  memberCount: number;
  existingMembership: MemberRow | null; // non-null if user previously interacted
  /** true when user arrived via /groups/join/[code] */
  viaInvite: boolean;
  /** raw invite code from URL (needed for join-invite call) */
  inviteCode?: string;
  onJoined: () => void; // parent refreshes into full dashboard
}

export default function GroupPublicPreview({
  group, memberCount, existingMembership, viaInvite, onJoined,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Treat "left" as null — user should see join buttons again after leaving
  const initialStatus = existingMembership?.status ?? null;
  const [localStatus, setLocalStatus] = useState<string | null>(
    initialStatus === "left" ? null : initialStatus
  );
  const [partySize, setPartySize] = useState(1);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function callEndpoint(path: string, body: Record<string, unknown> = {}) {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/groups/${group.id}/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinInvite() {
    const data = await callEndpoint("join-invite", { partySize });
    if (data.success) {
      onJoined();
    } else {
      showToast(data.error || "Failed to join.");
    }
  }

  async function handleJoinDiscovery() {
    const data = await callEndpoint("join", { partySize });
    if (data.success) {
      if (data.autoApproved) {
        onJoined();
      } else {
        setLocalStatus("pending");
        showToast(partySize > 1
          ? `Request for ${partySize} people sent — the organiser will review it.`
          : "Request sent — the organiser will review your request.");
      }
    } else {
      showToast(data.error || "Failed to join.");
    }
  }

  async function handleRejectInvite() {
    const data = await callEndpoint("reject-invite");
    if (data.success) {
      setLocalStatus("invite_rejected");
      showToast("Invitation declined.");
    } else {
      showToast(data.error || "Failed to decline invitation.");
    }
  }

  const fillPct = Math.min((memberCount / group.max_participants) * 100, 100);

  const startDate = group.date_range_start
    ? new Date(group.date_range_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const endDate = group.date_range_end
    ? new Date(group.date_range_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-[#FFF5E9] font-body">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Hero Cover */}
      <div className="h-56 sm:h-72 relative bg-gradient-to-br from-[#4A9B7F] to-[#ADC4CE] overflow-hidden">
        {group.cover_image ? (
          <img src={group.cover_image} alt={group.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl opacity-30">🗺️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-10 pb-20 space-y-6">

        {/* Title block */}
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs bg-[#4A9B7F]/10 text-[#4A9B7F] px-2.5 py-1 rounded-full capitalize">
              {group.status.replace("_", " ")}
            </span>
            {group.activity_type && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                {group.activity_type}
              </span>
            )}
            {viaInvite && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                ✉️ Personal invite
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{group.title}</h1>
          {group.organizer_name && (
            <p className="text-sm text-gray-500 mt-1">👤 Hosted by <span className="font-medium text-gray-700">{group.organizer_name}</span></p>
          )}
          {group.description && <p className="text-gray-600 mt-2 text-sm leading-relaxed">{group.description}</p>}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Members", value: `${memberCount} / ${group.max_participants}` },
            { label: "Cost", value: group.cost_per_person > 0 ? `${group.currency} ${group.cost_per_person.toLocaleString()}` : "Free" },
            { label: "From", value: startDate || "TBD" },
            { label: "To",   value: endDate   || "TBD" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
              <p className="text-gray-500 text-xs">{label}</p>
              <p className="text-gray-900 text-sm font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Destinations */}
        {group.destination_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {group.destination_tags.map((tag) => (
              <button
                key={tag}
                onClick={() => router.push(`/destinations?search=${encodeURIComponent(tag)}`)}
                className="text-sm bg-gray-100 hover:bg-[#4A9B7F]/10 hover:text-[#4A9B7F] text-gray-700 px-3 py-1 rounded-full transition cursor-pointer"
              >
                📍 {tag}
              </button>
            ))}
          </div>
        )}

        {/* Capacity bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{memberCount} members joined</span>
            <span>{group.max_participants - memberCount} spots left</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillPct >= 100 ? "bg-yellow-500" : "bg-[#4A9B7F]"}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTION BUTTONS — differ by arrival context and current state  */}
        {/* ============================================================ */}
        <div className="pt-2">
          {/* Already pending */}
          {localStatus === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-5 py-4 text-sm text-center">
              ⏳ Your join request is pending. The organiser will review it.
            </div>
          )}

          {/* Rejected by organiser */}
          {localStatus === "rejected" && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 text-sm text-center">
              ✗ Your join request was declined by the organiser.
            </div>
          )}

          {/* Declined invite */}
          {localStatus === "invite_rejected" && (
            <div className="space-y-3">
              <div className="bg-gray-100 border border-gray-200 text-gray-600 rounded-xl px-5 py-4 text-sm text-center">
                You declined this invitation.
              </div>
              {/* Party size stepper */}
              <PartySizeStepper value={partySize} onChange={setPartySize} max={group.max_participants - memberCount} />
              {/* Still allow them to request — will be pending */}
              <button
                onClick={handleJoinDiscovery}
                disabled={loading}
                className="w-full border border-[#4A9B7F] text-[#4A9B7F] hover:bg-[#4A9B7F] hover:text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {loading ? "Sending…" : "Request to Join Anyway"}
              </button>
              <p className="text-center text-xs text-gray-400">The organiser will need to approve this request.</p>
            </div>
          )}

          {/* Via invite link — show Join + Reject */}
          {!localStatus && viaInvite && (
            <div className="space-y-3">
              <PartySizeStepper value={partySize} onChange={setPartySize} max={group.max_participants - memberCount} />
              <button
                onClick={handleJoinInvite}
                disabled={loading || group.status === "full"}
                className="w-full bg-[#4A9B7F] hover:bg-[#3d8a6d] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition"
              >
                {loading ? "Joining…" : group.status === "full" ? "Trip is Full" : partySize > 1 ? `Join for ${partySize} people` : "Join This Trip"}
              </button>
              <button
                onClick={handleRejectInvite}
                disabled={loading}
                className="w-full border border-gray-200 hover:border-red-400 hover:text-red-500 text-gray-500 font-medium py-3 rounded-xl transition text-sm disabled:opacity-50"
              >
                Reject Invitation
              </button>
              <p className="text-center text-xs text-gray-400">Joining via invite link is instant.</p>
            </div>
          )}

          {/* Via discovery (card click) */}
          {!localStatus && !viaInvite && (
            <div className="space-y-2">
              <PartySizeStepper value={partySize} onChange={setPartySize} max={group.max_participants - memberCount} />
              <button
                onClick={handleJoinDiscovery}
                disabled={loading || group.status === "full"}
                className="w-full bg-[#4A9B7F] hover:bg-[#3d8a6d] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition"
              >
                {loading ? "Joining…"
                  : group.status === "full" ? "Trip is Full"
                  : group.auto_approve
                    ? partySize > 1 ? `Join for ${partySize} people` : "Join This Trip"
                    : partySize > 1 ? `Request for ${partySize} people` : "Request to Join"}
              </button>
              {!group.auto_approve && group.status !== "full" && (
                <p className="text-center text-xs text-gray-400">The organiser reviews all join requests.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Party Size Stepper ─────────────────────────────────────────────────────
function PartySizeStepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  const spotsLeft = Math.max(1, max);
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-900">How many people?</p>
        <p className="text-xs text-gray-400">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} available</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#4A9B7F] hover:text-[#4A9B7F] transition font-bold"
        >−</button>
        <span className="text-gray-900 font-semibold w-4 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(spotsLeft, value + 1))}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#4A9B7F] hover:text-[#4A9B7F] transition font-bold"
        >+</button>
      </div>
    </div>
  );
}
