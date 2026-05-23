"use client";

import { useState } from "react";

interface GroupTrip {
  id: string;
  title: string;
  cover_image?: string;
  date_range_start?: string;
  date_range_end?: string;
  status: string;
  invite_code: string;
  activity_type?: string;
}

interface Props {
  group: GroupTrip;
  memberRole: string;
  /** First place name from the linked itinerary — shown in cover when no cover image */
  firstLocation?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  full:        "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed:   "bg-gray-100 text-gray-500 border-gray-200",
  cancelled:   "bg-red-50 text-red-600 border-red-200",
};

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GroupHeader({ group, memberRole, firstLocation }: Props) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/groups/join/${group.invite_code}`;

  function copyInviteLink() {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2500); };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).then(done).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); done(); } catch { /* silently fail */ }
      document.body.removeChild(ta);
    }
  }

  const startDate = formatDate(group.date_range_start);
  const endDate   = formatDate(group.date_range_end);

  return (
    <div className="relative">
      {/* Cover — relative so the gradient overlay stays within the cover, not spilling onto info bar */}
      <div className="h-52 sm:h-64 bg-gradient-to-br from-[#4A9B7F] to-[#ADC4CE] overflow-hidden relative">
        {group.cover_image ? (
          <img src={group.cover_image} alt={group.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-60">
            <span className="text-6xl">🗺️</span>
            {firstLocation && (
              <span className="text-white font-semibold text-lg drop-shadow">{firstLocation}</span>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Info bar */}
      <div className="px-4 sm:px-6 py-4 bg-[#FFF5E9] border-b border-gray-200">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{group.title}</h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${STATUS_COLORS[group.status] || STATUS_COLORS.open}`}>
                {group.status.replace("_", " ")}
              </span>
              {group.activity_type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full capitalize">
                  {group.activity_type}
                </span>
              )}
            </div>

            {(startDate || endDate) && (
              <p className="text-gray-500 text-sm">
                🗓 {startDate}{endDate && startDate !== endDate ? ` → ${endDate}` : ""}
              </p>
            )}
          </div>

          {/* Invite Link — visible to organizer/admin */}
          {["organizer", "admin"].includes(memberRole) && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-0 shadow-sm">
              <span className="text-gray-400 text-xs truncate max-w-[180px]">{inviteUrl}</span>
              <button
                onClick={copyInviteLink}
                className="shrink-0 text-xs bg-[#4A9B7F] hover:bg-[#3d8a6d] text-white px-3 py-1.5 rounded-md transition font-medium"
              >
                {copied ? "Copied! ✓" : "Copy Link"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
