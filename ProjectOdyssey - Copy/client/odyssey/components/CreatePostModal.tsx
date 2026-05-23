"use client";

import React, { useState } from 'react';
import { X, PenSquare, Lightbulb, Target, Users, Save, Loader2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import PostEditor from './PostEditor';
import { createPost } from '@/hooks/usePosts';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  /** Called when the user wants to open the Write-a-Review form */
  onOpenReview?: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated, onOpenReview }: CreatePostModalProps) {
  const [postType, setPostType] = useState<'select' | 'blog' | 'trip-update' | 'trip-source' | 'existing-trip'>('select');
  const [content, setContent] = useState<any>(null);
  const [tripName, setTripName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Image upload states
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  
  // Trip update specific states
  const [tripLocations, setTripLocations] = useState<Array<{
    name: string;
    placeId: string;
    visitedAt: string;
    photos: string[];
    isCurrentLocation: boolean;
  }>>([]);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [uploadingLocationPhoto, setUploadingLocationPhoto] = useState<number | null>(null);
  const [locationPhotoUrl, setLocationPhotoUrl] = useState<string>('');

  // Planner trip integration states
  const [plannerTrips, setPlannerTrips] = useState<any[]>([]);
  const [plannerTripsLoading, setPlannerTripsLoading] = useState(false);
  const [selectedPlannerTripId, setSelectedPlannerTripId] = useState('');
  const [plannerLocations, setPlannerLocations] = useState<Array<{
    name: string;
    placeId: string;
    isVisited: boolean;
    isCurrentLocation: boolean;
    photos: string[];
  }>>([]);
  const [plannerLocationsLoading, setPlannerLocationsLoading] = useState(false);
  const [uploadingPlannerPhoto, setUploadingPlannerPhoto] = useState<number | null>(null);
  const [plannerPhotoUrl, setPlannerPhotoUrl] = useState<string>('');

  // Function to check if there are unsaved changes
  const checkUnsavedChanges = () => {
    if (!content && !tripName.trim()) {
      return false;
    }
    
    // Check if content has actual text
    if (content && content.content && Array.isArray(content.content)) {
      for (const block of content.content) {
        if (block.content && Array.isArray(block.content)) {
          for (const node of block.content) {
            if (node.type === 'text' && node.text?.trim()) {
              return true;
            }
          }
        }
      }
    }
    
    // Check if trip name has content
    if (tripName.trim()) {
      return true;
    }
    
    return false;
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (isSubmitting) return;
    
    const hasChanges = checkUnsavedChanges();
    
    if (hasChanges) {
      const confirmExit = window.confirm(
        'Your changes are not saved. Do you want to exit the post creation?'
      );
      
      if (confirmExit) {
        onClose();
      }
      // If user clicks cancel, do nothing (stay in modal)
    } else {
      onClose();
    }
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting]);

  // Track changes to content and trip name
  React.useEffect(() => {
    setHasUnsavedChanges(checkUnsavedChanges());
  }, [content, tripName]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setPostType('select');
      setContent(null);
      setTripName('');
      setImages([]);
      setCurrentImageUrl('');
      setTripLocations([]);
      setCurrentLocationName('');
      setCompletionPercentage(0);
      setLocationPhotoUrl('');
      setShowInstructions(true);
      setHasUnsavedChanges(false);
      setPlannerTrips([]);
      setSelectedPlannerTripId('');
      setPlannerLocations([]);
      setPlannerLocationsLoading(false);
      setPlannerPhotoUrl('');
      setUploadingPlannerPhoto(null);
    }
  }, [isOpen]);

  const fetchPlannerTrips = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setPlannerTripsLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const allTrips = Array.isArray(data.success ? data.data : data)
          ? (data.success ? data.data : data)
          : [];
        // Exclude "My Collection" pseudo-trips and trips with no locations
        const realTrips = allTrips.filter((t: any) => {
          if (t.status === 'collection') return false;
          const hasPlaces = Array.isArray(t.selected_places) && t.selected_places.length > 0;
          const hasSchedule = t.selected_itinerary?.schedule &&
            Object.values(t.selected_itinerary.schedule).some((d: any) => {
              const items = Array.isArray(d) ? d : (d?.items || []);
              return items.some((i: any) => i.name && !i.isBreak);
            });
          return hasPlaces || hasSchedule;
        });
        setPlannerTrips(realTrips);
      }
    } catch (e) {
      console.error('Failed to fetch planner trips', e);
    } finally {
      setPlannerTripsLoading(false);
    }
  };

  const handleSelectPlannerTrip = async (tripId: string) => {
    setSelectedPlannerTripId(tripId);
    setPlannerLocations([]);
    if (!tripId) return;

    setPlannerLocationsLoading(true);
    // Fetch the single trip fresh from the API to avoid stale state issues
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const trip = data.success ? data.data : data;
      if (!trip) return;

      const seen = new Set<string>();
      const locations: any[] = [];

      // Prefer selected_places (explicit trip-specific list)
      if (Array.isArray(trip.selected_places) && trip.selected_places.length > 0) {
        for (const p of trip.selected_places) {
          const name = (p.name || p.title || '').trim();
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          locations.push({
            name,
            placeId: p.id || p.placeId || '',
            isVisited: false,
            isCurrentLocation: false,
            photos: [],
          });
        }
      }

      // Fall back to schedule days
      if (locations.length === 0) {
        const schedule = trip.selected_itinerary?.schedule;
        if (schedule) {
          const days: any[] = Array.isArray(schedule)
            ? schedule
            : Object.values(schedule);
          for (const day of days) {
            const items: any[] = Array.isArray(day) ? day : (day?.items || []);
            for (const item of items) {
              const name = (item.name || '').trim();
              if (!name || item.isBreak || seen.has(name.toLowerCase())) continue;
              seen.add(name.toLowerCase());
              locations.push({
                name,
                placeId: item.placeId || item.id || '',
                isVisited: false,
                isCurrentLocation: false,
                photos: [],
              });
            }
          }
        }
      }

      setPlannerLocations(locations);
    } catch (e) {
      console.error('Failed to fetch trip details', e);
    } finally {
      setPlannerLocationsLoading(false);
    }
  };

  const handleSubmitExistingTrip = async () => {
    const visitedLocations = plannerLocations.filter(l => l.isVisited);
    if (visitedLocations.length === 0) {
      alert('Please mark at least one location as visited!');
      return;
    }
    const selectedTrip = plannerTrips.find((t: any) => String(t.id) === String(selectedPlannerTripId));
    if (!selectedTrip) return;

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    if (!token) { alert('Please login first'); setIsSubmitting(false); return; }

    const completion = Math.round((visitedLocations.length / plannerLocations.length) * 100);
    const currentLoc = plannerLocations.find(l => l.isCurrentLocation) || visitedLocations[visitedLocations.length - 1];

    try {
      const response = await fetch('http://localhost:4000/api/posts/trip-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          tripId: selectedPlannerTripId,
          tripName: selectedTrip.trip_name || selectedTrip.tripName || 'My Trip',
          tripProgress: {
            locations: visitedLocations.map(l => ({
              name: l.name,
              placeId: l.placeId,
              visitedAt: new Date().toISOString().split('T')[0],
              photos: l.photos || [],
              isCurrentLocation: l.isCurrentLocation,
            })),
            currentLocationName: currentLoc?.name || '',
            totalLocations: plannerLocations.length,
            completionPercentage: completion,
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Trip update shared successfully! 🎉');
        onClose();
        if (onPostCreated) onPostCreated();
        window.location.reload();
      } else {
        alert(data.error || 'Failed to create trip update');
        setIsSubmitting(false);
      }
    } catch (error: any) {
      alert('Network error: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const handleContentChange = (newContent: any) => {
    setContent(newContent);
  };

  // Image upload handlers for blog posts
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
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
        setImages([...images, data.imageUrl]);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!currentImageUrl.trim()) return;
    
    // Basic URL validation
    try {
      new URL(currentImageUrl);
      setImages([...images, currentImageUrl]);
      setCurrentImageUrl('');
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Image upload handlers for trip location photos
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
        const updatedLocations = [...tripLocations];
        updatedLocations[locationIndex].photos.push(data.imageUrl);
        setTripLocations(updatedLocations);
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
    if (!locationPhotoUrl.trim()) return;
    
    try {
      new URL(locationPhotoUrl);
      const updatedLocations = [...tripLocations];
      updatedLocations[locationIndex].photos.push(locationPhotoUrl);
      setTripLocations(updatedLocations);
      setLocationPhotoUrl('');
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleRemoveLocationPhoto = (locationIndex: number, photoIndex: number) => {
    const updatedLocations = [...tripLocations];
    updatedLocations[locationIndex].photos = updatedLocations[locationIndex].photos.filter((_, i) => i !== photoIndex);
    setTripLocations(updatedLocations);
  };

  // Image upload handlers for planner locations
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

    setUploadingPlannerPhoto(locationIndex);
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
        const updatedLocations = [...plannerLocations];
        updatedLocations[locationIndex].photos.push(data.imageUrl);
        setPlannerLocations(updatedLocations);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingPlannerPhoto(null);
      e.target.value = '';
    }
  };

  const handleAddPlannerPhotoUrl = (locationIndex: number) => {
    if (!plannerPhotoUrl.trim()) return;
    
    try {
      new URL(plannerPhotoUrl);
      const updatedLocations = [...plannerLocations];
      updatedLocations[locationIndex].photos.push(plannerPhotoUrl);
      setPlannerLocations(updatedLocations);
      setPlannerPhotoUrl('');
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleRemovePlannerPhoto = (locationIndex: number, photoIndex: number) => {
    const updatedLocations = [...plannerLocations];
    updatedLocations[locationIndex].photos = updatedLocations[locationIndex].photos.filter((_, i) => i !== photoIndex);
    setPlannerLocations(updatedLocations);
  };

  const handleSubmit = async () => {
    if (postType === 'blog') {
      if (!content) {
        alert('Please write something before publishing!');
        return;
      }

      // Validate content has some text
      let hasText = false;
      if (content.content && Array.isArray(content.content)) {
        for (const block of content.content) {
          if (block.content && Array.isArray(block.content)) {
            for (const node of block.content) {
              if (node.type === 'text' && node.text?.trim()) {
                hasText = true;
                break;
              }
            }
          }
          if (hasText) break;
        }
      }

      if (!hasText) {
        alert('Please write some content before publishing!');
        return;
      }

      setIsSubmitting(true);

      const result = await createPost({
        type: 'blog',
        content,
        images,
        tripName: tripName.trim() || undefined,
      });

      if (result.success) {
        alert('Post published successfully! 🎉');
        onClose();
        if (onPostCreated) {
          onPostCreated();
        }
        // Refresh the page to show new post
        window.location.reload();
      } else {
        alert(result.error || 'Failed to create post');
        setIsSubmitting(false);
      }
    } else if (postType === 'trip-update') {
      if (!tripName.trim()) {
        alert('Please enter a trip name!');
        return;
      }

      if (tripLocations.length === 0) {
        alert('Please add at least one location!');
        return;
      }

      setIsSubmitting(true);

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login first');
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:4000/api/posts/trip-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tripId: `trip-${Date.now()}`,
            tripName: tripName.trim(),
            tripProgress: {
              locations: tripLocations,
              currentLocationName: currentLocationName || tripLocations.find(l => l.isCurrentLocation)?.name || '',
              totalLocations: tripLocations.length,
              completionPercentage: completionPercentage
            }
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('Trip update shared successfully! 🎉');
          onClose();
          if (onPostCreated) {
            onPostCreated();
          }
          window.location.reload();
        } else {
          alert(data.error || 'Failed to create trip update');
          setIsSubmitting(false);
        }
      } catch (error: any) {
        alert('Network error: ' + error.message);
        setIsSubmitting(false);
      }
    }
  };

  const handleSaveDraft = () => {
    const draft = {
      content,
      tripName,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('postDraft', JSON.stringify(draft));
    alert('Draft saved! ✓');
  };

  // Load draft if exists on mount
  React.useEffect(() => {
    if (!isOpen) return;

    const savedDraft = localStorage.getItem('postDraft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (confirm('You have a saved draft. Would you like to continue editing it?')) {
          setContent(draft.content);
          setTripName(draft.tripName || '');
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Post Type Selection Screen
  if (postType === 'select') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-20 animate-fadeIn">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-scaleIn">
          <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between rounded-t-2xl">
            <div>
              <h2 className="text-xl font-bold">What would you like to share?</h2>
              <p className="text-teal-50 text-sm">Choose the type of content you want to create</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-4">
            {/* Blog Story Option */}
            <button
              onClick={() => setPostType('blog')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-[#4A9B7F] hover:bg-teal-50/30 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ✍️
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Write a Blog Story</h3>
                  <p className="text-sm text-gray-600">
                    Share your travel experiences, tips, and insights through a detailed blog post
                  </p>
                </div>
              </div>
            </button>

            {/* Trip Update Option */}
            <button
              onClick={() => { setPostType('trip-source'); fetchPlannerTrips(); }}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/30 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🗺️
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Share Trip Progress</h3>
                  <p className="text-sm text-gray-600">
                    Update your friends on your journey with location check-ins and photos
                  </p>
                </div>
              </div>
            </button>

            {/* Review a Place */}
            <button
              onClick={() => { onClose(); onOpenReview?.(); }}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-[#4A9B7F] hover:bg-teal-50/30 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ⭐
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Review a Place
                  </h3>
                  <p className="text-sm text-gray-600">
                    Share your rating and review for restaurants, hotels, and attractions
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Blog Story Editor
  if (postType === 'blog') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-20 animate-fadeIn">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden animate-scaleIn flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPostType('select')}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Back to selection"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <PenSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Write Your Travel Story</h2>
                <p className="text-teal-50 text-sm">Share your journey with the community</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-6">
            {/* Left Side - Instructions */}
            <div className="space-y-4">
              {/* Collapsible Instructions */}
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-200 overflow-hidden">
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <h3 className="font-bold text-gray-900">✨ Writing Tips</h3>
                  {showInstructions ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                
                {showInstructions && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-teal-100">
                      <Target className="w-5 h-5 text-[#4A9B7F] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">Be Specific</h4>
                        <p className="text-xs text-gray-600 mt-1">Share detailed experiences and personal insights</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-purple-100">
                      <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">Add Tips</h4>
                        <p className="text-xs text-gray-600 mt-1">Include recommendations for travelers</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-orange-100">
                      <Users className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">Engage</h4>
                        <p className="text-xs text-gray-600 mt-1">Use vivid descriptions and storytelling</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Tips */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-bold text-sm text-gray-900 mb-2">📝 Formatting</h4>
                <ul className="space-y-1.5 text-xs text-gray-700">
                  <li>• <strong>Heading 1</strong> for title</li>
                  <li>• <strong>Heading 2-3</strong> for sections</li>
                  <li>• Use <strong>lists</strong> for tips</li>
                  <li>• Aim for <strong>200+ words</strong></li>
                </ul>
              </div>
            </div>

            {/* Right Side - Editor */}
            <div className="space-y-4">
              {/* Trip Name Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 text-[#4A9B7F]" />
                  Trip Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., Summer Adventure in Bali"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-transparent"
                  maxLength={100}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {tripName.length}/100
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  📸 Add Images <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                
                {/* URL Input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={currentImageUrl}
                    onChange={(e) => setCurrentImageUrl(e.target.value)}
                    placeholder="Paste image URL"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                    disabled={isSubmitting || uploadingImage}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddImageUrl()}
                  />
                  <button
                    onClick={handleAddImageUrl}
                    disabled={!currentImageUrl.trim() || isSubmitting || uploadingImage}
                    className="px-4 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Add URL
                  </button>
                </div>

                {/* File Upload Button */}
                <label 
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-[#4A9B7F] hover:bg-teal-50 transition-all cursor-pointer ${
                    (isSubmitting || uploadingImage) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#4A9B7F]" />
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600">Upload from device</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isSubmitting || uploadingImage}
                    className="hidden"
                  />
                </label>

                {/* Image Preview Grid */}
                {images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden min-h-[400px]">
                <PostEditor
                  onChange={handleContentChange}
                  editable={!isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="hidden sm:inline">Remember to save your draft regularly! 💾</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSubmitting || !content}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content}
              className="flex items-center gap-2 px-6 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish Story ✨</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // Trip Update Form
  if (postType === 'trip-update') {
    const addLocation = () => {
      setTripLocations([...tripLocations, {
        name: '',
        placeId: '',
        visitedAt: new Date().toISOString().split('T')[0],
        photos: [],
        isCurrentLocation: false
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

    const addPhotoToLocation = (index: number) => {
      const url = prompt('Enter photo URL:');
      if (url && url.trim()) {
        const updated = [...tripLocations];
        updated[index].photos.push(url.trim());
        setTripLocations(updated);
      }
    };

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-20 animate-fadeIn">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-scaleIn flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPostType('select')}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Back to selection"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                🗺️
              </div>
              <div>
                <h2 className="text-xl font-bold">Share Trip Progress</h2>
                <p className="text-teal-50 text-sm">Update your journey with locations and photos</p>
              </div>
            </div>
            <button
              onClick={handleClose}
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
                  className="px-4 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] text-sm font-medium disabled:opacity-50"
                >
                  + Add Location
                </button>
              </div>

              <div className="space-y-3">
                {tripLocations.map((location, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Location Name</label>
                        <input
                          type="text"
                          value={location.name}
                          onChange={(e) => updateLocation(index, 'name', e.target.value)}
                          placeholder="e.g., Eiffel Tower"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Visit Date</label>
                        <input
                          type="date"
                          value={location.visitedAt}
                          onChange={(e) => updateLocation(index, 'visitedAt', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={location.isCurrentLocation}
                          onChange={(e) => {
                            const updated = tripLocations.map((loc, i) => ({
                              ...loc,
                              isCurrentLocation: i === index ? e.target.checked : false
                            }));
                            setTripLocations(updated);
                            if (e.target.checked) {
                              setCurrentLocationName(location.name);
                            }
                          }}
                          className="w-4 h-4"
                          disabled={isSubmitting}
                        />
                        <span className="text-green-600 font-medium">Current Location</span>
                      </label>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        📸 Photos ({location.photos.length})
                      </label>
                      
                      {/* Photo URL Input */}
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={locationPhotoUrl}
                          onChange={(e) => setLocationPhotoUrl(e.target.value)}
                          placeholder="Paste photo URL"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                          disabled={isSubmitting || uploadingLocationPhoto === index}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddLocationPhotoUrl(index)}
                        />
                        <button
                          onClick={() => handleAddLocationPhotoUrl(index)}
                          disabled={!locationPhotoUrl.trim() || isSubmitting || uploadingLocationPhoto === index}
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
                          {location.photos.map((photo, photoIndex) => (
                            <div key={photoIndex} className="relative w-16 h-16 group">
                              <img 
                                src={photo} 
                                alt="" 
                                className="w-full h-full object-cover rounded border border-gray-200" 
                              />
                              <button
                                onClick={() => handleRemoveLocationPhoto(index, photoIndex)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeLocation(index)}
                      disabled={isSubmitting}
                      className="text-red-500 text-sm hover:text-red-700 font-medium"
                    >
                      Remove Location
                    </button>
                  </div>
                ))}

                {tripLocations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No locations added yet. Click "Add Location" to get started!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="text-sm text-gray-600">
              Add your visited locations to share your journey
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !tripName.trim() || tripLocations.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <span>Share Trip Update 🗺️</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trip Source Selection (existing vs new)
  if (postType === 'trip-source') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-20 animate-fadeIn">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-scaleIn">
          <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setPostType('select')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div>
                <h2 className="text-xl font-bold">Share Trip Progress</h2>
                <p className="text-teal-50 text-sm">Choose how you want to share your journey</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-4">
            {/* Existing Trip */}
            <button
              onClick={() => setPostType('existing-trip')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-[#4A9B7F] hover:bg-teal-50/30 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🗺️
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Share from an Existing Trip</h3>
                  <p className="text-sm text-gray-600">
                    Pick a trip you already planned and mark which locations you've visited so far
                  </p>
                </div>
              </div>
            </button>

            {/* New Trip */}
            <button
              onClick={() => setPostType('trip-update')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/30 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ✏️
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Create a New Trip Update</h3>
                  <p className="text-sm text-gray-600">
                    Manually add locations and photos for a trip not yet in your planner
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Existing Planner Trip Flow
  if (postType === 'existing-trip') {
    const visitedCount = plannerLocations.filter(l => l.isVisited).length;
    const autoCompletion = plannerLocations.length > 0
      ? Math.round((visitedCount / plannerLocations.length) * 100)
      : 0;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-20 animate-fadeIn">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-scaleIn flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4A9B7F] to-teal-600 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setPostType('trip-source')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">🗺️</div>
              <div>
                <h2 className="text-xl font-bold">Share Trip Progress</h2>
                <p className="text-teal-50 text-sm">Select a trip and mark visited locations</p>
              </div>
            </div>
            <button onClick={handleClose} disabled={isSubmitting} className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Trip Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select a Trip <span className="text-red-500">*</span>
              </label>
              {plannerTripsLoading ? (
                <div className="flex items-center gap-2 text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading trips...</span>
                </div>
              ) : plannerTrips.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                  No trips found in your planner.
                  <button onClick={() => setPostType('trip-update')} className="ml-1 text-[#4A9B7F] font-medium underline">Create a new trip update instead</button>
                </div>
              ) : (
                <select
                  value={selectedPlannerTripId}
                  onChange={(e) => handleSelectPlannerTrip(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] bg-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Choose a trip --</option>
                  {plannerTrips.map((trip: any) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.trip_name || trip.tripName || 'Untitled Trip'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Locations list */}
            {selectedPlannerTripId && plannerLocationsLoading && (
              <div className="flex items-center gap-2 text-gray-500 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading locations...</span>
              </div>
            )}

            {selectedPlannerTripId && !plannerLocationsLoading && plannerLocations.length > 0 && (
              <>
                {/* Auto completion bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Trip Completion</span>
                    <span className="text-sm font-bold text-[#4A9B7F]">{autoCompletion}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A9B7F] rounded-full transition-all duration-300"
                      style={{ width: `${autoCompletion}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{visitedCount} of {plannerLocations.length} locations visited</p>
                </div>

                {/* Location checkboxes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Mark Visited Locations
                  </label>
                  <div className="space-y-2">
                    {plannerLocations.map((loc, index) => (
                      <div key={index} className="space-y-2">
                        <div
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            loc.isCurrentLocation
                              ? 'border-[#4A9B7F] bg-teal-50'
                              : loc.isVisited
                              ? 'border-teal-200 bg-teal-50/40'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          {/* Visited checkbox */}
                          <input
                            type="checkbox"
                            id={`loc-${index}`}
                            checked={loc.isVisited}
                            onChange={(e) => {
                              const updated = [...plannerLocations];
                              updated[index] = { ...updated[index], isVisited: e.target.checked };
                              // If unchecked and was current, clear current
                              if (!e.target.checked && updated[index].isCurrentLocation) {
                                updated[index].isCurrentLocation = false;
                              }
                              setPlannerLocations(updated);
                            }}
                            className="w-4 h-4 accent-[#4A9B7F] cursor-pointer"
                            disabled={isSubmitting}
                          />
                          <MapPin className={`w-4 h-4 flex-shrink-0 ${loc.isCurrentLocation ? 'text-[#4A9B7F]' : loc.isVisited ? 'text-teal-500' : 'text-gray-300'}`} />
                          <label htmlFor={`loc-${index}`} className={`flex-1 text-sm font-medium cursor-pointer ${loc.isCurrentLocation ? 'text-[#4A9B7F]' : loc.isVisited ? 'text-gray-900' : 'text-gray-400'}`}>
                            {loc.name}
                          </label>
                          {/* Mark as current */}
                          {loc.isVisited && (
                            <button
                              onClick={() => {
                                const updated = plannerLocations.map((l, i) => ({
                                  ...l,
                                  isCurrentLocation: i === index,
                                }));
                                setPlannerLocations(updated);
                              }}
                              className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${
                                loc.isCurrentLocation
                                  ? 'bg-[#4A9B7F] text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-teal-100 hover:text-[#4A9B7F]'
                              }`}
                              disabled={isSubmitting}
                            >
                              {loc.isCurrentLocation ? 'Current' : 'Set Current'}
                            </button>
                          )}
                        </div>
                        
                        {/* Photo Upload Section - Only show for visited locations */}
                        {loc.isVisited && (
                          <div className="ml-7 pl-3 border-l-2 border-teal-200 space-y-2">
                            <label className="block text-xs font-medium text-gray-600">
                              📸 Add Photos (Optional)
                            </label>
                            
                            {/* Photo URL Input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={plannerPhotoUrl}
                                onChange={(e) => setPlannerPhotoUrl(e.target.value)}
                                placeholder="Paste photo URL"
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9B7F]"
                                disabled={isSubmitting || uploadingPlannerPhoto === index}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddPlannerPhotoUrl(index)}
                              />
                              <button
                                onClick={() => handleAddPlannerPhotoUrl(index)}
                                disabled={!plannerPhotoUrl.trim() || isSubmitting || uploadingPlannerPhoto === index}
                                className="px-3 py-1.5 bg-[#4A9B7F] text-white rounded text-sm hover:bg-[#3d8268] disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>

                            {/* File Upload Button */}
                            <label 
                              className={`flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-gray-300 rounded hover:border-[#4A9B7F] hover:bg-teal-50 transition-all cursor-pointer ${
                                (isSubmitting || uploadingPlannerPhoto === index) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {uploadingPlannerPhoto === index ? (
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
                                disabled={isSubmitting || uploadingPlannerPhoto === index}
                                className="hidden"
                              />
                            </label>

                            {/* Photo Preview Grid */}
                            {loc.photos.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {loc.photos.map((photo, photoIndex) => (
                                  <div key={photoIndex} className="relative w-16 h-16 group">
                                    <img 
                                      src={photo} 
                                      alt="" 
                                      className="w-full h-full object-cover rounded border border-gray-200" 
                                    />
                                    <button
                                      onClick={() => handleRemovePlannerPhoto(index, photoIndex)}
                                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
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

            {selectedPlannerTripId && !plannerLocationsLoading && plannerLocations.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                This trip has no locations yet. Add places in the planner first.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="text-sm text-gray-600">
              {visitedCount > 0 ? `${visitedCount} location${visitedCount > 1 ? 's' : ''} visited` : 'Mark locations as visited'}
            </div>
            <button
              onClick={handleSubmitExistingTrip}
              disabled={isSubmitting || !selectedPlannerTripId || visitedCount === 0}
              className="flex items-center gap-2 px-6 py-2 bg-[#4A9B7F] text-white rounded-lg hover:bg-[#3d8268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Sharing...</span></>
              ) : (
                <span>Share Trip Update 🗺️</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
