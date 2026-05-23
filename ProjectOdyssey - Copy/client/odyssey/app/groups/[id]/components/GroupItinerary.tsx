"use client";

interface Place {
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  duration?: number;
  notes?: string;
}

interface DaySchedule {
  day: number;
  date?: string;
  places: Place[];
}

interface Itinerary {
  id: string;
  trip_name: string;
  selected_itinerary?: {
    title?: string;
    schedule?: DaySchedule[];
    totalCost?: number;
    estimatedDays?: number;
  };
  selected_places?: Place[];
  status: string;
  created_at: string;
}

interface Props {
  itinerary: Itinerary | null;
}

export default function GroupItinerary({ itinerary }: Props) {
  if (!itinerary) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-40">🗺️</div>
        <p className="text-gray-500 text-sm">No itinerary linked to this group trip.</p>
        <p className="text-gray-400 text-xs mt-1">The organiser can link one by editing the trip.</p>
      </div>
    );
  }

  const schedule = itinerary.selected_itinerary?.schedule || [];
  const places   = itinerary.selected_places || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 text-base">{itinerary.trip_name}</h3>
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
          {itinerary.selected_itinerary?.estimatedDays && (
            <span>🗓 {itinerary.selected_itinerary.estimatedDays} days</span>
          )}
          {itinerary.selected_itinerary?.totalCost != null && (
            <span>💰 Est. cost: {itinerary.selected_itinerary.totalCost.toLocaleString()}</span>
          )}
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${itinerary.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>
            {itinerary.status}
          </span>
        </div>
      </div>

      {/* Day-by-day schedule */}
      {schedule.length > 0 ? (
        <div className="space-y-4">
          {schedule.map((day) => (
            <div key={day.day}>
              <h4 className="text-sm font-semibold text-[#4A9B7F] mb-2">
                Day {day.day}{day.date ? ` — ${new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}` : ""}
              </h4>
              <div className="space-y-2 pl-3 border-l border-gray-200">
                {(day.places || []).map((place, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{place.name}</p>
                        {place.address && <p className="text-xs text-gray-500 mt-0.5">{place.address}</p>}
                        {place.notes && <p className="text-xs text-gray-400 mt-1 italic">{place.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {place.duration && <p className="text-xs text-gray-500">{place.duration} min</p>}
                        {place.rating && <p className="text-xs text-yellow-400">⭐ {place.rating}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : places.length > 0 ? (
        /* Fallback: flat place list */
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-3">Places ({places.length})</h4>
          <div className="space-y-2">
            {places.map((place, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-gray-400 text-sm font-mono shrink-0">{i + 1}.</span>
                <div>
                  <p className="text-sm text-gray-900">{place.name}</p>
                  {place.category && <p className="text-xs text-gray-500 capitalize">{place.category}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-400 py-8 text-sm">This itinerary has no places yet.</p>
      )}
    </div>
  );
}
