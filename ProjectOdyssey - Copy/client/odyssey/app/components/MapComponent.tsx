"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  APIProvider,
  Map,
  useMapsLibrary,
  useMap,
  AdvancedMarker,
  Pin,
  InfoWindow
} from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type MapComponentProps = {
  items: any[]; // items from left-column itinerary
  onClose?: () => void;
  userLocation?: { lat: number; lng: number } | null;
  geofences?: { lat: number; lng: number; radius: number; color?: string }[];
};

function UserLocationMarker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position}>
      <div className="relative flex items-center justify-center w-6 h-6">
        <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
        <div className="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
      </div>
    </AdvancedMarker>
  );
}

function GeofenceCircle({ center, radius, color = "#22c55e" }: { center: { lat: number; lng: number }; radius: number; color?: string }) {
  const map = useMap();
  const [circle, setCircle] = useState<google.maps.Circle>();

  useEffect(() => {
    if (!map) return;
    const gCircle = new google.maps.Circle({
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.2,
      map,
      center,
      radius,
    });
    setCircle(gCircle);
    return () => {
      gCircle.setMap(null);
    };
  }, [map, center, radius, color]);

  return null;
}

function Directions({ items }: { items: any[] }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map, suppressMarkers: true }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || items.length < 2) {
      return;
    }

    // Filter valid locations for Routing
    // MUST have placeId OR coordinates. Pure names are risky if they are generic.
    const validItems = items.filter(item => 
      !item.isBreak && 
      (item.placeId || (item.lat && item.lng))
    );

    if (validItems.length < 2) {
      // Not enough points for a route
      directionsRenderer.setMap(null);
      return;
    }

    try {
      const originItem = validItems[0];
      const destItem = validItems[validItems.length - 1];

      const getLoc = (item: any) => {
        if (item.placeId) return { placeId: item.placeId };
        if (item.lat && item.lng) return { location: { lat: item.lat, lng: item.lng } };
        return { query: item.name }; // Fallback (should be covered by filter)
      };

      const origin = getLoc(originItem);
      const destination = getLoc(destItem);

      const waypoints = validItems.slice(1, -1).map(item => ({
        location: getLoc(item) as any, // Type cast for Google Maps
        stopover: true
      }));

      directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING
      }).then(response => {
        directionsRenderer.setMap(map); // Ensure map is set
        directionsRenderer.setDirections(response);
      }).catch(err => {
        console.error("Directions request failed", err);
        // Don't clear map here, let markers stay
      });
    } catch (err) {
      console.error("Directions: Error during route setup", err);
    }

    return () => {
      directionsRenderer.setMap(null); // Cleanup
    };
  }, [directionsService, directionsRenderer, items]);

  return null;
}

// IUT, Boardbazar coordinates
const DEFAULT_CENTER = { lat: 23.9482, lng: 90.3794 };

function MapUpdater({ center }: { center: { lat: number; lng: number } | null | undefined }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (map && center && !hasCentered) {
      map.panTo(center);
      setHasCentered(true);
    }
  }, [map, center, hasCentered]);

  // Allow re-centering when center changes significantly? 
  // For now, let's just do it once on load or when userLocation becomes available first time.
  // Actually, if userLocation updates (moving), we might NOT want to auto-pan constantly if user is exploring.
  // Let's stick to "Pan on first availability".
  
  return null;
}

// Control to center map
function CenterControl({ center, disabled }: { center: { lat: number; lng: number } | null | undefined; disabled?: boolean }) {
  const map = useMap();

  const handleCenter = () => {
    if (map && center) {
      map.panTo(center);
      map.setZoom(15);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10">
       <button
          onClick={handleCenter}
          disabled={disabled || !center}
          className={`bg-white text-gray-800 p-2 rounded-full shadow-lg font-bold hover:bg-gray-100 flex items-center justify-center transition-all ${(!center || disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Center on Me"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
        </button>
    </div>
  );
}

export default function MapComponent({ items, onClose, userLocation, geofences = [] }: MapComponentProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Filter items that have at least a name
  const validItems = useMemo(() => items.filter(i => i.name), [items]);

  // Calculate center (prioritize user location, then first item, then IUT)
  const initialCenter = userLocation || (validItems.length > 0 && validItems[0].lat && validItems[0].lng ? { lat: validItems[0].lat, lng: validItems[0].lng } : DEFAULT_CENTER);

  if (!GOOGLE_MAPS_API_KEY) {
    return <div className="p-4 text-red-500">Error: Google Maps API Key is missing.</div>;
  }

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Header / Close Button */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={onClose}
          className="bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg font-bold hover:bg-gray-100"
        >
          Close Map
        </button>
      </div>

      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={initialCenter}
          defaultZoom={15}
          mapId="DEMO_MAP_ID" 
          className="w-full h-full"
          fullscreenControl={false}
        >
          {/* Helper to center map on user location updates */}
          <MapUpdater center={userLocation || DEFAULT_CENTER} />
          
          {/* Manual Center Control */}
          <CenterControl center={userLocation || DEFAULT_CENTER} disabled={!userLocation} />

          {/* Render Markers */}
          {validItems.map((item, index) => (
            <AdvancedMarkerWithRef
              key={item.id || index}
              item={item}
              index={index}
              onClick={() => setSelectedItem(item)}
            />
          ))}

          {/* Render Route */}
          {/* Directions component logic already filters invalid items, but we pass validItems which filters by name.
              Ideally Directions should also filter by having location/placeId.
              The Directions component implementation (not shown here fully) handles validItems.filter(item => item.placeId || item.name)
              We should ensure it strictly uses valid items for routing.
          */}
          <Directions items={validItems} />

          {/* Render User Location */}
          {userLocation && <UserLocationMarker position={userLocation} />}

          {/* Render Geofences */}
          {geofences.map((geo, idx) => (
            <GeofenceCircle key={idx} center={{ lat: geo.lat, lng: geo.lng }} radius={geo.radius} color={geo.color} />
          ))}

          {/* Info Window */}
          {selectedItem && (
            <InfoWindow
              position={null} 
              onCloseClick={() => setSelectedItem(null)}
            >
              <div className="p-2">
                <h3 className="font-bold">{selectedItem.name}</h3>
                <p className="text-xs text-gray-500">{selectedItem.category}</p>
                {selectedItem.visitDurationMin && (
                  <p className="text-xs">⏱ {selectedItem.visitDurationMin} min</p>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

// Separate component to handle Marker logic and geocoding if needed? 
// Actually, AdvancedMarker requires position {lat, lng}.
// If we only have PlaceID, we might need to fetch details or let DirectionsRenderer handle it.
// BUT, to show custom markers for ALL items (not just route points), we need positions.
// DirectionsRenderer shows markers by default, but we suppressed them to show custom ones?
// WAIT: DirectionsRenderer is easiest for V1. It handles PlaceIDs automatically.
// Let's UN-suppress markers in DirectionsRenderer for V1 if we only have PlaceIDs.
// However, the user wants "Interactivity".
// Strategy: 
// 1. Use DirectionsRenderer to show the route AND markers (easiest for PlaceID).
// 2. If we want custom markers, we'd need Geocoding Service to convert PlaceID -> LatLng.
// Let's stick to DirectionsRenderer markers for now, but maybe try to add click listeners?
// Actually, let's refine this:
// If we use DirectionsRenderer, it will put A, B, C markers. That is mostly sufficient for "Sequence".
// We can just rely on DirectionsRenderer for the visual map.

function AdvancedMarkerWithRef({ item, index, onClick }: any) {
  // If we don't have lat/lng, we can't render AdvancedMarker easily without looking it up.
  // We will skip rendering manual markers if we don't have coordinates, 
  // and rely on DirectionsRenderer to show the points.
  // IF the item has lat/lng (e.g. from Clustering/Database), we show it.

  // Check if we have standard lat/lng (some AI responses might fake it or database has it)
  // The `places` table has `location` (PostGIS), need to see if it's passed to frontend.
  // If not, we rely on DirectionsRenderer.

  if (item.lat && item.lng) {
    return (
      <AdvancedMarker position={{ lat: item.lat, lng: item.lng }} onClick={onClick}>
        <Pin background={"#FBBC04"} glyphColor={"#000"} borderColor={"#000"} />
      </AdvancedMarker>
    );
  }
  return null;
}
