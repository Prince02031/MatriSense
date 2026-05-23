"use client";

import { useRouter } from "next/navigation";

export interface GroupTrip {
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
  status: "open" | "full" | "in_progress" | "completed" | "cancelled";
  organizer_id: string;
  organizer_name?: string;
  // Injected by getMine
  membership?: {
    role: string;
    status: string;
    joined_via: string;
  };
}

interface GroupTripCardProps {
  trip: GroupTrip;
  memberCount?: number;
  /** Show membership badge (My Groups tab) */
  showBadge?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-emerald-50 text-emerald-700",
  full:        "bg-yellow-50 text-yellow-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed:   "bg-gray-100 text-gray-500",
  cancelled:   "bg-red-50 text-red-600",
};

const ROLE_COLORS: Record<string, string> = {
  organizer: "bg-[#4A9B7F]/10 text-[#4A9B7F]",
  admin:     "bg-purple-50 text-purple-700",
  member:    "bg-gray-100 text-gray-500",
};

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GroupTripCard({ trip, memberCount, showBadge = false }: GroupTripCardProps) {
  const router = useRouter();
  const startDate = formatDate(trip.date_range_start);
  const endDate   = formatDate(trip.date_range_end);
  const fillPct   = memberCount != null ? Math.min((memberCount / trip.max_participants) * 100, 100) : null;

  return (
    <div
      onClick={() => router.push(`/groups/${trip.id}`)}
      className="block group cursor-pointer"
    >
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-[#4A9B7F] shadow-sm transition-colors duration-200">
        {/* Cover Image */}
        <div className="h-40 relative bg-gradient-to-br from-[#4A9B7F] to-[#ADC4CE] overflow-hidden">
          {trip.cover_image ? (
            <img src={trip.cover_image} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">🗺️</div>
          )}

          {/* Status badge */}
          <span className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[trip.status] || STATUS_COLORS.open}`}>
            {trip.status.replace("_", " ")}
          </span>

          {/* My Groups: pending vs role badge */}
          {showBadge && trip.membership && (
            trip.membership.status === "pending" ? (
              <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700">
                ⏳ Pending
              </span>
            ) : (
              <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[trip.membership.role] || ROLE_COLORS.member}`}>
                {trip.membership.role}
              </span>
            )
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-gray-900 font-semibold text-base truncate">{trip.title}</h3>
            {trip.description && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{trip.description}</p>
            )}
            {trip.organizer_name && (
              <p className="text-xs text-gray-400 mt-1">👤 by {trip.organizer_name}</p>
            )}
          </div>

          {/* Tags */}
          {trip.destination_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trip.destination_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); router.push(`/destinations?search=${encodeURIComponent(tag)}`); }}
                  className="text-xs bg-gray-100 hover:bg-[#4A9B7F]/10 hover:text-[#4A9B7F] text-gray-600 px-2 py-0.5 rounded-full cursor-pointer transition"
                >
                  📍 {tag}
                </span>
              ))}
              {trip.destination_tags.length > 3 && (
                <span className="text-xs text-gray-500">+{trip.destination_tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Date range */}
          {(startDate || endDate) && (
            <p className="text-gray-500 text-xs">
              🗓 {startDate}{endDate && startDate !== endDate ? ` → ${endDate}` : ""}
            </p>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-sm text-gray-800 font-medium">
              {trip.cost_per_person > 0
                ? `${trip.currency} ${trip.cost_per_person.toLocaleString()} / person`
                : "Free to join"}
            </div>
            {trip.activity_type && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                {trip.activity_type}
              </span>
            )}
          </div>

          {/* Capacity bar */}
          {fillPct !== null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{memberCount} / {trip.max_participants} members</span>
                <span>{Math.round(fillPct)}% full</span>
              </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fillPct >= 100 ? "bg-yellow-500" : "bg-[#4A9B7F]"}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
