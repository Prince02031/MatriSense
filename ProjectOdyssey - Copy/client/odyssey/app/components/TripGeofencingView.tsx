'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGeofencing, GeofenceStatus } from '../hooks/useGeofencing';
import PlaceVisitCard from './PlaceVisitCard';
import GeofenceSettingsModal from './GeofenceSettingsModal';

interface Place {
  id: string;
  placeId?: string;
  name: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface TripGeofencingViewProps {
  itineraryId: string;
  places: Place[];
  onCheckIn?: (placeId: string, placeName: string) => void;
  onCheckOut?: (placeId: string, timeSpent: number, rating: number, notes: string) => void;
  onSkip?: (placeId: string) => void;
}

interface VisitLogEntry {
  placeId: string;
  placeName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  enteredAt?: string;
  timeSpent?: number;
  rating?: number;
  notes?: string;
  distance?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const TripGeofencingView: React.FC<TripGeofencingViewProps> = ({
  itineraryId,
  places,
  onCheckIn,
  onCheckOut,
  onSkip,
}) => {
  const [visitLogs, setVisitLogs] = useState<Record<string, VisitLogEntry>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    in_progress: 0,
    pending: 0,
    skipped: 0,
    totalTimeSpent: 0,
  });

  const {
    geofenceStatus,
    isLoading: geoLoading,
    error: geoError,
    locationEnabled,
    isTracking,
    startTracking,
    stopTracking,
  } = useGeofencing({
    enabled: true,
    throttleInterval: 12000, // 12 seconds
    itineraryId,
    autoCheckin: true,
  });

  /**
   * Initialize visit logs from backend
   */
  useEffect(() => {
    const fetchVisitLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/visits/logs/${itineraryId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const logs = await response.json();
          const logsMap: Record<string, VisitLogEntry> = {};

          logs.forEach((log: any) => {
            logsMap[log.place_id] = {
              placeId: log.place_id,
              placeName: log.place_name,
              status: log.status,
              enteredAt: log.entered_at,
              timeSpent: log.time_spent,
              rating: log.user_rating,
              notes: log.notes,
            };
          });

          setVisitLogs(logsMap);
        }
      } catch (err) {
        console.error('Failed to fetch visit logs:', err);
      }
    };

    if (itineraryId) {
      fetchVisitLogs();
    }
  }, [itineraryId]);

  /**
   * Fetch trip statistics
   */
  const fetchTripStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/visits/stats/${itineraryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch trip stats:', err);
    }
  }, [itineraryId]);

  /**
   * Handle auto check-in from geofence detection
   */
  useEffect(() => {
    if (geofenceStatus?.action === 'auto_checked_in' && geofenceStatus.place) {
      const placeId = geofenceStatus.place.placeId;

      setVisitLogs((prev) => ({
        ...prev,
        [placeId]: {
          placeId,
          placeName: geofenceStatus.place!.placeName,
          status: 'in_progress',
          enteredAt: new Date().toISOString(),
          timeSpent: 0,
        },
      }));

      onCheckIn?.(placeId, geofenceStatus.place.placeName);
      fetchTripStats();
    }

    if (geofenceStatus?.action === 'auto_checked_out' && geofenceStatus.place) {
      const placeId = geofenceStatus.place.placeId;

      setVisitLogs((prev) => ({
        ...prev,
        [placeId]: {
          ...prev[placeId],
          status: 'completed',
          timeSpent: geofenceStatus.visitLog?.time_spent || 0,
        },
      }));

      onCheckOut?.(placeId, geofenceStatus.visitLog?.time_spent || 0, 0, '');
      fetchTripStats();
    }
  }, [geofenceStatus, onCheckIn, onCheckOut, fetchTripStats]);

  /**
   * Manual check-in
   */
  const handleManualCheckIn = useCallback(
    async (placeId: string, placeName: string) => {
      try {
        setLoadingPlaceId(placeId);
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/visits/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            itinerary_id: itineraryId,
            place_id: placeId,
            place_name: placeName,
            expected_duration: 1800, // 30 minutes default
          }),
        });

        if (response.ok) {
          const visitLog = await response.json();
          setVisitLogs((prev) => ({
            ...prev,
            [placeId]: {
              placeId,
              placeName,
              status: 'in_progress',
              enteredAt: visitLog.entered_at,
              timeSpent: 0,
            },
          }));

          onCheckIn?.(placeId, placeName);
          fetchTripStats();
        }
      } catch (err) {
        console.error('Manual check-in failed:', err);
      } finally {
        setLoadingPlaceId(null);
      }
    },
    [itineraryId, onCheckIn, fetchTripStats]
  );

  /**
   * Manual check-out with rating
   */
  const handleManualCheckOut = useCallback(
    async (placeId: string, rating: number, notes: string) => {
      try {
        setLoadingPlaceId(placeId);
        const token = localStorage.getItem('token');
        if (!token) return;

        // Find the visit log ID
        const log = visitLogs[placeId];
        if (!log) return;

        const response = await fetch(`${API_BASE_URL}/visits/check-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            visit_log_id: placeId, // This would need adjustment based on actual API
            user_rating: rating,
            notes,
          }),
        });

        if (response.ok) {
          const updatedLog = await response.json();
          setVisitLogs((prev) => ({
            ...prev,
            [placeId]: {
              ...prev[placeId],
              status: 'completed',
              timeSpent: updatedLog.time_spent,
              rating,
              notes,
            },
          }));

          onCheckOut?.(placeId, updatedLog.time_spent, rating, notes);
          fetchTripStats();
        }
      } catch (err) {
        console.error('Manual check-out failed:', err);
      } finally {
        setLoadingPlaceId(null);
      }
    },
    [visitLogs, itineraryId, onCheckOut, fetchTripStats]
  );

  /**
   * Skip place
   */
  const handleSkipPlace = useCallback(
    async (placeId: string, placeName: string) => {
      try {
        setLoadingPlaceId(placeId);
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/visits/skip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            itinerary_id: itineraryId,
            place_id: placeId,
            place_name: placeName,
          }),
        });

        if (response.ok) {
          setVisitLogs((prev) => ({
            ...prev,
            [placeId]: {
              placeId,
              placeName,
              status: 'skipped',
            },
          }));

          onSkip?.(placeId);
          fetchTripStats();
        }
      } catch (err) {
        console.error('Skip place failed:', err);
      } finally {
        setLoadingPlaceId(null);
      }
    },
    [itineraryId, onSkip, fetchTripStats]
  );

  /**
   * Save geofence settings
   */
  const handleSaveSettings = useCallback(
    async (settings: any) => {
      try {
        setIsLoadingSettings(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/visits/configure-geofence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        });

        if (response.ok) {
          console.log('Geofence settings saved');
        }
      } catch (err) {
        console.error('Failed to save geofence settings:', err);
      } finally {
        setIsLoadingSettings(false);
      }
    },
    []
  );

  // Calculate progress
  const totalPlaces = places.length;
  const completedPlaces = Object.values(visitLogs).filter(
    (v) => v.status === 'completed'
  ).length;
  const progressPercent = totalPlaces > 0 ? Math.round((completedPlaces / totalPlaces) * 100) : 0;

  return (
    <div className="w-full space-y-4">
      {/* Header with Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Trip Tracking</h2>
            <p className="text-xs md:text-sm text-gray-600">
              {isTracking ? '🟢 Location tracking active' : '🔴 Location tracking inactive'}
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs md:text-sm font-medium transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs md:text-sm font-medium text-gray-700">
              Progress: {completedPlaces}/{totalPlaces}
            </span>
            <span className="text-xs md:text-sm font-bold text-gray-900">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Location Status */}
        {!locationEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-xs">
            <p className="text-yellow-800">
              📍 Location permission required. Please enable location access.
            </p>
            <button
              onClick={startTracking}
              className="text-yellow-700 font-semibold underline mt-1"
            >
              Enable Location
            </button>
          </div>
        )}

        {geoError && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs">
            <p className="text-red-700">⚠️ {geoError}</p>
          </div>
        )}

        {/* Trip Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Completed</p>
            <p className="text-lg md:text-xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-xs text-gray-600">In Progress</p>
            <p className="text-lg md:text-xl font-bold text-blue-600">{stats.in_progress}</p>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Pending</p>
            <p className="text-lg md:text-xl font-bold text-gray-600">{stats.pending}</p>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Skipped</p>
            <p className="text-lg md:text-xl font-bold text-red-600">{stats.skipped}</p>
          </div>
        </div>
      </div>

      {/* Places List */}
      <div className="space-y-3">
        {places.map((place) => {
          const visitLog = visitLogs[place.placeId || place.id];
          const status = visitLog?.status || 'pending';
          const isNearby = geofenceStatus?.place?.placeId === (place.placeId || place.id);
          const distance = isNearby ? geofenceStatus?.distance : undefined;

          return (
            <PlaceVisitCard
              key={place.id}
              placeId={place.placeId || place.id}
              placeName={place.name}
              status={status as 'pending' | 'in_progress' | 'completed' | 'skipped'}
              distance={distance}
              isNearby={isNearby}
              enteredAt={visitLog?.enteredAt}
              timeSpent={visitLog?.timeSpent}
              userRating={visitLog?.rating}
              notes={visitLog?.notes}
              onCheckIn={() => handleManualCheckIn(place.placeId || place.id, place.name)}
              onCheckOut={() => {
                // Would be called from the component after rating
              }}
              onSkip={() => handleSkipPlace(place.placeId || place.id, place.name)}
              onRate={(rating, notes) =>
                handleManualCheckOut(place.placeId || place.id, rating, notes)
              }
              isLoading={loadingPlaceId === (place.placeId || place.id)}
            />
          );
        })}
      </div>

      {/* Geofence Settings Modal */}
      <GeofenceSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        isLoading={isLoadingSettings}
      />
    </div>
  );
};

export default TripGeofencingView;
