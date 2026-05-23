'use client';

import { useState } from 'react';
import { VisitLog, Location } from '../../hooks/useVisitTracking';

interface CheckOutModalProps {
  isOpen: boolean;
  currentVisit: VisitLog | null;
  onCheckOut: (data: {
    location?: Location;
    userRating?: number;
    notes?: string;
    photos?: string[];
  }) => Promise<any>;
  onSkip: (reason?: string) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

/**
 * CheckOutModal Component
 * Modal for ending visit with rating, notes, and photo uploads
 */
export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  currentVisit,
  onCheckOut,
  onSkip,
  onClose,
  loading = false,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  if (!isOpen || !currentVisit) return null;

  const handleCheckOut = async () => {
    try {
      setGettingLocation(true);
      let location: Location | undefined;

      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            () => resolve(undefined)
          );
        });
      }

      await onCheckOut({
        location,
        userRating: rating || undefined,
        notes: notes || undefined,
        photos: photos.length > 0 ? photos : undefined,
      });

      // Reset form
      setRating(null);
      setNotes('');
      setPhotos([]);
      onClose();
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSkip = async () => {
    await onSkip(skipReason);
    setShowSkipConfirm(false);
    setSkipReason('');
    onClose();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In real app, upload to cloud storage and get URL
      const fileNames = Array.from(files).map((f) => f.name);
      setPhotos([...photos, ...fileNames]);
    }
  };

  // Calculate elapsed time
  const elapsedSeconds = currentVisit?.entered_at
    ? Math.floor((Date.now() - new Date(currentVisit.entered_at).getTime()) / 1000)
    : 0;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedHours = Math.floor(elapsedMinutes / 60);

  const timeStr =
    elapsedHours > 0
      ? `${elapsedHours}h ${elapsedMinutes % 60}m`
      : `${elapsedMinutes}m`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
        {!showSkipConfirm ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Check Out</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-lg">{currentVisit.place_name}</p>
              <p className="text-sm text-gray-600 mt-1">⏱️ Time spent: {timeStr}</p>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Rate your experience</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform ${
                      rating && rating >= star ? 'scale-110' : 'opacity-50'
                    }`}
                  >
                    {rating && rating >= star ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add comments about your visit..."
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* Photos */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Photos</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full p-2 border rounded-lg"
              />
              <div className="mt-3 text-sm text-gray-600">
                {photos.length > 0 ? `${photos.length} photo(s) selected` : 'No images chosen'}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCheckOut}
                disabled={loading || gettingLocation}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 font-semibold"
              >
                {loading || gettingLocation ? '⏳' : '✓'} Check Out
              </button>
              <button
                onClick={() => setShowSkipConfirm(true)}
                disabled={loading}
                className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 font-semibold"
              >
                ⊗ Skip
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 disabled:bg-gray-300 font-semibold"
              >
                ✕
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Skip Place?</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to skip {currentVisit.place_name}?
            </p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Why are you skipping? (optional)"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
              rows={2}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-300 font-semibold"
              >
                {loading ? '⏳' : '✓'} Skip Place
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                disabled={loading}
                className="flex-1 bg-gray-300 rounded-lg hover:bg-gray-400 disabled:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
