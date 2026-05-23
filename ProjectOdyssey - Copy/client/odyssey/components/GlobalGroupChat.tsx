"use client";

/**
 * GlobalGroupChat
 * ───────────────
 * Mounted once in the root layout so the chat button persists on every page.
 *
 * Behaviour:
 *  • Not logged in / no approved groups → renders nothing.
 *  • 1 approved group  → floating button; click opens that group's chat directly.
 *  • 2+ approved groups → floating button; click opens a group-picker panel;
 *                         selecting a group opens its chat.
 *
 * Once a group is selected the FloatingGroupChat component takes over.
 * The "←" back-arrow in the chat header returns to the group picker (multi-group only).
 */

import { useState, useEffect } from "react";
import FloatingGroupChat from "@/app/groups/[id]/components/FloatingGroupChat";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

interface GroupSummary {
  id: string;
  title: string;
  destination: string;
}

interface Member {
  id: string;
  username: string;
}

export default function GlobalGroupChat() {
  const [userId, setUserId]     = useState("");
  const [username, setUsername] = useState("");
  const [groups, setGroups]     = useState<GroupSummary[]>([]);

  // Which group is currently open in the chat panel
  const [selectedGroupId, setSelectedGroupId]       = useState<string | null>(null);
  const [selectedGroupTitle, setSelectedGroupTitle] = useState("");

  // Members of the selected group (for @mention autocomplete)
  const [members, setMembers] = useState<Member[]>([]);

  // Group-picker panel visibility
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Bootstrap: read JWT + fetch approved groups ───────────────────────────
  useEffect(() => {
    const t = getToken();
    if (!t) return;

    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      setUserId(payload.id || payload.userId || payload.sub || "");
      setUsername(payload.username || "");
    } catch {
      return; // invalid token — abort
    }

    fetch(`${API}/api/groups/mine`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const approved: GroupSummary[] = (data.trips || [])
          .filter((trip: Record<string, unknown>) => {
            const mem = trip.membership as Record<string, string> | undefined;
            return mem?.status === "approved";
          })
          .map((trip: Record<string, string>) => ({
            id: trip.id,
            title: trip.title || "Group Trip",
            destination: trip.destination || "",
          }));
        setGroups(approved);
      })
      .catch(() => {});
  }, []);

  // ── Fetch members when a group is selected ────────────────────────────────
  useEffect(() => {
    if (!selectedGroupId) { setMembers([]); return; }
    const t = getToken();
    fetch(`${API}/api/groups/${selectedGroupId}/messages/members`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setMembers(data.members || []); })
      .catch(() => {});
  }, [selectedGroupId]);

  // ── Not logged in or no approved groups ──────────────────────────────────
  if (!userId || groups.length === 0) return null;

  // ── A group is selected → hand off to FloatingGroupChat ──────────────────
  if (selectedGroupId) {
    return (
      <FloatingGroupChat
        groupId={selectedGroupId}
        currentUserId={userId}
        currentUsername={username}
        members={members}
        groupTitle={selectedGroupTitle}
        // Back button only makes sense when there are multiple groups
        onBack={
          groups.length > 1
            ? () => { setSelectedGroupId(null); setSelectedGroupTitle(""); }
            : undefined
        }
        autoOpen
      />
    );
  }

  // ── No group selected → show floating chat button (+picker for multi-group) ──
  function handleButtonClick() {
    if (groups.length === 1) {
      // Auto-select the only group and open the panel
      setSelectedGroupId(groups[0].id);
      setSelectedGroupTitle(groups[0].title);
    } else {
      setPickerOpen((v) => !v);
    }
  }

  return (
    <>
      {/* ── Floating chat button ── */}
      <button
        onClick={handleButtonClick}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="Group Chats"
      >
        {pickerOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        )}
      </button>

      {/* ── Group picker panel (multi-group users only) ── */}
      {pickerOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#4A9B7F] text-white">
            <span className="font-semibold text-sm flex items-center gap-2">
              💬 Your Group Chats
            </span>
            <button onClick={() => setPickerOpen(false)} className="hover:opacity-70 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Group list */}
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setSelectedGroupTitle(g.title);
                  setPickerOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#4A9B7F]/5 transition group"
              >
                <p className="font-medium text-gray-800 text-sm truncate group-hover:text-[#4A9B7F] transition-colors">
                  {g.title}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {g.destination || "No destination set"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
