"use client";

import { useState } from "react";

type ScheduleItem = {
  placeId: string | null;
  name: string;
  category: string;
  time: string;
  timeRange: string;
  visitDurationMin: number;
  entryCost?: number | null;
  notes: string;
};

type ScheduleDay = {
  day: number;
  date: string;
  items: ScheduleItem[];
};

type Itinerary = {
  id: string;
  title: string;
  description: string;
  paceDescription: string;
  estimatedCost: number;
  currency?: string;
  schedule: ScheduleDay[];
};

type MultiOptionSelectorProps = {
  itineraries: Itinerary[];
  loading?: boolean;
  onSelect: (itinerary: Itinerary) => void;
  onBack?: () => void;
};

export default function MultiOptionSelector({
  itineraries,
  loading = false,
  onSelect,
  onBack,
}: MultiOptionSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
        <p>Odyssey is generating your options...</p>
      </div>
    );
  }

  if (!itineraries || itineraries.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
        <p>No itineraries generated. Try again.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
          🎯 Choose Your Itinerary Style
        </h3>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Select one of these 3 options, or edit places to regenerate
        </p>
      </div>

      {/* Itinerary Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: itineraries.length <= 2 ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {itineraries.map((itinerary) => {
          const isHovered = hoveredId === itinerary.id;
          const totalDays = itinerary.schedule.length;
          const totalPlaces = itinerary.schedule.reduce((sum, day) => sum + day.items.length, 0);

          return (
            <div
              key={itinerary.id}
              onMouseEnter={() => setHoveredId(itinerary.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: isHovered ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                boxShadow: isHovered ? "0 4px 12px rgba(59, 130, 246, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
                overflow: "hidden",
                transition: "all 0.3s",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => onSelect(itinerary)}
            >
              {/* Card Header */}
              <div style={{ padding: "16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937", marginBottom: "4px" }}>
                  {itinerary.title}
                </h4>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  {itinerary.paceDescription}
                </p>
              </div>

              {/* Card Body */}
              <div style={{ padding: "16px", flex: 1 }}>
                {/* Description */}
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px", lineHeight: "1.5" }}>
                  {itinerary.description}
                </p>

                {/* Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}>Duration</p>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>
                      {totalDays} day{totalDays > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}>Places</p>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>
                      {totalPlaces}
                    </p>
                  </div>
                </div>

                {/* Cost */}
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}>Estimated Cost</p>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#3b82f6" }}>
                    {itinerary.currency || "USD"} {itinerary.estimatedCost.toLocaleString()}
                  </p>
                </div>

                {/* Sample Schedule Preview */}
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "6px", fontWeight: 600 }}>
                    Sample Schedule:
                  </p>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {itinerary.schedule.slice(0, 2).map((day) => (
                      <div key={day.day} style={{ marginBottom: "6px" }}>
                        <span style={{ fontWeight: 600, color: "#1f2937" }}>Day {day.day}:</span>{" "}
                        {day.items.map((item) => {
                          const costLabel =
                            item.entryCost === 0 ? " (Free)" :
                            item.entryCost ? ` (${itinerary.currency || ""} ${item.entryCost.toLocaleString()})`.trim() : "";
                          return item.name + costLabel;
                        }).join(" → ")}
                        {itinerary.schedule.length > 2 && day.day === 2 && <span>...</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer - Select Button */}
              <div
                style={{
                  padding: "12px 16px",
                  background: isHovered ? "#eff6ff" : "#f9fafb",
                  borderTop: "1px solid #e5e7eb",
                  textAlign: "center",
                }}
              >
                <button
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: isHovered ? "#3b82f6" : "#e5e7eb",
                    color: isHovered ? "#fff" : "#6b7280",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6";
                    (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isHovered ? "#3b82f6" : "#e5e7eb";
                    (e.currentTarget as HTMLButtonElement).style.color = isHovered ? "#fff" : "#6b7280";
                  }}
                  onClick={() => onSelect(itinerary)}
                >
                  Select This Option →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            padding: "8px 12px",
            background: "#f3f4f6",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
          }}
        >
          ← Back
        </button>
      )}
    </div>
  );
}
