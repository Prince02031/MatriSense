"use client";

import { useState } from "react";

type ScheduleItem = {
  placeId: string | null;
  name: string;
  category: string;
  time: string;
  timeRange: string;
  visitDurationMin: number;
  notes: string;
};

type ScheduleDay = {
  day: number;
  date: string;
  items: ScheduleItem[];
};

type SelectedItinerary = {
  id: string;
  title: string;
  description: string;
  paceDescription: string;
  estimatedCost: number;
  schedule: ScheduleDay[];
};

type ConfirmationModalProps = {
  isOpen: boolean;
  itinerary: SelectedItinerary | null;
  tripName: string;
  onConfirm: (finalTripName: string) => void;
  onClose: () => void;
  onEdit?: () => void;
  saving?: boolean;
};

export default function ConfirmationModal({
  isOpen,
  itinerary,
  tripName,
  onConfirm,
  onClose,
  onEdit,
  saving = false,
}: ConfirmationModalProps) {
  const [tripNameInput, setTripNameInput] = useState(tripName || "My Trip");

  if (!isOpen || !itinerary) return null;

  const handleConfirm = () => {
    onConfirm(tripNameInput);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          maxHeight: "90vh",
          maxWidth: "600px",
          width: "90%",
          overflowY: "auto",
          zIndex: 1000,
        }}
      >
      {/* Modal Header */}
      <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2937", marginBottom: "4px" }}>
          📋 Confirm Your Itinerary
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Review and confirm your trip before saving
        </p>
      </div>

      {/* Modal Body */}
      <div style={{ padding: "20px" }}>
        {/* Trip Name Input */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937", display: "block", marginBottom: "6px" }}>
            Trip Name
          </label>
          <input
            type="text"
            value={tripNameInput}
            onChange={(e) => setTripNameInput(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
            placeholder="Enter trip name"
          />
        </div>

        {/* Itinerary Summary */}
        <div style={{ marginBottom: "20px", padding: "16px", background: "#f3f4f6", borderRadius: "8px" }}>
          <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1f2937", marginBottom: "8px" }}>
            {itinerary.title}
          </h4>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px", lineHeight: "1.5" }}>
            {itinerary.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <p style={{ fontSize: "11px", color: "#9ca3af" }}>Duration</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>
                {itinerary.schedule.length} days
              </p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "#9ca3af" }}>Cost</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#3b82f6" }}>
                ${itinerary.estimatedCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "#9ca3af" }}>Pace</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>
                {itinerary.paceDescription.split(",")[0]}
              </p>
            </div>
          </div>
        </div>

        {/* Full Schedule */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937", marginBottom: "12px" }}>
            📅 Full Schedule
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {itinerary.schedule.map((day) => (
              <div
                key={day.day}
                style={{
                  padding: "12px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2937" }}>
                    Day {day.day} • {day.date}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {day.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        padding: "8px",
                        background: "#fff",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#1f2937",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            background: "#fef3c7",
                            color: "#92400e",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            textTransform: "capitalize",
                          }}
                        >
                          {item.time}
                        </span>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {item.timeRange}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                        ⏱️ {item.visitDurationMin}m • {item.notes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Footer - Actions */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #e5e7eb",
          background: "#f9fafb",
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            padding: "10px 16px",
            background: "#f3f4f6",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb";
          }}
          onMouseLeave={(e) => {
            if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
          }}
        >
          ← Cancel
        </button>

        {onEdit && (
          <button
            onClick={onEdit}
            disabled={saving}
            style={{
              padding: "10px 16px",
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#fde68a";
            }}
            onMouseLeave={(e) => {
              if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#fef3c7";
            }}
          >
            ✏️ Edit & Regenerate
          </button>
        )}

        <button
          onClick={handleConfirm}
          disabled={saving || !tripNameInput.trim()}
          style={{
            padding: "10px 16px",
            background:
              saving || !tripNameInput.trim() ? "#d1d5db" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: saving || !tripNameInput.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!saving && tripNameInput.trim()) {
              (e.currentTarget as HTMLButtonElement).style.background = "#2563eb";
            }
          }}
          onMouseLeave={(e) => {
            if (!saving && tripNameInput.trim()) {
              (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6";
            }
          }}
        >
          {saving ? "Saving..." : "✓ Confirm & Save"}
        </button>
      </div>
      </div>
      </>
    );
}
