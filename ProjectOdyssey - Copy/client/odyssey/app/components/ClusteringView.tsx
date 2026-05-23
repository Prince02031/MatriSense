"use client";

import { useState } from "react";

type Cluster = {
  clusterName: string;
  description: string;
  suggestedDays: number;
  places: {
    name: string;
    category: string;
    reasoning: string;
    estimatedVisitHours: number;
    estimatedCost: number;
  }[];
};

type ClusteringData = {
  overallReasoning: string;
  recommendedDuration: number;
  clusters: Cluster[];
};

type ClusteringViewProps = {
  data: ClusteringData;
  loading?: boolean;
  onContinue: (selectedPlaces: any[]) => void;
  onCancel?: () => void;
};

export default function ClusteringView({
  data,
  loading = false,
  onContinue,
  onCancel,
}: ClusteringViewProps) {
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());

  const togglePlace = (placeName: string) => {
    const newSelected = new Set(selectedPlaces);
    if (newSelected.has(placeName)) {
      newSelected.delete(placeName);
    } else {
      newSelected.add(placeName);
    }
    setSelectedPlaces(newSelected);
  };

  const handleContinue = () => {
    // Convert selected places back to array format
    const selected = Array.from(selectedPlaces).map((name) => {
      // Find the place in clusters to get full details
      for (const cluster of data.clusters) {
        const place = cluster.places.find((p) => p.name === name);
        if (place) {
          return {
            name: place.name,
            category: place.category,
            estimatedCost: place.estimatedCost,
            estimatedVisitHours: place.estimatedVisitHours,
          };
        }
      }
      return { name };
    });

    onContinue(selected);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
        <p>Odyssey is analyzing destinations...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "12px" }}>
      {/* Overall Reasoning */}
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "#1f2937" }}>
          ✨ Trip Overview
        </h3>
        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: "1.6" }}>
          {data.overallReasoning}
        </p>
        <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "8px" }}>
          Recommended Duration: <strong>{data.recommendedDuration} days</strong>
        </p>
      </div>

      {/* Clusters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {data.clusters.map((cluster, clusterIdx) => (
          <div
            key={clusterIdx}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            {/* Cluster Header */}
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
                📍 {cluster.clusterName}
              </h4>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                {cluster.description}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                Suggested: <strong>{cluster.suggestedDays} day(s)</strong>
              </p>
            </div>

            {/* Places in Cluster */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {cluster.places.map((place, placeIdx) => {
                const isSelected = selectedPlaces.has(place.name);
                return (
                  <div
                    key={placeIdx}
                    onClick={() => togglePlace(place.name)}
                    style={{
                      padding: "12px",
                      background: isSelected ? "#f0f9ff" : "#f3f4f6",
                      border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Controlled by parent onClick
                      style={{
                        marginTop: "3px",
                        cursor: "pointer",
                        width: "18px",
                        height: "18px",
                        accentColor: "#3b82f6",
                      }}
                    />

                    {/* Place Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: "#1f2937", fontSize: "14px" }}>
                          {place.name}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            background: "#e0e7ff",
                            color: "#4f46e5",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            textTransform: "capitalize",
                          }}
                        >
                          {place.category}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                        {place.reasoning}
                      </p>

                      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#9ca3af" }}>
                        <span>⏱️ {place.estimatedVisitHours}h</span>
                        <span>💰 ${place.estimatedCost}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: "12px 16px",
              background: "#fff",
              color: "#6b7280",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
            }}
          >
            ← Back to Chat
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={selectedPlaces.size === 0}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: selectedPlaces.size === 0 ? "#d1d5db" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: selectedPlaces.size === 0 ? "not-allowed" : "pointer",
            fontSize: "14px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            if (selectedPlaces.size > 0) {
              (e.currentTarget as HTMLButtonElement).style.background = "#2563eb";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPlaces.size > 0) {
              (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6";
            }
          }}
        >
          Generate {selectedPlaces.size > 0 ? `${selectedPlaces.size} Place${selectedPlaces.size > 1 ? "s" : ""}` : "Places"} →
        </button>
      </div>
    </div>
  );
}
