"use client";

import { useState, useEffect } from 'react';

interface PlaceDetailsProps {
  placeId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCollection?: (place: any) => void;
}

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  photos: string[];
  rating: number;
  totalRatings: number;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    profilePhoto?: string;
  }>;
  openingHours: string[];
  website?: string;
  phone?: string;
  types: string[];
  priceLevel?: number;
  description?: string;
}

export default function PlaceDetailsModal({
  placeId,
  isOpen,
  onClose,
  onAddToCollection
}: PlaceDetailsProps) {
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    if (isOpen && placeId) {
      fetchPlaceDetails();
    }
  }, [isOpen, placeId]);

  const fetchPlaceDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`http://localhost:4000/api/map/place-details/${placeId}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch place details');
      }
      
      const data = await res.json();
      setPlace(data.place);
    } catch (err: any) {
      console.error('Fetch place details error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = () => {
    if (place && onAddToCollection) {
      onAddToCollection(place);
      onClose();
    }
  };

  const nextPhoto = () => {
    if (place && place.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % place.photos.length);
    }
  };

  const prevPhoto = () => {
    if (place && place.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + place.photos.length) % place.photos.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}

        {place && !loading && !error && (
          <div>
            {/* Photo Gallery */}
            {place.photos.length > 0 && (
              <div className="relative h-96 bg-gray-900">
                <img
                  src={place.photos[currentPhotoIndex]}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
                
                {place.photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {place.photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPhotoIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentPhotoIndex ? 'bg-white w-8' : 'bg-white bg-opacity-50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-8">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{place.name}</h1>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {place.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">{place.rating.toFixed(1)}</span>
                      <span>({place.totalRatings} reviews)</span>
                    </div>
                  )}
                  
                  {place.priceLevel && (
                    <span className="text-green-600 font-semibold">
                      {'$'.repeat(place.priceLevel)}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 mt-2">{place.address}</p>
              </div>

              {/* Description */}
              {place.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">About</h3>
                  <p className="text-gray-700 leading-relaxed">{place.description}</p>
                </div>
              )}

              {/* Opening Hours */}
              {place.openingHours.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Opening Hours</h3>
                  <div className="space-y-1">
                    {place.openingHours.map((hours, idx) => (
                      <p key={idx} className="text-sm text-gray-600">{hours}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              {(place.website || place.phone) && (
                <div className="mb-6 flex gap-4">
                  {place.website && (
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Website
                    </a>
                  )}
                  {place.phone && (
                    <a
                      href={`tel:${place.phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {place.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Reviews */}
              {place.reviews.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Reviews</h3>
                  <div className="space-y-4">
                    {place.reviews.map((review, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{review.author}</span>
                          <span className="text-yellow-500">
                            {'★'.repeat(review.rating)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                {onAddToCollection && (
                  <button
                    onClick={handleAddToCollection}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                             font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Collection
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 
                           font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
