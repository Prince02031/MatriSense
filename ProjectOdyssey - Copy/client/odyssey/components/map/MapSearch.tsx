"use client";

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  placeId: string;
  name: string;
  description: string;
  address?: string;
  types: string[];
  secondaryText?: string;
  coordinates?: { lat: number; lng: number };
}

interface MapSearchProps {
  placeholder?: string;
  onPlaceSelect: (place: SearchResult) => void;
  onViewDetails?: (place: SearchResult) => void; // Changed to pass full place object
  className?: string;
  autoFocus?: boolean;
}

export default function MapSearch({
  placeholder = "Search for places, cities, countries...",
  onPlaceSelect,
  onViewDetails,
  className = "",
  autoFocus = false
}: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    // Clear previous timer
    clearTimeout(debounceTimer.current);

    // Require minimum 3 characters
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Debounce 500ms
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      
      try {
        const res = await fetch('http://localhost:4000/api/map/search-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          
          if (res.status === 429) {
            throw new Error('Daily search limit reached. Please try again tomorrow.');
          }
          
          throw new Error(errorData.error || 'Search failed');
        }
        
        const data = await res.json();
        setSuggestions(data.results || []);
        setIsOpen(true);
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Search failed. Please try again.');
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  const handleSelect = (place: SearchResult) => {
    onPlaceSelect(place);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleViewDetails = (place: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(place);
    }
    setIsOpen(false);
  };

  const getPlaceIcon = (types: string[]) => {
    if (types.includes('country') || types.includes('political')) return '🌍';
    if (types.includes('locality') || types.includes('administrative_area_level_1')) return '🏙️';
    if (types.includes('tourist_attraction') || types.includes('point_of_interest')) return '📍';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('restaurant') || types.includes('food')) return '🍴';
    if (types.includes('lodging') || types.includes('hotel')) return '🏨';
    if (types.includes('park')) return '🌳';
    return '📍';
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg 
                     focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                     text-base transition-all duration-200
                     placeholder-gray-400"
        />
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        
        {/* Search Icon (when not loading) */}
        {!loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="absolute z-[9999] w-full mt-1 bg-red-50 border-2 border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {suggestions.map((place) => (
            <button
              key={place.placeId}
              onClick={() => handleSelect(place)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-start gap-3 
                         border-b border-gray-100 last:border-b-0 transition-colors duration-150
                         focus:outline-none focus:bg-blue-50"
            >
              {/* Icon */}
              <span className="text-2xl flex-shrink-0 mt-0.5">
                {getPlaceIcon(place.types)}
              </span>
              
              {/* Place Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">
                  {place.name}
                </div>
                <div className="text-sm text-gray-500 truncate mt-0.5">
                  {place.secondaryText || place.description}
                </div>
                
                {/* Type Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {place.types.slice(0, 2).map((type, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
                    >
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* View Details Button */}
              {onViewDetails && (
                <button
                  onClick={(e) => handleViewDetails(place, e)}
                  className="flex-shrink-0 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 
                           hover:bg-blue-100 rounded-md transition-colors duration-150"
                >
                  Details →
                </button>
              )}
            </button>
          ))}
          
          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-200">
            Powered by Google Maps
          </div>
        </div>
      )}
      
      {/* No Results */}
      {isOpen && !loading && query.length >= 3 && suggestions.length === 0 && !error && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
          <div className="text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No places found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        </div>
      )}
    </div>
  );
}
