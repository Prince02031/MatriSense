import { useState, useCallback, useEffect } from 'react';

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface VisitLog {
  id: string;
  user_id: string;
  itinerary_id: string;
  place_id: string;
  place_name: string;
  entered_at: string;
  exited_at: string | null;
  time_spent: number | null;
  expected_duration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  entry_location: Location;
  exit_location: Location | null;
  user_rating: number | null;
  notes: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  skipped: number;
  completionPercent: number;
  totalTimeSpent: number;
}

export interface TripSummary {
  totalPlaces: number;
  placesVisited: number;
  completionPercent: number;
  totalTimeSpent: number;
  averageTimePerPlace: number;
  averageRating: number | null;
  startTime: string;
  endTime: string;
  visits: VisitLog[];
}

interface UseVisitTrackingReturn {
  currentVisit: VisitLog | null;
  visitHistory: VisitLog[];
  progress: ProgressStats | null;
  tripSummary: TripSummary | null;
  loading: boolean;
  error: string | null;
  checkIn: (data: {
    placeId: string;
    placeName: string;
    category?: string;
    location: Location;
    expectedDuration?: number;
  }) => Promise<VisitLog | null>;
  checkOut: (data: {
    location?: Location;
    userRating?: number;
    notes?: string;
    photos?: string[];
  }) => Promise<VisitLog | null>;
  addFeedback: (visitId: string, data: {
    userRating?: number;
    notes?: string;
    photos?: string[];
  }) => Promise<VisitLog | null>;
  skipPlace: (reason?: string) => Promise<void>;
  fetchProgress: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchVisitHistory: () => Promise<void>;
}

/**
 * Custom Hook for Visit Tracking
 * Manages all visit tracking operations and state
 *
 * @param itineraryId  - The shared itinerary ID (group members all use the same one)
 * @param token        - JWT auth token
 * @param userId       - (optional) current user's ID — used to isolate THIS user's
 *                       active check-in from other group members' in-progress logs.
 *                       All completed visits from all members are still shown in visitHistory.
 */
export const useVisitTracking = (itineraryId: string, token: string, userId?: string): UseVisitTrackingReturn => {
  const [currentVisit, setCurrentVisit] = useState<VisitLog | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitLog[]>([]);
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Get current user location
  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (err) => reject(err)
      );
    });
  }, []);

  // Check In
  const checkIn = useCallback(
    async (data: {
      placeId: string;
      placeName: string;
      category?: string;
      location: Location;
      expectedDuration?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            itineraryId,
            placeId: data.placeId,
            placeName: data.placeName,
            category: data.category || 'landmark',
            location: data.location,
            expectedDuration: data.expectedDuration || 3600,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Check-in failed');
        }

        const result = await response.json();
        setCurrentVisit(result.data.visit);
        return result.data.visit;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Check-in failed';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [itineraryId, token, API_BASE]
  );

  // Check Out
  const checkOut = useCallback(
    async (data: {
      location?: Location;
      userRating?: number;
      notes?: string;
      photos?: string[];
    }) => {
      try {
        if (!currentVisit) {
          throw new Error('No active visit');
        }

        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/check-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            visitId: currentVisit.id,
            location: data.location,
            userRating: data.userRating,
            notes: data.notes,
            photos: data.photos,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Check-out failed');
        }

        const result = await response.json();
        setCurrentVisit(null);

        // Refresh history and progress
        await fetchVisitHistory();
        await fetchProgress();

        return result.data.visit;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Check-out failed';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentVisit, token, API_BASE]
  );

  // Add Feedback
  const addFeedback = useCallback(
    async (visitId: string, data: {
      userRating?: number;
      notes?: string;
      photos?: string[];
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/${visitId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add feedback');
        }

        const result = await response.json();

        // Update in history
        setVisitHistory((prev) =>
          prev.map((v) => (v.id === visitId ? result.data.visit : v))
        );

        return result.data.visit;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add feedback';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token, API_BASE]
  );

  // Skip Place
  const skipPlace = useCallback(
    async (reason?: string) => {
      try {
        if (!currentVisit) {
          throw new Error('No active visit');
        }

        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/visits/${currentVisit.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to skip place');
        }

        setCurrentVisit(null);
        await fetchVisitHistory();
        await fetchProgress();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to skip place';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [currentVisit, token, API_BASE]
  );

  // Fetch Progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/visits/progress/${itineraryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setProgress(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  }, [itineraryId, token, API_BASE]);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/visits/summary/${itineraryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setTripSummary(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, [itineraryId, token, API_BASE]);

  // Fetch Visit History
  const fetchVisitHistory = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/visits/logs/${itineraryId}?page=1&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setVisitHistory(result.data);

        // In group mode multiple members can be in_progress simultaneously.
        // Only treat THIS user's in_progress log as the active visit so that
        // another member's check-in doesn't hijack the local check-in/check-out UI.
        const active = result.data.find(
          (v: VisitLog) =>
            v.status === 'in_progress' && (!userId || v.user_id === userId)
        );
        setCurrentVisit(active || null);
      }
    } catch (err) {
      console.error('Failed to fetch visit history:', err);
    }
  }, [itineraryId, token, API_BASE]);

  // Initial load
  useEffect(() => {
    if (itineraryId && token) {
      fetchVisitHistory();
      fetchProgress();
    }
  }, [itineraryId, token, fetchVisitHistory, fetchProgress]);

  return {
    currentVisit,
    visitHistory,
    progress,
    tripSummary,
    loading,
    error,
    checkIn,
    checkOut,
    addFeedback,
    skipPlace,
    fetchProgress,
    fetchSummary,
    fetchVisitHistory,
  };
};
