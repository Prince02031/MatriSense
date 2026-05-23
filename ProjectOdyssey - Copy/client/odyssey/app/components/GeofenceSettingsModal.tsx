'use client';

import { useState, useEffect } from 'react';

interface GeofenceSettings {
  geofence_radius: number;
  auto_checkin: boolean;
  auto_checkout: boolean;
}

interface GeofenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: GeofenceSettings) => void;
  initialSettings?: GeofenceSettings;
  isLoading?: boolean;
}

const GeofenceSettingsModal: React.FC<GeofenceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings = {
    geofence_radius: 100,
    auto_checkin: true,
    auto_checkout: true,
  },
  isLoading = false,
}) => {
  const [radius, setRadius] = useState(initialSettings.geofence_radius);
  const [autoCheckIn, setAutoCheckIn] = useState(initialSettings.auto_checkin);
  const [autoCheckOut, setAutoCheckOut] = useState(initialSettings.auto_checkout);
  const [saved, setSaved] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setRadius(initialSettings.geofence_radius);
      setAutoCheckIn(initialSettings.auto_checkin);
      setAutoCheckOut(initialSettings.auto_checkout);
      setSaved(false);
    }
  }, [isOpen, initialSettings]);

  const handleSave = async () => {
    if (onSave) {
      await onSave({
        geofence_radius: radius,
        auto_checkin: autoCheckIn,
        auto_checkout: autoCheckOut,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Geofence Settings</h2>

        {/* Radius Slider */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Detection Radius: <span className="text-blue-600 text-lg">{radius}m</span>
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              disabled={isLoading}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>50m (Precise)</span>
              <span>500m (Generous)</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            💡 You'll automatically check in when within {radius}m of a place
          </p>
        </div>

        {/* Auto Check-In Toggle */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCheckIn}
              onChange={(e) => setAutoCheckIn(e.target.checked)}
              disabled={isLoading}
              className="w-5 h-5 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-700 text-sm">Auto Check-In</span>
              <p className="text-xs text-gray-500">
                Automatically check in when entering geofence
              </p>
            </div>
          </label>
        </div>

        {/* Auto Check-Out Toggle */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCheckOut}
              onChange={(e) => setAutoCheckOut(e.target.checked)}
              disabled={isLoading}
              className="w-5 h-5 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-700 text-sm">Auto Check-Out</span>
              <p className="text-xs text-gray-500">
                Automatically check out when leaving geofence
              </p>
            </div>
          </label>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>💡 Tip:</strong> Both auto options are enabled by default for the best
            experience. Disable if you want more control.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading || saved}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeofenceSettingsModal;
