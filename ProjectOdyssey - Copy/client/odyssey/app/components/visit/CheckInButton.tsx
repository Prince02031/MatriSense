'use client';

import { useState } from 'react';
import { Location } from '../../hooks/useVisitTracking';

interface CheckInButtonProps {
  placeId: string;
  placeName: string;
  category?: string;
  expectedDuration?: number;
  onCheckIn: (data: {
    placeId: string;
    placeName: string;
    category?: string;
    location: Location;
    expectedDuration?: number;
  }) => Promise<any>;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * CheckInButton Component
 * Captures GPS location and initiates visit check-in
 */
export const CheckInButton: React.FC<CheckInButtonProps> = ({
  placeId,
  placeName,
  category = 'landmark',
  expectedDuration = 3600,
  onCheckIn,
  disabled = false,
  loading = false,
}) => {
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleCheckIn = async () => {
    try {
      setGettingLocation(true);
      setLocationError(null);

      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported by browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          await onCheckIn({
            placeId,
            placeName,
            category,
            location,
            expectedDuration,
          });
        },
        (error) => {
          setLocationError(`Location error: ${error.message}`);
        }
      );
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckIn}
        disabled={disabled || loading || gettingLocation}
        className={`
          px-4 py-2 rounded-lg font-semibold transition-all
          ${
            disabled || loading || gettingLocation
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
          }
        `}
      >
        {gettingLocation ? '📍 Getting location...' : loading ? '⏳ Checking in...' : '✓ Check In'}
      </button>
      {locationError && <p className="text-red-500 text-sm">{locationError}</p>}
    </div>
  );
};
