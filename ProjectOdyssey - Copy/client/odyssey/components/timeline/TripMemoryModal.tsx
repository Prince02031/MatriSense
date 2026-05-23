'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, Star, Smile, Heart, MapPin, Upload } from 'lucide-react';
import PhotoCollage from './PhotoCollage';

interface Trip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  isCompleted: boolean;
  image: string | null;
  memory: any;
  selectedPlaces: any[];
  itineraryData: any;
}

interface TripMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onUpdate: () => void;
}

const TripMemoryModal: React.FC<TripMemoryModalProps> = ({
  isOpen,
  onClose,
  trip,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(trip.memory?.mood || '');
  const [favoriteMoment, setFavoriteMoment] = useState(trip.memory?.favorite_moment || '');
  const [tripRating, setTripRating] = useState(trip.memory?.trip_rating || 0);
  const [wouldRevisit, setWouldRevisit] = useState(trip.memory?.would_revisit || false);
  const [photos, setPhotos] = useState<string[]>(trip.memory?.memory_photos || []);
  const [newPhoto, setNewPhoto] = useState('');
  const [activeTab, setActiveTab] = useState<'diary' | 'photos'>('diary');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeviceUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 3 - photos.length;
    if (remaining <= 0) return;
    Array.from(files).slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select image files only.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Each image must be under 5 MB.');
        return;
      }
      setUploadError('');
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPhotos(prev => prev.length < 3 ? [...prev, dataUrl] : prev);
      };
      reader.readAsDataURL(file);
    });
  };


  if (!isOpen) return null;

  const handleSaveMemory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:4000/api/trips/${trip.id}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood,
          favoriteMoment,
          tripRating,
          wouldRevisit,
        }),
      });

      if (!response.ok) throw new Error('Failed to save memory');

      // Save photos if new ones were added
      if (newPhoto && !photos.includes(newPhoto)) {
        const photoResponse = await fetch(
          `http://localhost:4000/api/trips/${trip.id}/memories/photos`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              photos: [...photos, newPhoto],
            }),
          }
        );

        if (!photoResponse.ok) throw new Error('Failed to save photos');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('Failed to save memory');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = () => {
    if (newPhoto && photos.length < 3) {
      setPhotos([...photos, newPhoto]);
      setNewPhoto('');
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const photoToRemove = photos[index];
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `http://localhost:4000/api/trips/${trip.id}/memories/photos/${encodeURIComponent(photoToRemove)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      setPhotos(photos.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  const moods = ['🥰 Amazing', '😍 Loved it', '😊 Great', '😌 Peaceful', '😢 Bittersweet'];
  const tripDuration = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{trip.name}</h2>
            <p className="text-gray-600 text-sm">
              {new Date(trip.startDate).toLocaleDateString()}
              {new Date(trip.startDate).getTime() !== new Date(trip.endDate).getTime() &&
                ` - ${new Date(trip.endDate).toLocaleDateString()}`}
              <span className="ml-3 text-gray-500">({tripDuration} days)</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('diary')}
              className={`pb-3 px-4 font-semibold transition-colors ${activeTab === 'diary'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              📔 Trip Diary
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`pb-3 px-4 font-semibold transition-colors relative ${activeTab === 'photos'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              📸 Memories {photos.length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{photos.length}/3</span>}
            </button>
          </div>

          {/* Diary Tab */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  <Star className="w-4 h-4 inline mr-2 text-amber-500" />
                  Trip Rating
                </label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setTripRating(star as any)}
                      className={`text-4xl transition-transform hover:scale-110 ${star <= tripRating ? 'opacity-100' : 'opacity-30'
                        }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  <Smile className="w-4 h-4 inline mr-2 text-purple-500" />
                  What was your mood?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {moods.map((moodOption) => (
                    <button
                      key={moodOption}
                      onClick={() => setMood(moodOption)}
                      className={`p-3 rounded-xl transition-all font-medium ${mood === moodOption
                        ? 'bg-purple-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {moodOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorite Moment */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  <Heart className="w-4 h-4 inline mr-2 text-rose-500" />
                  Your favorite moment
                </label>
                <textarea
                  value={favoriteMoment}
                  onChange={(e) => setFavoriteMoment(e.target.value)}
                  placeholder="Share your best memory from this trip..."
                  className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Would Revisit */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wouldRevisit}
                    onChange={(e) => setWouldRevisit(e.target.checked)}
                    className="w-5 h-5 rounded-lg cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    Would you revisit this destination?
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Photo Collage */}
              {photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Your Travel Stamps</h4>
                  <PhotoCollage
                    photos={photos}
                    onRemovePhoto={handleRemovePhoto}
                  />
                </div>
              )}

              {/* Add Photo – device upload + URL */}
              {photos.length < 3 && (
                <div>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleDeviceUpload(e.target.files)}
                  />

                  {/* Drop / click zone */}
                  <div
                    className="border-2 border-dashed border-amber-300 rounded-2xl p-6 bg-amber-50/40 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDeviceUpload(e.dataTransfer.files); }}
                  >
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Upload from device</p>
                      <p className="text-xs text-gray-400">Click or drag &amp; drop · JPG, PNG, WEBP · max 5 MB each</p>
                      <p className="text-xs text-amber-600 font-medium">{3 - photos.length} slot{3 - photos.length !== 1 ? 's' : ''} remaining</p>
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-xs text-red-500 mt-2">{uploadError}</p>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">or paste a URL</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* URL input */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newPhoto}
                      onChange={(e) => setNewPhoto(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={handleAddPhoto}
                      disabled={!newPhoto || photos.length >= 3}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-1 ${newPhoto && photos.length < 3 ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      <Camera className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              )}

              {photos.length === 3 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-green-700">
                    ✨ All 3 memory slots filled! You can edit or remove photos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-gray-50 px-8 py-6 border-t border-gray-200 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg bg-gray-200 text-gray-900 font-semibold hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveMemory}
            disabled={loading}
            className={`px-6 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {loading ? 'Saving...' : '💾 Save Memories'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default TripMemoryModal;
