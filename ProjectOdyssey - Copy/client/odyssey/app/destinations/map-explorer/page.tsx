"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import MapSearch from "../../../components/map/MapSearch";
import PlaceDetailsModal from "../../../components/map/PlaceDetailsModal";
import Link from "next/link";
import { useGeofencing } from "../../hooks/useGeofencing";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface SearchResult {
  placeId: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  types: string[];
  description?: string;
}


function UserLocationMarker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position}>
      <div className="relative flex items-center justify-center w-6 h-6">
        <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
        <div className="relative w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow-sm"></div>
      </div>
    </AdvancedMarker>
  );
}

function CenterControl({ center, map }: { center: { lat: number; lng: number } | null | undefined; map: google.maps.Map | null }) {
  const handleCenter = () => {
    if (map && center) {
      map.panTo(center);
      map.setZoom(15);
    }
  };

  return (
    <div className="absolute top-24 right-2.5 z-10">
       <button
          onClick={handleCenter}
          disabled={!center}
          className={`bg-white text-gray-800 p-2 rounded-sm shadow-md font-bold hover:bg-gray-50 flex items-center justify-center transition-all w-10 h-10 ${(!center) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Center on Me"
        >
          <span className="text-xl">📍</span>
        </button>
    </div>
  );
}

// Wrapper to use useMap hook inside APIProvider
function MapControlWrapper({ userLocation }: { userLocation: any }) {
  const map = useMap();
  return <CenterControl center={userLocation} map={map} />;
}

export default function DestinationsPage() {
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 23.8103, lng: 90.4125 }); // Default: Dhaka
  const [mapZoom, setMapZoom] = useState(12);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [detailsPlaceId, setDetailsPlaceId] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Geofencing Hook for User Location
  const { userLocation } = useGeofencing({ enabled: true });

  const handlePlaceSelect = (place: SearchResult) => {
    console.log("Selected place:", place);
    if (place.coordinates) {
      setSelectedPlace(place);
      setMapCenter(place.coordinates);
      setMapZoom(14);
      setShowInfoWindow(true);

      // Add to search results if not already there
      if (!searchResults.find(p => p.placeId === place.placeId)) {
        setSearchResults(prev => [...prev, place]);
      }
    }
  };

  const handleViewDetails = (place: SearchResult) => {
    console.log("Viewing details for:", place);
    setDetailsPlaceId(place.placeId);
    setShowDetails(true);
  };

  const handleAddToCollection = (place: any) => {
    console.log("Adding to collection:", place);

    // Get existing collections from localStorage
    const existingCollections = JSON.parse(localStorage.getItem('odyssey_collections') || '[]');

    // Check if already exists
    if (existingCollections.find((p: any) => p.placeId === place.placeId)) {
      alert(`${place.name} is already in your collection!`);
      return;
    }

    // Add new place to collections
    const newCollection = {
      id: `col-${Date.now()}-${Math.random()}`,
      placeId: place.placeId,
      name: place.name,
      text: place.name,
      description: place.description || place.address,
      category: place.types?.[0] || 'place',
      coordinates: place.coordinates,
      address: place.address,
      types: place.types,
      source: 'map-search'
    };

    const updatedCollections = [...existingCollections, newCollection];
    localStorage.setItem('odyssey_collections', JSON.stringify(updatedCollections));

    alert(`✓ ${place.name} added to your collection! Visit the Planner to organize your trip.`);
  };

  const handleRemovePlace = (placeId: string) => {
    setSearchResults(prev => prev.filter(p => p.placeId !== placeId));
    if (selectedPlace?.placeId === placeId) {
      setSelectedPlace(null);
      setShowInfoWindow(false);
    }
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">API Key Missing</h2>
          <p className="text-gray-600 mb-4">
            Google Maps API key is not configured. Please add it to your environment variables.
          </p>
          <code className="text-sm bg-gray-100 px-3 py-2 rounded block">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with Search */}
      <header className="bg-white shadow-md z-[1000] relative">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="text-3xl">🗺️</div>
              <span className="text-2xl font-bold text-blue-600">Odyssey</span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <MapSearch
                placeholder="Search for destinations, cities, attractions..."
                onPlaceSelect={handlePlaceSelect}
                onViewDetails={handleViewDetails}
                autoFocus={false}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-shrink-0">
              <Link
                href="/planner"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         font-semibold transition-colors flex items-center gap-2"
              >
                <span>📅</span>
                <span>Plan Trip</span>
              </Link>
              <Link
                href="/profile"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 
                         font-semibold transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Map + Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Display */}
        <div className="flex-1 relative">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              center={mapCenter}
              zoom={mapZoom}
              mapId="odyssey-destinations-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={true}
              scaleControl={true}
              streetViewControl={false}
              fullscreenControl={true}
              clickableIcons={true}
              style={{ width: "100%", height: "100%" }}
              onCenterChanged={(e: any) => console.log('Map center:', e.detail)}
            >
               {/* Controls */}
               <MapControlWrapper userLocation={userLocation} />

              {/* Markers for Search Results */}
              {searchResults.map((place, index) => (
                place.coordinates && (
                <AdvancedMarker
                  key={place.placeId}
                  position={place.coordinates}
                  onClick={() => {
                    setSelectedPlace(place);
                    setShowInfoWindow(true);
                  }}
                >
                  <Pin
                    background={selectedPlace?.placeId === place.placeId ? "#2563eb" : "#ef4444"}
                    borderColor={selectedPlace?.placeId === place.placeId ? "#1e40af" : "#b91c1c"}
                    glyphColor="#ffffff"
                  >
                    <span className="font-bold text-sm">{index + 1}</span>
                  </Pin>
                </AdvancedMarker>
                )
              ))}

              {/* User Location */}
              {userLocation && <UserLocationMarker position={userLocation} />}

              {/* Info Window for Selected Place */}
              {showInfoWindow && selectedPlace && selectedPlace.coordinates && (
                <InfoWindow
                  position={selectedPlace.coordinates}
                  onCloseClick={() => setShowInfoWindow(false)}
                >
                  <div className="p-2 max-w-xs">
                    <h3 className="font-bold text-lg mb-1">{selectedPlace.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{selectedPlace.address}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(selectedPlace)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleAddToCollection(selectedPlace)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Add to Trip
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>

          {/* Map Controls Overlay */}
          <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-3">
            <div className="text-sm text-gray-600">
              <div className="font-semibold mb-1">🎯 {searchResults.length} place(s) found</div>
              <div className="text-xs">Click markers to view details</div>
            </div>
          </div>
        </div>

        {/* Sidebar - Search Results List */}
        {searchResults.length > 0 && (
          <div className="w-96 bg-white shadow-lg overflow-y-auto border-l">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Search Results</h2>
              <p className="text-sm text-gray-600 mt-1">
                {searchResults.length} destination{searchResults.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="divide-y">
              {searchResults.map((place, index) => (
                <div
                  key={place.placeId}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedPlace?.placeId === place.placeId ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  onClick={() => {
                    if (place.coordinates) {
                      setSelectedPlace(place);
                      setMapCenter(place.coordinates);
                      setShowInfoWindow(true);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Number Badge */}
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                                  flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>

                    {/* Place Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{place.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{place.address}</p>

                      {/* Type Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {place.types.slice(0, 2).map((type, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(place);
                          }}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded 
                                   hover:bg-blue-700 transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCollection(place);
                          }}
                          className="text-xs px-3 py-1 bg-green-600 text-white rounded 
                                   hover:bg-green-700 transition-colors"
                        >
                          Add to Trip
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePlace(place.placeId);
                          }}
                          className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded 
                                   hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Place Details Modal */}
      <PlaceDetailsModal
        placeId={detailsPlaceId}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onAddToCollection={handleAddToCollection}
      />

      {/* Empty State (when no results) */}
      {searchResults.length === 0 && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="text-center p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
            <div className="text-4xl mb-2">🔍</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Search for Destinations</h2>
            <p className="text-sm text-gray-600 max-w-xs">
              Find cities, attractions, or any place you want to visit
            </p>
          </div>
        </div>
      )}
    </div>
  );
}