// client/odyssey/components/GeofenceSettingsModal.tsx

import React, { useState, useEffect } from "react";

interface GeofenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeofenceSettingsModal: React.FC<GeofenceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [radius, setRadius] = useState(100);
  const [autoCheckin, setAutoCheckin] = useState(true);
  const [autoCheckout, setAutoCheckout] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/visits/configure-geofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          radius,
          autoCheckin,
          autoCheckout,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");
      alert("Geofence settings updated!");
      onClose();
    } catch (error) {
      alert("Error: " + error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Geofence Settings</h2>

        {/* Radius Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Detection Radius: {radius}m
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Larger radius = faster detection, less accurate
          </p>
        </div>

        {/* Toggle Options */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={autoCheckin}
              onChange={(e) => setAutoCheckin(e.target.checked)}
            />
            <span className="text-sm">Auto check-in when entering</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCheckout}
              onChange={(e) => setAutoCheckout(e.target.checked)}
            />
            <span className="text-sm">Auto check-out when leaving</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};