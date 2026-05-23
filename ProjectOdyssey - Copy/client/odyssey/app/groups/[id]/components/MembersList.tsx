"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_via: string;
  joined_at: string;
  party_size?: number;
  username?: string; // enriched by parent if available
}

/** Show a truncated user ID until profile system is merged */
function displayName(m: Member): string {
  if (m.username) return m.username;
  // Show first 8 chars of the ID as a readable placeholder
  return `User …${m.user_id.slice(-6)}`;
}

interface Props {
  groupId: string;
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
}

const ROLE_BADGE: Record<string, string> = {
  organizer: "bg-[#4A9B7F]/10 text-[#4A9B7F]",
  admin:     "bg-purple-50 text-purple-700",
  member:    "bg-gray-100 text-gray-500",
};

const STATUS_BADGE: Record<string, string> = {
  approved:       "text-emerald-400",
  pending:        "text-yellow-400",
  rejected:       "text-red-400",
  invite_rejected:"text-gray-500",
  left:           "text-gray-600",
};

export default function MembersList({ groupId, members, currentUserId, currentUserRole, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManage = ["organizer", "admin"].includes(currentUserRole);

  async function action(endpoint: string, method = "POST") {
    setActionLoading(endpoint);
    const token = localStorage.getItem("token");
    await fetch(`${API}/api/groups/${groupId}/${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    setActionLoading(null);
    onRefresh();
  }

  const approved = members.filter((m) => m.status === "approved");
  const pending  = members.filter((m) => m.status === "pending");

  return (
    <div className="space-y-6">

      {/* Pending requests — organizer/admin only */}
      {canManage && pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-yellow-600 mb-3">
            ⏳ Pending Requests ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-gray-900 font-medium">{displayName(m)}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {m.joined_via?.replace("_", " ")}
                    {(m.party_size ?? 1) > 1 && (
                      <span className="ml-1.5 text-yellow-700 font-medium">· Party of {m.party_size}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => action(`approve/${m.user_id}`)}
                    disabled={!!actionLoading}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => action(`reject/${m.user_id}`)}
                    disabled={!!actionLoading}
                    className="text-xs bg-gray-100 hover:bg-red-600 text-gray-600 hover:text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved members */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">
          Members ({approved.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {approved.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {displayName(m).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">
                    {displayName(m)}
                    {m.user_id === currentUserId && <span className="text-gray-400 text-xs ml-1">(you)</span>}
                    {(m.party_size ?? 1) > 1 && (
                      <span className="text-xs text-gray-500 ml-1.5">+{(m.party_size ?? 1) - 1} more</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    Joined {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_BADGE[m.role] || ROLE_BADGE.member}`}>
                  {m.role}
                </span>
                {/* Kick button — organizer can kick anyone except themselves */}
                {canManage && m.user_id !== currentUserId && m.role !== "organizer" && (
                  <button
                    onClick={() => action(`kick/${m.user_id}`, "DELETE")}
                    disabled={!!actionLoading}
                    className="text-xs text-gray-600 hover:text-red-400 transition disabled:opacity-50"
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
