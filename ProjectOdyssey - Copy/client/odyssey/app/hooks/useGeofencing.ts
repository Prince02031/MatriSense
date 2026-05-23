import { useEffect, useState, useCallback, useRef } from 'react';

export interface GeofenceStatus {
  isInGeofence: boolean;
  place?: {
    placeId: string;
    placeName: string;
    latitude: number;
    longitude: number;
  };
  distance?: number;
  radius?: number;
  action?: 'auto_checked_in' | 'auto_checked_out' | 'already_in_progress' | 'no_action';
  visitLog?: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    entered_at: string;
    exited_at?: string;
    time_spent?: number;
  };
  error?: string;
}

export interface GeofenceHookOptions {
  enabled?: boolean;
  throttleInterval?: number;
  itineraryId?: string;
  autoCheckin?: boolean;
  mockLocation?: { lat: number; lng: number }; // For testing/presentation
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const useGeofencing = (options: GeofenceHookOptions = {}) => {
  const {
    enabled = true,
    throttleInterval = 10000, // 10 seconds default (10-15 range)
    itineraryId,
    autoCheckin = true,
  } = options;

  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Refs to manage throttling and cleanup
  const lastCheckRef = useRef<number>(0);
  const watchPositionIdRef = useRef<number | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request location permission (handles browser permissions)
   */
  const requestLocationPermission = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by this browser');
      return false;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setLocationEnabled(true);
      setError(null);
      return true;
    } catch (err: any) {
      const errorMsg =
        err.code === 1
          ? 'Location permission denied. Please enable location in your browser settings.'
          : err.code === 2
            ? 'Location unavailable. Please check your GPS signal.'
            : 'Unable to get location. Please try again.';

      setError(errorMsg);
      setLocationEnabled(false);
      return false;
    }
  }, []);

  /**
   * Check geofence status with the backend
   */
  const checkGeofenceStatus = useCallback(
    async (latitude: number, longitude: number) => {
      if (!itineraryId) {
        setError('Itinerary ID is required');
        return;
      }

      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          setError('Authentication token not found. Please login first.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/visits/geofence-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_latitude: latitude,
            user_longitude: longitude,
            itinerary_id: itineraryId,
            auto_checkin: autoCheckin,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to check geofence status');
        }

        const data: GeofenceStatus = await response.json();
        setGeofenceStatus(data);
        setError(null);
      } catch (err: any) {
        // Non-critical: geofence check can fail when no itinerary data exists yet
        console.warn('Geofence check:', err.message || 'Error checking geofence');
      } finally {
        setIsLoading(false);
      }
    },
    [itineraryId, autoCheckin]
  );

  /**
   * Handle position updates with throttling
   */
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;

      // Update local state for Map UI
      setUserLocation({ lat: latitude, lng: longitude });

      const now = Date.now();

      // Throttle: only check if enough time has passed
      if (now - lastCheckRef.current < throttleInterval) {
        return;
      }

      lastCheckRef.current = now;

      // Clear any existing timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      // Check geofence status
      checkGeofenceStatus(latitude, longitude);
    },
    [throttleInterval, checkGeofenceStatus]
  );

  /**
   * Start tracking location
   */
  const startTracking = useCallback(async () => {
    if (!enabled || !itineraryId) {
      return;
    }

    if (isTracking) {
      console.warn('Already tracking location');
      return;
    }

    // Request permission first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }

    try {
      // Start watching position with options for better accuracy
      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === 1) {
            setError('Location permission denied');
          } else if (error.code === 2) {
            setError('Location unavailable');
          } else {
            setError('Failed to get location');
          }
        },
        {
          enableHighAccuracy: true, // Use GPS instead of cell towers
          timeout: 15000, // 15 second timeout
          maximumAge: 5000, // Cache location for max 5 seconds
        }
      );

      setIsTracking(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to start tracking');
      console.error(err);
    }
  }, [enabled, itineraryId, isTracking, requestLocationPermission, handlePositionUpdate]);

  /**
   * Stop tracking location
   */
  const stopTracking = useCallback(() => {
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

    setIsTracking(false);
  }, []);

  /**
   * Auto-start tracking when component mounts or itinerary changes
   */
  useEffect(() => {
    if (enabled && itineraryId) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, itineraryId, startTracking, stopTracking]);

  // --- MOCK LOCATION LOGIC (For Presentation/Testing) ---
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (options.mockLocation) {
      setUserLocation(options.mockLocation);
      // Also trigger geofence check for the mock location
      checkGeofenceStatus(options.mockLocation.lat, options.mockLocation.lng);
    }
  }, [options.mockLocation, checkGeofenceStatus]);

  // Update handlePositionUpdate to also set local state for UI
  const originalHandlePositionUpdate = handlePositionUpdate;
  const enhancedHandlePositionUpdate = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    setUserLocation({ lat: latitude, lng: longitude });
    originalHandlePositionUpdate(position);
  }, [originalHandlePositionUpdate]);

  // Override the watcher to use the enhanced handler
  // Note: We need to re-implement startTracking to use enhancedHandlePositionUpdate if we want real-time updates
  // For now, let's just make sure when we DO get an update, we set state.
  // Actually, easier way: just modify the callback inside startTracking or the `handlePositionUpdate` definition itself.

  // Let's modify the return to include userLocation
  return {
    geofenceStatus,
    isLoading,
    error,
    locationEnabled,
    isTracking,
    startTracking,
    stopTracking,
    checkGeofenceStatus,
    requestLocationPermission,
    userLocation, // Expose raw location for Map UI
  };
};
