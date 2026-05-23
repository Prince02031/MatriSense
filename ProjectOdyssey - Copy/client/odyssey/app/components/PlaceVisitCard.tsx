'use client';

import { useEffect, useState } from 'react';

interface PlaceVisitCardProps {
  placeId: string;
  placeName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  distance?: number;
  isNearby?: boolean;
  enteredAt?: string;
  timeSpent?: number;
  userRating?: number;
  notes?: string;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onSkip?: () => void;
  onRate?: (rating: number, notes: string) => void;
  isLoading?: boolean;
}

const PlaceVisitCard: React.FC<PlaceVisitCardProps> = ({
  placeId,
  placeName,
  status,
  distance,
  isNearby = false,
  enteredAt,
  timeSpent: initialTimeSpent,
  userRating,
  notes: initialNotes,
  onCheckIn,
  onCheckOut,
  onSkip,
  onRate,
  isLoading = false,
}) => {
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent || 0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(userRating || 0);
  const [ratingNotes, setRatingNotes] = useState(initialNotes || '');

  // Update timer every second when in_progress
  useEffect(() => {
    if (status !== 'in_progress' || !enteredAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000);
      setTimeSpent(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, enteredAt]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Completed
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Skipped
          </span>
        );
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'skipped':
        return 'bg-red-50 border-red-200';
      default:
        return isNearby ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200';
    }
  };

  const handleCheckOut = () => {
    if (status === 'in_progress') {
      setShowRatingModal(true);
    }
  };

  const handleSubmitRating = () => {
    if (onRate) {
      onRate(selectedRating, ratingNotes);
    }
    setShowRatingModal(false);
    setSelectedRating(0);
    setRatingNotes('');
  };

  return (
    <>
      <div
        className={`p-4 rounded-lg border-2 transition-all ${getBackgroundColor()} ${
          isLoading ? 'opacity-75 pointer-events-none' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm md:text-base">
              {placeName}
            </h3>
            <div className="mt-1">{getStatusBadge()}</div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4 text-xs md:text-sm">
          {/* Distance */}
          {distance !== undefined && (
            <div className="flex items-center gap-2 text-gray-600">
              <span>📍</span>
              <span>
                {isNearby ? (
                  <span className="font-semibold text-orange-600">
                    {formatDistance(distance)} away (Nearby!)
                  </span>
                ) : (
                  formatDistance(distance)
                )}
              </span>
            </div>
          )}

          {/* Timer */}
          {status === 'in_progress' && (
            <div className="flex items-center gap-2 text-blue-600 font-semibold">
              <span>⏱️</span>
              <span>{formatTime(timeSpent)}</span>
            </div>
          )}

          {/* Time spent (completed) */}
          {status === 'completed' && initialTimeSpent && (
            <div className="flex items-center gap-2 text-green-600">
              <span>✓</span>
              <span>Time: {formatTime(initialTimeSpent)}</span>
            </div>
          )}

          {/* Rating (completed) */}
          {status === 'completed' && userRating && (
            <div className="flex items-center gap-2">
              <span>⭐</span>
              <span className="text-gray-600">
                {userRating}/5 {initialNotes && `- "${initialNotes}"`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {status === 'pending' && (
            <>
              <button
                onClick={onCheckIn}
                disabled={isLoading}
                className="flex-1 md:flex-none px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs md:text-sm rounded font-medium transition-colors"
              >
                {isLoading ? 'Checking...' : 'Check In'}
              </button>
              <button
                onClick={onSkip}
                disabled={isLoading}
                className="flex-1 md:flex-none px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-xs md:text-sm rounded font-medium transition-colors"
              >
                Skip
              </button>
            </>
          )}

          {status === 'in_progress' && (
            <>
              <button
                onClick={handleCheckOut}
                disabled={isLoading}
                className="flex-1 md:flex-none px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs md:text-sm rounded font-medium transition-colors"
              >
                {isLoading ? 'Checking out...' : 'Check Out'}
              </button>
              <button
                onClick={onSkip}
                disabled={isLoading}
                className="flex-1 md:flex-none px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-xs md:text-sm rounded font-medium transition-colors"
              >
                Skip
              </button>
            </>
          )}

          {status === 'completed' && !userRating && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="flex-1 md:flex-none px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm rounded font-medium transition-colors"
            >
              Rate Visit
            </button>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Rate your visit at {placeName}
            </h3>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {star <= selectedRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            {/* Notes */}
            <textarea
              value={ratingNotes}
              onChange={(e) => setRatingNotes(e.target.value)}
              placeholder="Add optional notes about your visit..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm"
              rows={3}
            />

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={selectedRating === 0}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded font-medium transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlaceVisitCard;
