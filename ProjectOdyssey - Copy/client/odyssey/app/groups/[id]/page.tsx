"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import GroupPublicPreview from "./components/GroupPublicPreview";
import GroupHeader        from "./components/GroupHeader";
import MembersList        from "./components/MembersList";
import ExpenseTracker     from "./components/ExpenseTracker";
import ActivityBoard      from "./components/ActivityBoard";
import GroupItinerary     from "./components/GroupItinerary";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Tab = "overview" | "members" | "expenses" | "tasks" | "itinerary";

function token() { return localStorage.getItem("token"); }

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  return res.json();
}

export default function GroupDashboardPage() {
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const viaInvite  = searchParams.get("via") === "invite";
  const inviteCode = searchParams.get("code") || undefined;

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [group, setGroup]             = useState<Record<string, unknown> | null>(null);
  const [membership, setMembership]   = useState<Record<string, string> | null>(null);
  const [members, setMembers]         = useState<unknown[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [expenses, setExpenses]       = useState<unknown[]>([]);
  const [settlements, setSettlements] = useState<unknown[]>([]);
  const [activities, setActivities]   = useState<unknown[]>([]);
  const [itinerary, setItinerary]     = useState<unknown | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>("overview");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // ── Load group ─────────────────────────────────────────────────────────────
  const loadGroup = useCallback(async () => {
    const data = await apiFetch(`/api/groups/${id}`);
    setGroup(data.group || null);
    setMembership(data.membership || null);
    setMemberCount(data.memberCount || 0);
    if (data.members) setMembers(data.members);
    // Itinerary is now embedded in the group response (bypasses ownership check)
    if (data.itinerary) setItinerary(data.itinerary);
  }, [id]);

  // ── Load full dashboard data (only for approved members) ──────────────────
  const loadDashboard = useCallback(async () => {
    const [expData, actData, settleData] = await Promise.all([
      apiFetch(`/api/groups/${id}/expenses`),
      apiFetch(`/api/groups/${id}/activities`),
      apiFetch(`/api/groups/${id}/expenses/summary`),
    ]);
    setExpenses(expData.expenses || []);
    setActivities(actData.activities || []);
    setSettlements(settleData.settlements || []);
  }, [id]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = token();
    if (!t) { router.replace(`/login?redirect=/groups/${id}`); return; }

    // Decode user id from JWT (without a library — just parse the payload)
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      setCurrentUserId(payload.id || payload.userId || payload.sub || "");
    } catch { /* ignore */ }

    setLoading(true);
    loadGroup().finally(() => setLoading(false));
  }, [id, router, loadGroup]);

  // When user becomes a member (join action), reload everything
  const handleJoined = useCallback(async () => {
    setLoading(true);
    await loadGroup();
    await loadDashboard();
    setLoading(false);
  }, [loadGroup, loadDashboard]);

  // Load dashboard data once we know the user is a member
  useEffect(() => {
    if (membership?.status === "approved") {
      loadDashboard();
      // Itinerary is fetched inline in loadGroup — no separate ownership-gated call needed
    }
  }, [membership, group, loadDashboard]);

  // ── Refresh helper for child components ───────────────────────────────────
  const refresh = useCallback(() => {
    loadGroup();
    if (membership?.status === "approved") loadDashboard();
  }, [loadGroup, loadDashboard, membership]);

  // ── Poll group data so the host sees membership/status changes in near-real-time ──
  useEffect(() => {
    // Only poll once the initial load is done and the user is a member
    if (loading) return;
    const interval = setInterval(() => {
      loadGroup();
    }, 15_000); // every 15 s — cheap single fetch, keeps status/memberCount fresh
    return () => clearInterval(interval);
  }, [loading, loadGroup]);

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9]">
        <div className="w-10 h-10 border-4 border-[#4A9B7F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5E9] text-center px-4">
        <div>
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-gray-500">Group trip not found.</p>
          <button onClick={() => router.push("/groups")} className="mt-4 text-sm text-[#4A9B7F] hover:underline">
            Browse trips
          </button>
        </div>
      </div>
    );
  }

  const g = group as Record<string, unknown>;
  const isMember = membership?.status === "approved";

  // ── Render: non-member preview ────────────────────────────────────────────
  if (!isMember) {
    return (
      <GroupPublicPreview
        group={g as Parameters<typeof GroupPublicPreview>[0]["group"]}
        memberCount={memberCount}
        existingMembership={membership}
        viaInvite={viaInvite}
        inviteCode={inviteCode}
        onJoined={handleJoined}
      />
    );
  }

  // ── Render: full member dashboard ─────────────────────────────────────────
  const memberRole = membership?.role || "member";
  const approvedMembers = (members as Array<Record<string, string>>).filter((m) => m.status === "approved");

  // Derive first place name from linked itinerary for the header cover
  const itin = itinerary as { selected_itinerary?: { schedule?: Array<{ places?: Array<{ name: string }> }> }; selected_places?: Array<{ name: string }> } | null;
  const firstLocation =
    itin?.selected_itinerary?.schedule?.[0]?.places?.[0]?.name ||
    itin?.selected_places?.[0]?.name ||
    undefined;

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "overview",  label: "Overview",  emoji: "🏠" },
    { id: "members",   label: "Members",   emoji: "👥" },
    { id: "expenses",  label: "Expenses",  emoji: "💰" },
    { id: "tasks",     label: "Tasks",     emoji: "✅" },
    { id: "itinerary", label: "Itinerary", emoji: "🗺️" },
  ];

  const pendingCount = (members as Array<Record<string, string>>).filter((m) => m.status === "pending").length;
  const doneCount    = (activities as Array<Record<string, string>>).filter((a) => a.status === "done").length;

  return (
    <div className="min-h-screen bg-[#FFF5E9] font-body">
      {/* Header (cover + title + invite link) */}
      <GroupHeader
        group={g as Parameters<typeof GroupHeader>[0]["group"]}
        memberRole={memberRole}
        firstLocation={firstLocation}
      />

      {/* Tab bar */}
      <div className="sticky top-0 z-30 bg-[#FFF5E9]/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                activeTab === t.id
                  ? "bg-[#4A9B7F] text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
              {/* Badges */}
              {t.id === "members" && pendingCount > 0 && ["organizer","admin"].includes(memberRole) && (
                <span className="bg-yellow-500 text-black text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Members",  value: `${memberCount} / ${g.max_participants}` },
                { label: "Expenses", value: String((expenses as unknown[]).length) },
                { label: "Tasks",    value: `${doneCount} / ${(activities as unknown[]).length} done` },
                { label: "Status",   value: String(g.status).replace("_", " ") },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="text-gray-900 font-semibold mt-1 capitalize">{value}</p>
                </div>
              ))}
            </div>

            {/* Pending approvals callout for organizer */}
            {pendingCount > 0 && ["organizer","admin"].includes(memberRole) && (
              <div
                className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setActiveTab("members")}
              >
                <p className="text-yellow-700 text-sm font-medium">
                  ⏳ {pendingCount} {pendingCount === 1 ? "person wants" : "people want"} to join
                </p>
                <span className="text-yellow-600 text-xs">Go to Members →</span>
              </div>
            )}

            {/* Destinations */}
            {Array.isArray(g.destination_tags) && (g.destination_tags as string[]).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Destinations</h3>
                <div className="flex flex-wrap gap-2">
                  {(g.destination_tags as string[]).map((tag) => (
                    <span key={tag} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">📍 {tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {g.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">About this trip</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{String(g.description)}</p>
              </div>
            )}

            {/* Leave / Edit buttons */}
            <div className="flex gap-3 pt-2">
              {memberRole === "organizer" && (
                <button
                  onClick={() => router.push(`/groups/${id}/edit`)}
                  className="text-sm border border-gray-200 hover:border-[#4A9B7F] text-gray-500 hover:text-[#4A9B7F] px-4 py-2 rounded-lg transition"
                >
                  ✏️ Edit Trip
                </button>
              )}
              {memberRole !== "organizer" && (
                <button
                  onClick={async () => {
                    if (!confirm("Leave this group trip?")) return;
                    const t = token();
                    await fetch(`${API}/api/groups/${id}/leave`, {
                      method: "POST", headers: { Authorization: `Bearer ${t}` }
                    });
                    router.push("/groups");
                  }}
                  className="text-sm border border-gray-200 hover:border-red-400 text-gray-500 hover:text-red-500 px-4 py-2 rounded-lg transition"
                >
                  Leave Trip
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── MEMBERS ── */}
        {activeTab === "members" && (
          <MembersList
            groupId={id}
            members={members as Parameters<typeof MembersList>[0]["members"]}
            currentUserId={currentUserId}
            currentUserRole={memberRole}
            onRefresh={refresh}
          />
        )}

        {/* ── EXPENSES ── */}
        {activeTab === "expenses" && (
          <ExpenseTracker
            groupId={id}
            expenses={expenses as Parameters<typeof ExpenseTracker>[0]["expenses"]}
            settlements={settlements as Parameters<typeof ExpenseTracker>[0]["settlements"]}
            members={approvedMembers as Parameters<typeof ExpenseTracker>[0]["members"]}
            currentUserId={currentUserId}
            currentUserRole={memberRole}
            currency={String(g.currency || "BDT")}
            onRefresh={refresh}
          />
        )}

        {/* ── TASKS ── */}
        {activeTab === "tasks" && (
          <ActivityBoard
            groupId={id}
            activities={activities as Parameters<typeof ActivityBoard>[0]["activities"]}
            members={approvedMembers as Parameters<typeof ActivityBoard>[0]["members"]}
            currentUserId={currentUserId}
            currentUserRole={memberRole}
            onRefresh={refresh}
          />
        )}

        {/* ── ITINERARY ── */}
        {activeTab === "itinerary" && (
          <GroupItinerary
            itinerary={itinerary as Parameters<typeof GroupItinerary>[0]["itinerary"]}
          />
        )}
      </div>
    </div>
  );
}
