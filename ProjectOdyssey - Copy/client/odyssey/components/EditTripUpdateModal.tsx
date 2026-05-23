"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, MapPin, Loader2, Plus, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { updatePost } from '@/hooks/usePosts';
import type { Post } from '@/hooks/usePosts';

interface TripLocation {
  name: string;
  placeId: string;
  visitedAt: string;
  photos: string[];
  isCurrentLocation: boolean;
}

interface PlannerLocation {
  name: string;
  placeId: string;
  isVisited: boolean;
  isCurrentLocation: boolean;
  photos: string[];
}

interface EditTripUpdateModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditTripUpdateModal({ post, isOpen, onClose, onUpdated }: EditTripUpdateModalProps) {
  const [tripName, setTripName] = useState(post.tripName || '');
  const [completionPercentage, setCompletionPercentage] = useState(
    post.tripProgress?.completionPercentage || 0
  );
  const [tripLocations, setTripLocations] = useState<TripLocation[]>(
    post.tripProgress?.locations?.map(l => ({
      name: l.name,
      placeId: l.placeId || '',
      visitedAt: l.visitedAt
        ? new Date(l.visitedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      photos: l.photos || [],
      isCurrentLocation: l.isCurrentLocation || false,
    })) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLocationPhoto, setUploadingLocationPhoto] = useState<number | null>(null);
  const [locationPhotoUrls, setLocationPhotoUrls] = useState<{[key: number]: string}>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Planner integration states
  const [isPlannerTrip, setIsPlannerTrip] = useState(false);
  const [isLoadingPlannerTrip, setIsLoadingPlannerTrip] = useState(false);
  const [plannerLocations, setPlannerLocations] = useState<PlannerLocation[]>([]);
  const [showManualMode, setShowManualMode] = useState(false);

  // Fetch planner trip if tripId exists
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchPlannerTrip = async () => {
      if (!post.tripId) {
        setIsPlannerTrip(false);
        return;
      }

      setIsPlannerTrip(true);
      setIsLoadingPlannerTrip(true);

      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoadingPlannerTrip(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:4000/api/trips/${post.tripId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          setIsPlannerTrip(false);
          setIsLoadingPlannerTrip(false);
          return;
        }

        const data = await res.json();
        const trip = data.success ? data.data : data;

        if (!trip) {
          setIsPlannerTrip(false);
          setIsLoadingPlannerTrip(false);
          return;
        }

        // Extract all locations from the trip
        const seen = new Set<string>();
        const locations: PlannerLocation[] = [];

        // Get already visited location names (case-insensitive) and their photos
        const visitedLocationsMap = new Map(
          (post.tripProgress?.locations || []).map(l => [l.name.toLowerCase(), l.photos || []])
        );

        // Find current location from existing trip progress
        const currentLocationFromProgress = post.tripProgress?.locations?.find(l => l.isCurrentLocation);
        const currentLocationNameLower = currentLocationFromProgress?.name.toLowerCase();

        // Prefer selected_places
        if (Array.isArray(trip.selected_places) && trip.selected_places.length > 0) {
          for (const p of trip.selected_places) {
            const name = (p.name || p.title || '').trim();
            if (!name || seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            const nameLower = name.toLowerCase();
            const isVisited = visitedLocationsMap.has(nameLower);
            const isCurrentLoc = currentLocationNameLower ? nameLower === currentLocationNameLower : false;
            locations.push({
              name,
              placeId: p.id || p.placeId || '',
              isVisited,
              isCurrentLocation: isCurrentLoc,
              photos: visitedLocationsMap.get(nameLower) || [],
            });
          }
        } else if (trip.selected_itinerary?.schedule) {
          // Extract from schedule
          const schedule = trip.selected_itinerary.schedule;
          for (const dayKey of Object.keys(schedule)) {
            const dayData = schedule[dayKey];
            const items = Array.isArray(dayData) ? dayData : (dayData?.items || []);
            for (const item of items) {
              const name = item.name?.trim();
              if (!name || item.isBreak || seen.has(name.toLowerCase())) continue;
              seen.add(name.toLowerCase());
              const nameLower = name.toLowerCase();
              const isVisited = visitedLocationsMap.has(nameLower);
              const isCurrentLoc = currentLocationNameLower ? nameLower === currentLocationNameLower : false;
              locations.push({
                name,
                placeId: item.placeId || item.id || '',
                isVisited,
                isCurrentLocation: isCurrentLoc,
                photos: visitedLocationsMap.get(nameLower) || [],
              });
            }
          }
        }

        setPlannerLocations(locations);
      } catch (e) {
        console.error('Failed to fetch planner trip', e);
        setIsPlannerTrip(false);
      } finally {
        setIsLoadingPlannerTrip(false);
      }
    };

    fetchPlannerTrip();
  }, [isOpen, post.tripId]);

  if (!isOpen) return null;

  const addLocation = () => {
    setTripLocations([...tripLocations, {
      name: '',
      placeId: '',
      visitedAt: new Date().toISOString().split('T')[0],
      photos: [],
      isCurrentLocation: false,
    }]);
  };

  const updateLocation = (index: number, field: string, value: any) => {
    const updated = [...tripLocations];
    (updated[index] as any)[field] = value;
    setTripLocations(updated);
  };

  const removeLocation = (index: number) => {
    setTripLocations(tripLocations.filter((_, i) => i !== index));
  };

  const handleLocationFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, locationIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingLocationPhoto(locationIndex);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        const updated = [...tripLocations];
        updated[locationIndex].photos.push(data.imageUrl);
        setTripLocations(updated);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingLocationPhoto(null);
      e.target.value = '';
    }
  };

  const handleAddLocationPhotoUrl = (locationIndex: number) => {
    const url = locationPhotoUrls[locationIndex]?.trim();
    if (!url) return;
    
    try {
      new URL(url);
      const updated = [...tripLocations];
      updated[locationIndex].photos.push(url);
      setTripLocations(updated);
      // Clear only this location's URL
      setLocationPhotoUrls({...locationPhotoUrls, [locationIndex]: ''});
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleRemoveLocationPhoto = (locationIndex: number, photoIndex: number) => {
    const updated = [...tripLocations];
    updated[locationIndex].photos = updated[locationIndex].photos.filter((_, i) => i !== photoIndex);
    setTripLocations(updated);
  };

  const openLightbox = (imageUrl: string, allImages: string[]) => {
    const index = allImages.indexOf(imageUrl);
    setLightboxImages(allImages);
    setLightboxIndex(index);
    setLightboxImage(imageUrl);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (newIndex >= 0 && newIndex < lightboxImages.length) {
      setLightboxIndex(newIndex);
      setLightboxImage(lightboxImages[newIndex]);
    }
  };

  // Photo upload handlers for planner locations
  const handlePlannerLocationFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, locationIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingLocationPhoto(locationIndex);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        const updated = [...plannerLocations];
        updated[locationIndex].photos.push(data.imageUrl);
        setPlannerLocations(updated);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingLocationPhoto(null);
      e.target.value = '';
    }
  };

  const handleAddPlannerPhotoUrl = (locationIndex: number) => {
    const url = locationPhotoUrls[locationIndex]?.trim();
    if (!url) return;
    
    try {
      new URL(url);
      const updated = [...plannerLocations];
      updated[locationIndex].photos.push(url);
      setPlannerLocations(updated);
      // Clear only this location's URL
      setLocationPhotoUrls({...locationPhotoUrls, [locationIndex]: ''});
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleRemovePlannerPhoto = (locationIndex: number, photoIndex: number) => {
    const updated = [...plannerLocations];
    updated[locationIndex].photos = updated[locationIndex].photos.filter((_, i) => i !== photoIndex);
    setPlannerLocations(updated);
  };

  const togglePlannerLocation = (index: number) => {
    const updated = [...plannerLocations];
    updated[index].isVisited = !updated[index].isVisited;
    setPlannerLocations(updated);
  };

  const togglePlannerLocationAsCurrent = (index: number) => {
    const updated = plannerLocations.map((loc, i) => ({
      ...loc,
      isCurrentLocation: i === index ? !loc.isCurrentLocation : false,
    }));
    setPlannerLocations(updated);
  };

  const handleSubmit = async () => {
    if (!tripName.trim()) {
      alert('Please enter a trip name!');
      return;
    }

    let finalLocations: TripLocation[] = [];
    let currentLocationName = '';

    if (isPlannerTrip && !showManualMode) {
      // Planner mode: merge existing + newly checked locations
      const visitedLocs = plannerLocations.filter(l => l.isVisited);
      
      if (visitedLocs.length === 0) {
        alert('Please mark at least one location as visited!');
        return;
      }

      // Find which location is marked as current in planner
      const currentLoc = plannerLocations.find(l => l.isCurrentLocation);
      const currentLocationNameLower = currentLoc?.name.toLowerCase();

      // Update all existing locations to unmark previous current location
      const existingLocations = tripLocations.map(loc => ({
        ...loc,
        isCurrentLocation: currentLocationNameLower ? loc.name.toLowerCase() === currentLocationNameLower : loc.isCurrentLocation
      }));
      
      // Add newly visited locations that aren't already in tripLocations
      const existingNames = new Set(tripLocations.map(l => l.name.toLowerCase()));
      
      for (const loc of visitedLocs) {
        if (!existingNames.has(loc.name.toLowerCase())) {
          existingLocations.push({
            name: loc.name,
            placeId: loc.placeId,
            visitedAt: new Date().toISOString().split('T')[0],
            photos: loc.photos || [],
            isCurrentLocation: loc.isCurrentLocation,
          });
        }
      }

      finalLocations = existingLocations;
      currentLocationName = currentLoc?.name || existingLocations[existingLocations.length - 1]?.name || '';

      // Calculate completion percentage
      const totalLocations = plannerLocations.length;
      const visitedCount = visitedLocs.length;
      const completion = Math.round((visitedCount / totalLocations) * 100);
      setCompletionPercentage(completion);
    } else {
      // Manual mode
      if (tripLocations.length === 0) {
        alert('Please add at least one location!');
        return;
      }

      finalLocations = tripLocations;
      const currentLoc = tripLocations.find(l => l.isCurrentLocation);
      currentLocationName = currentLoc?.name || tripLocations[tripLocations.length - 1]?.name || '';
    }

    setIsSubmitting(true);

    const result = await updatePost(post._id, {
      tripName: tripName.trim(),
      tripProgress: {
        locations: finalLocations,
        currentLocationName,
        totalLocations: finalLocations.length,
        completionPercentage: isPlannerTrip && !showManualMode 
          ? Math.round((finalLocations.length / plannerLocations.length) * 100) 
          : completionPercentage,
      },
    } as any);

    setIsSubmitting(false);

    if (result.success) {
      onUpdated();
      onClose();
    } else {
      alert(result.error || 'Failed to update trip');
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-20 animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-scaleIn flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
              🗺️
            </div>
            <div>
              <h2 className="text-xl font-bold">Update Trip Progress</h2>
              <p className="text-teal-50 text-sm">Add new locations or update your journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Trip Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Amazing Europe Adventure"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
              disabled={isSubmitting}
            />
          </div>

          {/* Loading state */}
          {isLoadingPlannerTrip && (
            <div className="flex items-center gap-2 text-gray-500 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading trip from planner...</span>
            </div>
          )}

          {/* Planner Mode: Show incomplete locations with checkboxes */}
          {isPlannerTrip && !isLoadingPlannerTrip && !showManualMode && (
            <>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-[#4A9B7F]" />
                  <h3 className="font-semibold text-gray-900">Trip from Planner</h3>
                </div>
                <p className="text-sm text-gray-600">
                  This trip was created from your planner. Mark locations as completed to update your progress.
                </p>
              </div>

              {/* Already visited count */}
              {tripLocations.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800">
                    ✅ <span className="font-semibold">{tripLocations.length}</span> location{tripLocations.length !== 1 ? 's' : ''} already marked as visited
                  </p>
                </div>
              )}

              {/* Completion bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Trip Completion</span>
                  <span className="text-sm font-bold text-[#4A9B7F]">
                    {Math.round((plannerLocations.filter(l => l.isVisited).length / plannerLocations.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4A9B7F] to-teal-500 transition-all duration-300"
                    style={{
                      width: `${(plannerLocations.filter(l => l.isVisited).length / plannerLocations.length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Locations list with checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Mark Locations as Completed
                  </label>
                  <button
                    onClick={() => setShowManualMode(true)}
                    className="text-sm text-[#4A9B7F] hover:underline"
                  >
                    Switch to Manual Mode
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plannerLocations.map((location, index) => (
                    <div key={index} className="space-y-2">
                      <div
                        className={`border rounded-xl p-4 transition-all ${
                          location.isVisited
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200 hover:border-[#4A9B7F]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={location.isVisited}
                            onChange={() => togglePlannerLocation(index)}
                            className="w-5 h-5 accent-[#4A9B7F] cursor-pointer"
                            disabled={isSubmitting}
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${location.isVisited ? 'text-green-800' : 'text-gray-900'}`}>
                              {location.name}
                            </p>
                            {location.isVisited && (
                              <label className="flex items-center gap-2 text-sm mt-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={location.isCurrentLocation}
                                  onChange={() => togglePlannerLocationAsCurrent(index)}
                                  className="w-4 h-4 accent-[#4A9B7F]"
                                  disabled={isSubmitting}
                                />
                                <span className="text-[#4A9B7F] font-medium">Set as current location</span>
                              </label>
                            )}
                          </div>
                          {location.isVisited && (
                            <Check className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>

                      {/* Photo Upload Section - Only show for visited locations */}
                      {location.isVisited && (
                        <div className="ml-7 pl-3 border-l-2 border-green-200 space-y-2">
                          <label className="block text-xs font-medium text-gray-600">
                            📸 Add Photos (Optional)
                          </label>
                          
                          {/* Photo URL Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={locationPhotoUrls[index] || ''}
                              onChange={(e) => setLocationPhotoUrls({...locationPhotoUrls, [index]: e.target.value})}
                              placeholder="Paste photo URL"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                              disabled={isSubmitting || uploadingLocationPhoto === index}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddPlannerPhotoUrl(index)}
                            />
                            <button
                              onClick={() => handleAddPlannerPhotoUrl(index)}
                              disabled={!locationPhotoUrls[index]?.trim() || isSubmitting || uploadingLocationPhoto === index}
                              className="px-3 py-1.5 bg-[#4A9B7F] text-white rounded text-sm hover:bg-[#3d8268] disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>

                          {/* File Upload Button */}
                          <label 
                            className={`flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-gray-300 rounded hover:border-[#4A9B7F] hover:bg-teal-50 transition-all cursor-pointer ${
                              (isSubmitting || uploadingLocationPhoto === index) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {uploadingLocationPhoto === index ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-[#4A9B7F]" />
                                <span className="text-xs text-gray-600">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-gray-600">Upload from device</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePlannerLocationFileUpload(e, index)}
                              disabled={isSubmitting || uploadingLocationPhoto === index}
                              className="hidden"
                            />
                          </label>

                          {/* Photo Preview Grid */}
                          {location.photos.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {location.photos.map((photo, photoIndex) => {
                                const allPhotos = plannerLocations.flatMap(loc => loc.photos);
                                return (
                                  <div key={photoIndex} className="relative w-16 h-16 group">
                                    <img 
                                      src={photo} 
                                      alt="" 
                                      className="w-full h-full object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                                      onClick={() => openLightbox(photo, allPhotos)}
                                    />
                                    <button
                                      onClick={() => handleRemovePlannerPhoto(index, photoIndex)}
                                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Manual Mode or non-planner trips */}
          {(!isPlannerTrip || showManualMode) && !isLoadingPlannerTrip && (
            <>
              {showManualMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-800">
                      📝 Manual editing mode - You can add/edit locations manually
                    </p>
                    <button
                      onClick={() => setShowManualMode(false)}
                      className="text-sm text-[#4A9B7F] hover:underline"
                    >
                      Back to Planner Mode
                    </button>
                  </div>
                </div>
              )}

              {/* Completion Percentage */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Trip Completion: {completionPercentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(parseInt(e.target.value))}
                  className="w-full range-slider"
                  style={{
                    background: `linear-gradient(to right, #4A9B7F 0%, #4A9B7F ${completionPercentage}%, #e5e7eb ${completionPercentage}%, #e5e7eb 100%)`
                  }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Locations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Visited Locations <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={addLocation}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] text-sm font-medium disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Location
                  </button>
                </div>

                <div className="space-y-3">
                  {tripLocations.map((location, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Location Name</label>
                          <input
                            type="text"
                            value={location.name}
                            onChange={(e) => updateLocation(index, 'name', e.target.value)}
                            placeholder="e.g., Eiffel Tower"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Visit Date</label>
                          <input
                            type="date"
                            value={location.visitedAt}
                            onChange={(e) => updateLocation(index, 'visitedAt', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={location.isCurrentLocation}
                            onChange={(e) => {
                              const updated = tripLocations.map((loc, i) => ({
                                ...loc,
                                isCurrentLocation: i === index ? e.target.checked : false,
                              }));
                              setTripLocations(updated);
                            }}
                            className="w-4 h-4 accent-[#4A9B7F]"
                            disabled={isSubmitting}
                          />
                          <span className="text-[#4A9B7F] font-medium">Current Location</span>
                        </label>
                      </div>

                      {/* Photos */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          📸 Photos ({location.photos.length})
                        </label>
                        
                        {/* Photo URL Input */}
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={locationPhotoUrls[index] || ''}
                            onChange={(e) => setLocationPhotoUrls({...locationPhotoUrls, [index]: e.target.value})}
                            placeholder="Paste photo URL"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                            disabled={isSubmitting || uploadingLocationPhoto === index}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddLocationPhotoUrl(index)}
                          />
                          <button
                            onClick={() => handleAddLocationPhotoUrl(index)}
                            disabled={!locationPhotoUrls[index]?.trim() || isSubmitting || uploadingLocationPhoto === index}
                            className="px-3 py-1.5 bg-[#4A9B7F] text-white rounded text-sm hover:bg-[#3d8268] disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>

                        {/* File Upload Button */}
                        <label 
                          className={`flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-gray-300 rounded hover:border-[#4A9B7F] hover:bg-teal-50 transition-all cursor-pointer mb-2 ${
                            (isSubmitting || uploadingLocationPhoto === index) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {uploadingLocationPhoto === index ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#4A9B7F]" />
                              <span className="text-xs text-gray-600">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-gray-600">Upload from device</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLocationFileUpload(e, index)}
                            disabled={isSubmitting || uploadingLocationPhoto === index}
                            className="hidden"
                          />
                        </label>

                        {/* Photo Preview Grid */}
                        {location.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {location.photos.map((photo, photoIndex) => {
                              const allPhotos = tripLocations.flatMap(loc => loc.photos);
                              return (
                                <div key={photoIndex} className="relative w-16 h-16 group">
                                  <img 
                                    src={photo} 
                                    alt="" 
                                    className="w-full h-full object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                                    onClick={() => openLightbox(photo, allPhotos)}
                                  />
                                  <button
                                    onClick={() => handleRemoveLocationPhoto(index, photoIndex)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeLocation(index)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 text-red-500 text-sm hover:text-red-700 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Location
                      </button>
                    </div>
                  ))}

                  {tripLocations.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                      No locations added yet. Click "+ Add Location" to get started!
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-gray-500">
            {isPlannerTrip && !showManualMode
              ? 'Mark locations to continue your journey'
              : 'Update your journey with the latest progress'}
          </p>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !tripName.trim() ||
              (isPlannerTrip && !showManualMode
                ? plannerLocations.filter(l => l.isVisited).length === 0
                : tripLocations.length === 0)
            }
            className="flex items-center gap-2 px-6 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Update 🗺️</span>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* Image Lightbox */}
    {lightboxImage && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        />
        
        {/* Close Button */}
        <button
          onClick={() => setLightboxImage(null)}
          className="absolute top-4 right-4 z-[10000] p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Navigation Buttons */}
        {lightboxImages.length > 1 && (
          <>
            {lightboxIndex > 0 && (
              <button
                onClick={() => navigateLightbox('prev')}
                className="absolute left-4 z-[10000] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}
            {lightboxIndex < lightboxImages.length - 1 && (
              <button
                onClick={() => navigateLightbox('next')}
                className="absolute right-4 z-[10000] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            )}
          </>
        )}

        {/* Image Counter */}
        {lightboxImages.length > 1 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[10000] px-4 py-2 bg-black/50 rounded-full text-white text-sm font-medium">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        )}

        {/* Image */}
        <div className="relative z-[9999] max-w-[95vw] max-h-[95vh] flex items-center justify-center">
          <img
            src={lightboxImage!}
            alt="Full size"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    )}
    </>
  );
}
