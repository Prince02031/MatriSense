# Location-Based Travel Companion - Implementation Plan

## Executive Summary

This document outlines the implementation strategy for transforming Project Odyssey into a comprehensive location-aware travel companion app that works across desktop and mobile platforms. The system will track user visits, provide smart notifications, and guide travelers through their itineraries using real-time location services.

---

## 1. Cross-Platform Location Services

### Desktop (Web/Laptop)

**Technology:** Browser Geolocation API (`navigator.geolocation`)

**Characteristics:**

- **Accuracy:** 10-50 meters (WiFi/IP triangulation)
- **Permissions:** One-time browser prompt
- **Battery Impact:** Minimal (passive updates)
- **Update Frequency:** 30-60 seconds when app is active
- **Limitations:** Requires active browser tab, less precise

**Use Cases:**

- Trip planning and route visualization
- General progress tracking
- Desktop-based itinerary management
- Backup location source

**Implementation:**

```javascript
// services/location/browserLocation.js
export const BrowserLocationService = {
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },
  
  watchPosition: (callback) => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp
      }),
      (error) => console.error(error),
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 5000 }
    );
    return watchId;
  },
  
  stopWatching: (watchId) => {
    navigator.geolocation.clearWatch(watchId);
  }
};
```

### Mobile (React Native)

**Technology:**

- `react-native-geolocation-service` (bare React Native)
- `expo-location` (Expo)

**Characteristics:**

- **Accuracy:** 5-10 meters (GPS + cellular)
- **Permissions:** iOS/Android location permissions (foreground + background)
- **Battery Impact:** Higher (active GPS)
- **Update Frequency:** 2-5 minutes background, real-time foreground
- **Features:** Background tracking, geofencing, altitude, speed

**Use Cases:**

- Real-time visit detection during trips
- Precise geofencing for arrival/departure
- Turn-by-turn navigation
- Offline location caching

**Implementation:**

```javascript
// services/location/mobileLocation.js (React Native)
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

export const MobileLocationService = {
  requestPermissions: async () => {
    if (Platform.OS === 'ios') {
      return await Geolocation.requestAuthorization('whenInUse');
    }
    
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  },
  
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  },
  
  watchPosition: (callback) => {
    return Geolocation.watchPosition(
      (position) => callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      }),
      (error) => console.error(error),
      { 
        enableHighAccuracy: true, 
        distanceFilter: 10, // Only update if moved 10m
        interval: 5000, // Check every 5 seconds
        fastestInterval: 2000 
      }
    );
  },
  
  stopWatching: (watchId) => {
    Geolocation.clearWatch(watchId);
  }
};
```

### Unified Abstraction Layer

**Purpose:** Single API for both platforms

```javascript
// services/location/index.js
import { Platform } from 'react-native'; // or detect platform differently for web
import { BrowserLocationService } from './browserLocation';
import { MobileLocationService } from './mobileLocation';

const LocationService = Platform.OS === 'web' 
  ? BrowserLocationService 
  : MobileLocationService;

export default LocationService;

// Usage (works everywhere):
// const location = await LocationService.getCurrentLocation();
```

---

## 2. Map Route Storage & Persistence

### Database Schema

**Extend Existing Itineraries Table:**

```sql
-- Add map route column to itineraries table
ALTER TABLE itineraries ADD COLUMN map_routes JSONB;
ALTER TABLE itineraries ADD COLUMN transport_mode VARCHAR DEFAULT 'walking';

-- Create index for faster queries
CREATE INDEX idx_itineraries_map_routes ON itineraries USING GIN (map_routes);
```

**Route Data Structure (JSONB):**

```json
{
  "routeId": "550e8400-e29b-41d4-a716-446655440000",
  "generatedAt": "2026-01-31T10:30:00Z",
  "waypoints": [
    {
      "placeId": "eiffel-tower-123",
      "name": "Eiffel Tower",
      "coordinates": {
        "latitude": 48.8584,
        "longitude": 2.2945
      },
      "order": 1,
      "expectedDuration": 7200,
      "category": "landmark",
      "visitStatus": "pending"
    },
    {
      "placeId": "louvre-456",
      "name": "Louvre Museum",
      "coordinates": {
        "latitude": 48.8606,
        "longitude": 2.3376
      },
      "order": 2,
      "expectedDuration": 10800,
      "category": "museum",
      "visitStatus": "pending"
    }
  ],
  "legs": [
    {
      "from": "eiffel-tower-123",
      "to": "louvre-456",
      "distance": 5200,
      "duration": 3600,
      "polyline": "o}~iHaacMwAb@oAh@gB|@...",
      "steps": [
        {
          "instruction": "Head northeast on Quai Branly",
          "distance": 450,
          "duration": 320
        }
      ]
    }
  ],
  "summary": {
    "totalDistance": 12400,
    "totalDuration": 21600,
    "transportMode": "walking",
    "startLocation": { "lat": 48.8584, "lng": 2.2945 },
    "endLocation": { "lat": 48.8738, "lng": 2.2950 }
  }
}
```

### Why Persist Routes?

1. **Offline Access:** Users can view itinerary map without internet
2. **Visit Tracking:** Compare actual path vs planned route
3. **Progress Calculation:** Know which leg user is on
4. **Historical Data:** Analyze popular routes, completion rates
5. **Caching:** Avoid repeated API calls to Google Directions
6. **Multi-Day Support:** Save separate routes for each day
7. **Version Control:** Track route modifications over time

### Route Generation API

**Backend Endpoint:**

```javascript
// server/src/routes/mapRoutes.js
router.post('/api/map/generate-route', async (req, res) => {
  const { itineraryId, waypoints, transportMode } = req.body;
  
  // Call Google Directions API
  const directionsResult = await googleMaps.directions({
    origin: waypoints[0],
    destination: waypoints[waypoints.length - 1],
    waypoints: waypoints.slice(1, -1).map(w => ({ location: w })),
    mode: transportMode || 'walking',
    optimize: true
  }).asPromise();
  
  // Parse and store route
  const routeData = {
    routeId: uuidv4(),
    generatedAt: new Date(),
    waypoints: parseWaypoints(directionsResult),
    legs: directionsResult.routes[0].legs,
    summary: {
      totalDistance: calculateTotalDistance(directionsResult),
      totalDuration: calculateTotalDuration(directionsResult),
      transportMode,
      startLocation: waypoints[0],
      endLocation: waypoints[waypoints.length - 1]
    }
  };
  
  // Update itinerary with route
  await supabase
    .from('itineraries')
    .update({ map_routes: routeData })
    .eq('id', itineraryId);
  
  res.json({ route: routeData });
});
```

---

## 3. Visit Tracking & Geofencing System

### Geofence Architecture

**What is Geofencing?**
A virtual perimeter around a geographic location. When a user enters or exits this boundary, an event is triggered.

**Our Implementation:**

- Create circular geofence around each itinerary place
- Radius: 50-150 meters (configurable per place type)
- Monitor user location continuously
- Trigger events: `ENTER`, `EXIT`, `DWELL` (stayed X minutes)

### Database Schema: Visit Logs

```sql
CREATE TABLE visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  place_id VARCHAR NOT NULL,
  place_name VARCHAR NOT NULL,
  
  -- Timing
  entered_at TIMESTAMP,
  exited_at TIMESTAMP,
  time_spent INTEGER, -- seconds
  expected_duration INTEGER, -- seconds (from itinerary)
  
  -- Status
  status VARCHAR DEFAULT 'pending', -- pending, in_progress, completed, skipped
  
  -- Location Data
  entry_location JSONB, -- {lat, lng, accuracy}
  exit_location JSONB,
  
  -- User Input
  user_rating INTEGER, -- 1-5 stars
  notes TEXT,
  photos JSONB, -- array of photo URLs
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visit_logs_user ON visit_logs(user_id);
CREATE INDEX idx_visit_logs_itinerary ON visit_logs(itinerary_id);
CREATE INDEX idx_visit_logs_status ON visit_logs(status);
```

### Geofence Creation Logic

**When itinerary is confirmed:**

```javascript
// services/geofencing/setup.js
export async function createGeofences(itinerary) {
  const geofences = itinerary.selectedPlaces.map((place, index) => ({
    id: `${itinerary.id}-${place.id}`,
    latitude: place.coordinates.lat,
    longitude: place.coordinates.lng,
    radius: determineRadius(place.category), // 50-150m
    notifyOnEntry: true,
    notifyOnExit: true,
    loiteringDelay: 60000, // 1 minute before "dwelling" event
    metadata: {
      placeId: place.id,
      placeName: place.name,
      order: index + 1,
      expectedDuration: place.visitDurationMin * 60
    }
  }));
  
  // Register with native geofencing service
  await GeofencingService.addGeofences(geofences);
  
  // Store in database for reference
  await supabase
    .from('active_geofences')
    .insert(geofences.map(g => ({
      itinerary_id: itinerary.id,
      geofence_data: g
    })));
}

function determineRadius(category) {
  const radiusMap = {
    'landmark': 100, // Large landmarks (Eiffel Tower)
    'museum': 75,    // Buildings
    'restaurant': 50, // Small venues
    'park': 150      // Large outdoor areas
  };
  return radiusMap[category] || 75; // Default 75m
}
```

### Real-Time Location Monitoring

**Background Tracking Service:**

```javascript
// services/tracking/backgroundTracker.js
class BackgroundTracker {
  constructor() {
    this.watchId = null;
    this.currentItinerary = null;
    this.activeGeofences = [];
    this.checkInterval = 5000; // 5 seconds
  }
  
  async startTracking(itineraryId) {
    // Load itinerary and geofences
    this.currentItinerary = await fetchItinerary(itineraryId);
    this.activeGeofences = await fetchGeofences(itineraryId);
    
    // Start location watch
    this.watchId = LocationService.watchPosition(async (position) => {
      await this.checkGeofences(position);
    });
    
    console.log(`Tracking started for itinerary ${itineraryId}`);
  }
  
  async checkGeofences(userPosition) {
    for (const geofence of this.activeGeofences) {
      const distance = this.calculateDistance(
        userPosition.latitude,
        userPosition.longitude,
        geofence.latitude,
        geofence.longitude
      );
      
      const isInside = distance <= geofence.radius;
      const wasInside = geofence.userInside || false;
      
      if (isInside && !wasInside) {
        // ENTER event
        await this.handleGeofenceEnter(geofence, userPosition);
      } else if (!isInside && wasInside) {
        // EXIT event
        await this.handleGeofenceExit(geofence, userPosition);
      }
      
      geofence.userInside = isInside;
    }
  }
  
  async handleGeofenceEnter(geofence, position) {
    console.log(`Entered geofence: ${geofence.metadata.placeName}`);
    
    // Create visit log
    await supabase.from('visit_logs').insert({
      user_id: this.currentItinerary.user_id,
      itinerary_id: this.currentItinerary.id,
      place_id: geofence.metadata.placeId,
      place_name: geofence.metadata.placeName,
      entered_at: new Date(),
      status: 'in_progress',
      entry_location: {
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy
      }
    });
    
    // Send notification
    await NotificationService.send({
      title: `Arrived at ${geofence.metadata.placeName}! 🎉`,
      body: 'Enjoy your visit. We\'ll track your time here.',
      data: { type: 'ARRIVAL', placeId: geofence.metadata.placeId }
    });
    
    // Update UI
    EventEmitter.emit('visit:enter', geofence.metadata);
  }
  
  async handleGeofenceExit(geofence, position) {
    console.log(`Exited geofence: ${geofence.metadata.placeName}`);
    
    // Fetch visit log
    const { data: visitLog } = await supabase
      .from('visit_logs')
      .select('*')
      .eq('place_id', geofence.metadata.placeId)
      .eq('status', 'in_progress')
      .order('entered_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!visitLog) return;
    
    // Calculate time spent
    const enteredAt = new Date(visitLog.entered_at);
    const exitedAt = new Date();
    const timeSpent = Math.floor((exitedAt - enteredAt) / 1000); // seconds
    
    // Determine if visit is complete
    const expectedDuration = geofence.metadata.expectedDuration;
    const isComplete = timeSpent >= expectedDuration * 0.7; // 70% threshold
    
    // Update visit log
    await supabase
      .from('visit_logs')
      .update({
        exited_at: exitedAt,
        time_spent: timeSpent,
        exit_location: {
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy
        },
        status: isComplete ? 'completed' : 'in_progress'
      })
      .eq('id', visitLog.id);
    
    // Send appropriate notification
    if (isComplete) {
      const nextPlace = this.getNextPlace(geofence.metadata.order);
      await NotificationService.send({
        title: `Visit Complete! ✅`,
        body: nextPlace 
          ? `Next: ${nextPlace.name} (${this.formatDistance(nextPlace.distance)} away)`
          : 'All places visited! Trip complete! 🎊',
        data: { type: 'COMPLETE', nextPlaceId: nextPlace?.id }
      });
    } else {
      await NotificationService.sendInteractive({
        title: 'Leaving Early?',
        body: `You spent ${this.formatDuration(timeSpent)} here. Mark as complete?`,
        actions: [
          { id: 'complete', title: 'Mark Complete' },
          { id: 'continue', title: 'Still Visiting' }
        ],
        data: { visitLogId: visitLog.id }
      });
    }
    
    // Update UI
    EventEmitter.emit('visit:exit', {
      place: geofence.metadata,
      timeSpent,
      isComplete
    });
  }
  
  getNextPlace(currentOrder) {
    const places = this.currentItinerary.selectedPlaces;
    const nextPlace = places.find(p => p.order === currentOrder + 1);
    return nextPlace;
  }
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  }
  
  formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  }
  
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} minutes`;
  }
  
  stopTracking() {
    if (this.watchId) {
      LocationService.stopWatching(this.watchId);
      this.watchId = null;
    }
    console.log('Tracking stopped');
  }
}

export default new BackgroundTracker();
```

---

## 4. Smart Notification System

### Notification Types & Triggers

| Type | Trigger | Example | Actions |
|------|---------|---------|---------|
| **Arrival** | User enters geofence | "Arrived at Eiffel Tower! 🎉" | [View Details] |
| **Departure** | User exits geofence | "Leaving already? Mark complete?" | [Complete] [Still Here] |
| **Next Place** | Previous visit completed | "Next: Louvre (1.2km, 15 min)" | [Navigate] [Skip] |
| **Time Warning** | Exceeded expected duration | "2 hours here. Ready to move on?" | [Complete] [Stay Longer] |
| **Off Route** | 200m+ from planned route | "You're off route. Need directions?" | [Get Directions] [Ignore] |
| **Completion** | All visits done | "Trip complete! 🎊 5/5 places" | [View Summary] |
| **Reminder** | Inactive for 30+ min during trip | "Still exploring? Let us know!" | [I'm Here] [End Trip] |

### Implementation (Mobile - React Native)

**Setup:**

```bash
npm install @react-native-firebase/messaging
npm install react-native-push-notification
```

**Notification Service:**

```javascript
// services/notifications/NotificationService.js
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';

class NotificationService {
  constructor() {
    this.configure();
  }
  
  configure() {
    PushNotification.configure({
      onNotification: this.onNotification.bind(this),
      permissions: {
        alert: true,
        badge: true,
        sound: true
      },
      popInitialNotification: true,
      requestPermissions: true
    });
  }
  
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('Notification permission granted');
      const token = await messaging().getToken();
      await this.saveFCMToken(token);
    }
  }
  
  async saveFCMToken(token) {
    const userId = await getUserId(); // Get from auth
    await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        fcm_token: token,
        platform: Platform.OS,
        updated_at: new Date()
      });
  }
  
  // Local notification (immediate)
  send({ title, body, data, bigText, actions }) {
    PushNotification.localNotification({
      title,
      message: body,
      bigText: bigText || body,
      userInfo: data,
      actions: actions || [],
      vibrate: true,
      playSound: true,
      soundName: 'default'
    });
  }
  
  // Interactive notification
  sendInteractive({ title, body, actions, data }) {
    PushNotification.localNotification({
      title,
      message: body,
      userInfo: data,
      actions: actions.map(a => a.title),
      category: 'VISIT_ACTION',
      vibrate: true,
      playSound: true
    });
  }
  
  onNotification(notification) {
    console.log('Notification received:', notification);
    
    if (notification.userInteraction) {
      // User tapped notification
      const { type, placeId, visitLogId } = notification.data;
      
      if (notification.action === 'Mark Complete') {
        this.handleCompleteAction(visitLogId);
      } else if (notification.action === 'Navigate') {
        this.handleNavigateAction(placeId);
      }
      
      // Navigate to relevant screen
      NavigationService.navigate('TripProgress', { placeId });
    }
  }
  
  async handleCompleteAction(visitLogId) {
    await supabase
      .from('visit_logs')
      .update({ status: 'completed' })
      .eq('id', visitLogId);
    
    EventEmitter.emit('visit:marked_complete', visitLogId);
  }
  
  async handleNavigateAction(placeId) {
    // Open native maps app with directions
    const place = await fetchPlace(placeId);
    const url = Platform.select({
      ios: `maps:?daddr=${place.lat},${place.lng}`,
      android: `google.navigation:q=${place.lat},${place.lng}`
    });
    Linking.openURL(url);
  }
  
  cancelAll() {
    PushNotification.cancelAllLocalNotifications();
  }
}

export default new NotificationService();
```

### Desktop (Web) Notifications

```javascript
// services/notifications/BrowserNotificationService.js
class BrowserNotificationService {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.error('Browser does not support notifications');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  send({ title, body, icon, data }) {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }
    
    const notification = new Notification(title, {
      body,
      icon: icon || '/logo.png',
      tag: data?.type || 'general',
      requireInteraction: true, // Stays until dismissed
      data
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Handle click based on type
      if (data?.placeId) {
        window.location.href = `/trip/${data.itineraryId}?place=${data.placeId}`;
      }
    };
  }
}

export default new BrowserNotificationService();
```

---

## 5. Implementation Phases (Detailed Roadmap)

### 🎯 PHASE 1: Map Foundation (Week 1-2)

**Goal:** Display itinerary on interactive map

**Tasks:**

1. **Map Library Integration**
   - [ ] Install Google Maps SDK (or Mapbox)
   - [ ] Create `MapComponent` for desktop
   - [ ] Create `MapComponent` for mobile (react-native-maps)
   - [ ] Add API keys to environment variables

2. **Basic Map Display**
   - [ ] Show all itinerary places as markers
   - [ ] Custom marker icons per category (restaurant, museum, etc)
   - [ ] Info windows on marker click
   - [ ] Fit bounds to show all markers

3. **User Location**
   - [ ] Request location permissions
   - [ ] Show user's current location (blue dot)
   - [ ] "Center on me" button
   - [ ] Handle permission denied gracefully

4. **UI/UX**
   - [ ] Map toolbar (zoom, layers, center)
   - [ ] Loading states
   - [ ] Error handling (no location, API failures)

**Deliverables:**

- ✅ Interactive map showing itinerary places
- ✅ User location visible on map
- ✅ Basic map controls functional

**Testing:**

- Verify markers appear for all places
- Test permission flows on iOS/Android/Web
- Ensure map loads on slow connections

---

### 🗺️ PHASE 2: Route Visualization (Week 3)

**Goal:** Display optimized routes between places

**Tasks:**

1. **Google Directions API Integration**
   - [ ] Create backend endpoint `/api/map/generate-route`
   - [ ] Call Google Directions API with waypoints
   - [ ] Handle multi-stop routes (A → B → C → D)
   - [ ] Support multiple transport modes (walking, driving, transit)

2. **Route Storage**
   - [ ] Add `map_routes` column to itineraries table
   - [ ] Save polyline and metadata to database
   - [ ] Implement route caching (avoid duplicate API calls)

3. **Route Display**
   - [ ] Draw polyline on map between places
   - [ ] Color code by transport mode
   - [ ] Show distance and ETA for each leg
   - [ ] Numbered markers (1, 2, 3...)

4. **Manual Editing**
   - [ ] Drag markers to reorder places
   - [ ] Add custom waypoints (restaurants, photo stops)
   - [ ] Recalculate route on changes
   - [ ] Save updated route to database

5. **Multi-Day Support**
   - [ ] Generate separate routes per day
   - [ ] Day selector UI (Day 1, Day 2, Day 3)
   - [ ] Store routes array in database

**Deliverables:**

- ✅ Visual route connecting all places
- ✅ Route data persisted in database
- ✅ Manual reordering updates route
- ✅ Multi-day trips supported

**Testing:**

- Test routes with 2, 5, and 10+ waypoints
- Verify route recalculates on marker drag
- Check database stores complete route data

---

### 📍 PHASE 3: Geofencing & Visit Tracking (Week 4-5)

**Goal:** Detect when users arrive/leave places

**Tasks:**

1. **Geofence Setup**
   - [ ] Create `visit_logs` table in database
   - [ ] Create `active_geofences` table
   - [ ] Build geofence creation service
   - [ ] Determine radius per place type (museum: 75m, park: 150m)

2. **Background Location Tracking**
   - [ ] Implement `BackgroundTracker` class
   - [ ] Mobile: Use `react-native-background-geolocation`
   - [ ] Desktop: Polling-based distance checking
   - [ ] Battery optimization (reduce frequency when idle)

3. **Entry Detection**
   - [ ] Calculate distance to all geofences
   - [ ] Trigger `onGeofenceEnter` when user crosses boundary
   - [ ] Create visit log in database (status: "in_progress")
   - [ ] Start visit timer

4. **Exit Detection**
   - [ ] Trigger `onGeofenceExit` when user leaves boundary
   - [ ] Calculate time spent
   - [ ] Update visit log with exit time
   - [ ] Determine if visit is complete (>70% of expected duration)

5. **Visit Status Management**
   - [ ] Implement state machine: pending → in_progress → completed
   - [ ] Manual override: "Mark Complete" / "Skip Place"
   - [ ] Sync visit status across devices

6. **Edge Cases**
   - [ ] Handle overlapping geofences (two places close together)
   - [ ] GPS signal loss (use last known location)
   - [ ] App closed mid-visit (restore state on reopen)

**Deliverables:**

- ✅ Geofences created for all itinerary places
- ✅ App detects user arrival at places
- ✅ Tracks time spent at each location
- ✅ Detects departure and updates status

**Testing:**

- Simulate GPS locations using dev tools
- Test with overlapping geofences (50m apart)
- Verify visit logs saved correctly
- Test background tracking (app minimized)

---

### 🔔 PHASE 4: Smart Notifications (Week 6)

**Goal:** Guide users with timely, contextual alerts

**Tasks:**

1. **Notification Infrastructure**
   - [ ] Setup Firebase Cloud Messaging (FCM)
   - [ ] Implement `NotificationService` for mobile
   - [ ] Implement `BrowserNotificationService` for desktop
   - [ ] Request notification permissions

2. **Notification Types**
   - [ ] **Arrival:** "Arrived at [Place]!"
   - [ ] **Departure:** "Leaving already? Mark complete?"
   - [ ] **Next Place:** "Next: [Place] - 1.2km away"
   - [ ] **Time Warning:** "2 hours here. Ready to move on?"
   - [ ] **Off Route:** "You're off the planned route"
   - [ ] **Completion:** "Trip complete! 🎊"

3. **Interactive Notifications**
   - [ ] Add action buttons ([Complete] [Skip] [Navigate])
   - [ ] Handle button taps (update database, navigate app)
   - [ ] Deeplinks to relevant app screens

4. **User Preferences**
   - [ ] Settings page: Enable/disable notification types
   - [ ] Frequency control (don't spam)
   - [ ] Quiet hours (e.g., 10 PM - 8 AM)
   - [ ] Save preferences to user profile

5. **Backend Push Service**
   - [ ] Server endpoint to send push notifications
   - [ ] Queue system for delayed notifications
   - [ ] Handle FCM token refresh

**Deliverables:**

- ✅ Push notifications sent on visit events
- ✅ Interactive actions work (mark complete, navigate)
- ✅ Users can customize notification settings

**Testing:**

- Test all notification types
- Verify actions update database correctly
- Test notification persistence (appear even if app closed)
- Check notification sound/vibration

---

### 🔍 PHASE 5: Map Search & Manual Creation (Week 7)

**Goal:** Let users search and build itineraries from map

**Tasks:**

1. **Place Search**
   - [ ] Add search bar to map UI
   - [ ] Integrate Google Places Autocomplete
   - [ ] Display search results as markers
   - [ ] Filter by category (restaurants, attractions, hotels)

2. **Add to Itinerary**
   - [ ] Tap search result → "Add to Itinerary" button
   - [ ] Choose position in route (before/after existing place)
   - [ ] Auto-recalculate route with new place

3. **Manual Itinerary Builder**
   - [ ] "Create Custom Route" mode
   - [ ] Click map to add waypoints
   - [ ] Drag to reorder
   - [ ] Name and describe each stop
   - [ ] Save as draft or confirm

4. **Nearby Discovery**
   - [ ] "Show nearby restaurants" button (at current location)
   - [ ] "Coffee shops within 500m" (while visiting a place)
   - [ ] Quick add to itinerary from suggestions

5. **Place Details**
   - [ ] Show full place info (photos, reviews, hours)
   - [ ] Fetch from Google Places API
   - [ ] Display in modal/bottom sheet

**Deliverables:**

- ✅ Search for places on map
- ✅ Add custom places to itinerary
- ✅ Build itinerary entirely from map interface
- ✅ Discover nearby places on-the-go

**Testing:**

- Test search with various queries
- Verify new places integrate into route
- Test nearby discovery at different locations
- Check place details accuracy

---

### 📊 PHASE 6: Progress & Analytics (Week 8)

**Goal:** Visualize trip progress and provide insights

**Tasks:**

1. **Progress Dashboard**
   - [ ] Build "Trip Progress" screen
   - [ ] Visual indicator: 5/10 places visited
   - [ ] Time on schedule vs actual
   - [ ] Distance traveled vs planned
   - [ ] Budget tracker (spent vs allocated)

2. **Visit History**
   - [ ] List all visited places with timestamps
   - [ ] Show time spent at each
   - [ ] User ratings (1-5 stars)
   - [ ] Notes and photos per visit

3. **Map Replay**
   - [ ] "Replay Trip" feature
   - [ ] Animate user's actual path on map
   - [ ] Compare planned route vs actual
   - [ ] Heatmap of time spent

4. **Post-Trip Summary**
   - [ ] Auto-generate trip summary card
   - [ ] Stats: total distance, time, places visited
   - [ ] Favorite places (highest rated)
   - [ ] Export as PDF/image
   - [ ] Share on social media

5. **Analytics (Admin)**
   - [ ] Most popular destinations
   - [ ] Average time spent per place type
   - [ ] Route completion rates
   - [ ] User engagement metrics

**Deliverables:**

- ✅ Real-time progress tracking during trip
- ✅ Comprehensive visit history
- ✅ Trip replay and visualization
- ✅ Shareable trip summary

**Testing:**

- Complete a test trip end-to-end
- Verify all stats calculate correctly
- Test replay animation smoothness
- Validate export functionality

---

## 6. Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Desktop (Web)              │  Mobile (React Native)        │
│  - React + Next.js          │  - React Native               │
│  - Google Maps JS API       │  - react-native-maps          │
│  - Browser Geolocation      │  - Geolocation Service        │
│  - Web Notifications        │  - Push Notifications         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  LocationService       │  GeofencingService                 │
│  NotificationService   │  BackgroundTracker                 │
│  MapService            │  RouteCalculator                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND (Node.js)                     │
├─────────────────────────────────────────────────────────────┤
│  Express Server (Port 4000)                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Routes:                                               │ │
│  │  /api/map/generate-route                             │ │
│  │  /api/tracking/start                                 │ │
│  │  /api/tracking/update-location                       │ │
│  │  /api/visits/log                                     │ │
│  │  /api/notifications/send                             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Tables:                                               │ │
│  │  - itineraries                                        │ │
│  │    └─ map_routes (JSONB)                             │ │
│  │  - visit_logs                                         │ │
│  │  - active_geofences                                   │ │
│  │  - user_devices (FCM tokens)                          │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                        │
├─────────────────────────────────────────────────────────────┤
│  Google Maps APIs:                                          │
│  - Directions API (route calculation)                       │
│  - Places API (search, autocomplete)                        │
│  - Geocoding API (address ↔ coordinates)                   │
│                                                             │
│  Firebase:                                                  │
│  - Cloud Messaging (push notifications)                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Visit Tracking

```
1. User starts trip
   └─> App requests location permission
       └─> Geofences created for all places
           └─> Background tracking starts

2. User moves toward Place A
   └─> Location updates every 5 seconds
       └─> Distance to Place A calculated
           └─> Distance < 100m → ENTER event
               └─> Visit log created (status: in_progress)
                   └─> Notification sent: "Arrived!"
                       └─> UI updates: Place A highlighted

3. User explores Place A (30 minutes)
   └─> Location tracked in background
       └─> Timer running in visit log

4. User leaves Place A
   └─> Distance > 100m → EXIT event
       └─> Time spent: 30 minutes (expected: 1 hour)
           └─> Check: 30 < 60 (not complete)
               └─> Notification: "Leaving early? Mark complete?"
                   └─> User taps "Mark Complete"
                       └─> Visit log updated (status: completed)
                           └─> Next place focused on map

5. All places visited
   └─> Trip summary generated
       └─> Notification: "Trip complete! 🎊"
```

---

## 7. User Journey Walkthrough

### Before Trip

**1. Create Itinerary**

- User: "I want to visit Paris, Rome, and Venice for 7 days"
- AI generates clustering view with places grouped by city
- User selects desired places

**2. Confirm Itinerary**

- User reviews selected places
- Clicks "Generate Itinerary"
- AI creates day-by-day schedule

**3. Route Generation**

- Backend calls Google Directions API
- Generates walking route between places
- Saves route polyline to database
- Displays route on map

**4. Review Map**

- User views all places as numbered markers
- Sees estimated walking times
- Can reorder places by dragging markers

---

### During Trip

**5. Start Trip**

- User taps "Start Trip" button
- App requests location permission
- Background tracking begins
- Geofences created around all places

**6. Navigate to First Place**

- Map shows route from current location → Eiffel Tower
- Distance: 2.3km, ETA: 25 minutes
- User follows route

**7. Arrival at Place A (Eiffel Tower)**

- User enters 100m geofence
- **Notification:** "Arrived at Eiffel Tower! 🎉 Enjoy your visit."
- Visit log created: `{ entered_at: 10:30 AM, status: 'in_progress' }`
- Map marker changes to "currently visiting" state
- Timer starts (expected: 2 hours)

**8. During Visit**

- User explores Eiffel Tower
- Location tracked every 5 minutes
- App runs in background (user can use camera, etc.)

**9. Time Warning (Optional)**

- After 2 hours (expected duration)
- **Notification:** "You've been here for 2 hours. Ready to move on?"
- Actions: [Complete Visit] [Stay Longer]

**10. Exit Place A**

- User walks away, exits geofence
- Time spent: 1 hour 45 minutes
- Visit log updated: `{ exited_at: 12:15 PM, time_spent: 6300s, status: 'completed' }`
- **Notification:** "Visit complete! ✅ Next: Louvre Museum (1.2km, 15 min walk)"
- Map auto-focuses on next place

**11. Navigate to Place B**

- Route updates: Current location → Louvre
- Blue line shows path
- User follows directions

**12. Repeat for All Places**

- Arrive → Notification → Track time → Exit → Next place
- Progress bar: "3/5 places visited"

---

### After Trip

**13. Trip Complete**

- Last place visited and exited
- **Notification:** "Trip complete! 🎊 You visited 5 amazing places!"
- Trip summary auto-generated

**14. View Summary**

- Total distance: 12.5km
- Total time: 8 hours 23 minutes
- Places visited: 5/5 ✅
- Favorite place: Louvre (rated 5 stars)
- Total cost: $89 (vs $100 budget)

**15. Share Trip**

- Export summary as image
- Share on social media
- Send itinerary link to friends

---

## 8. Key Technologies & Tools

### Frontend

**Desktop (Web):**

- **Framework:** React + Next.js 16
- **Maps:** Google Maps JavaScript API or Mapbox GL JS
- **Location:** Browser Geolocation API
- **Notifications:** Web Notifications API
- **Styling:** Tailwind CSS

**Mobile (React Native):**

- **Framework:** React Native (or Expo)
- **Maps:** `react-native-maps` (iOS/Android native maps)
- **Location:** `react-native-geolocation-service` or `expo-location`
- **Geofencing:** `react-native-geofencing` or `react-native-background-geolocation`
- **Notifications:** `@react-native-firebase/messaging` + `react-native-push-notification`
- **Background Tasks:** `react-native-background-fetch`

### Backend

- **Server:** Node.js + Express 5
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT (already implemented)
- **APIs:**
  - Google Maps Directions API
  - Google Places API
  - Google Geocoding API
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Cron Jobs:** `node-cron` (for reminders, cleanup)

### External Services

- **Google Cloud Platform:**
  - Maps JavaScript API
  - Directions API
  - Places API
  - Geocoding API
- **Firebase:**
  - Cloud Messaging (FCM)
  - Analytics (optional)

### Development Tools

- **Testing:** Jest, React Native Testing Library
- **Debugging:** React Native Debugger, Chrome DevTools
- **GPS Simulation:**
  - iOS: Xcode Location Simulation
  - Android: Android Studio Location Mocking
  - Web: Browser DevTools Geolocation Override
- **Version Control:** Git + GitHub

---

## 9. Database Schema Extensions

### New Tables

```sql
-- Visit logs for tracking user activity
CREATE TABLE visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  place_id VARCHAR NOT NULL,
  place_name VARCHAR NOT NULL,
  
  -- Timing
  entered_at TIMESTAMP,
  exited_at TIMESTAMP,
  time_spent INTEGER, -- seconds
  expected_duration INTEGER, -- seconds
  
  -- Status
  status VARCHAR DEFAULT 'pending', -- pending, in_progress, completed, skipped
  
  -- Location
  entry_location JSONB, -- {lat, lng, accuracy}
  exit_location JSONB,
  
  -- User input
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  photos JSONB, -- array of URLs
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active geofences for tracking
CREATE TABLE active_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  place_id VARCHAR NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL, -- meters
  status VARCHAR DEFAULT 'active', -- active, triggered, expired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User device tokens for push notifications
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  fcm_token VARCHAR NOT NULL,
  platform VARCHAR NOT NULL, -- ios, android, web
  app_version VARCHAR,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, fcm_token)
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id VARCHAR PRIMARY KEY,
  arrival_notifications BOOLEAN DEFAULT TRUE,
  departure_notifications BOOLEAN DEFAULT TRUE,
  time_warning_notifications BOOLEAN DEFAULT TRUE,
  off_route_notifications BOOLEAN DEFAULT TRUE,
  next_place_notifications BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME, -- e.g., '22:00:00'
  quiet_hours_end TIME, -- e.g., '08:00:00'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_visit_logs_user ON visit_logs(user_id);
CREATE INDEX idx_visit_logs_itinerary ON visit_logs(itinerary_id);
CREATE INDEX idx_visit_logs_status ON visit_logs(status);
CREATE INDEX idx_active_geofences_itinerary ON active_geofences(itinerary_id);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);
```

### Modified Tables

```sql
-- Add map route storage to itineraries
ALTER TABLE itineraries ADD COLUMN map_routes JSONB;
ALTER TABLE itineraries ADD COLUMN transport_mode VARCHAR DEFAULT 'walking';
ALTER TABLE itineraries ADD COLUMN trip_status VARCHAR DEFAULT 'planning'; 
-- planning, active, completed, cancelled

-- Add geofence radius to places (if you have a places table)
-- ALTER TABLE places ADD COLUMN geofence_radius INTEGER DEFAULT 75;

-- Create index for JSONB queries
CREATE INDEX idx_itineraries_map_routes ON itineraries USING GIN (map_routes);
```

---

## 10. Future Features (Post-MVP)

### Trip Sharing

- **Share itinerary link:** Public URL with read-only access
- **Real-time location sharing:** Friends can see your live location during trip
- **Collaborative planning:** Multiple users edit same itinerary
- **Comments:** Friends can leave notes on places

### Offline Mode

- **Download maps:** Cache map tiles for offline viewing
- **Offline routing:** Store routes locally
- **Queue updates:** Sync visit logs when back online

### Augmented Reality (AR)

- **AR Navigation:** Point camera, see arrows overlaid on real world
- **AR Place Info:** Point at landmark, see details in AR
- **Photo opportunities:** AR markers for best photo spots

### Social Features

- **Check-ins:** Post to social media when visiting places
- **Photo albums:** Auto-organize trip photos by place
- **Trip feed:** See friends' trips and places
- **Recommendations:** "10 people liked this restaurant"

### Smart Suggestions

- **Context-aware:** "30 min free time? Coffee shop 200m away"
- **Weather-based:** "Rain predicted. Indoor alternatives?"
- **Crowd detection:** "Eiffel Tower is crowded. Visit later?"
- **Budget alerts:** "60% budget spent. Adjust remaining?"

### Advanced Analytics

- **Travel patterns:** "You love museums! Here are 5 more."
- **Time optimization:** "Visit Louvre in morning to avoid crowds"
- **Cost prediction:** "This trip will likely cost $250"
- **Personalized ranking:** "Top 10 places based on your history"

### Gamification

- **Badges:** "Visited 10 museums! 🏛️"
- **Leaderboards:** "Most cities visited this year"
- **Challenges:** "Visit 5 UNESCO sites in 1 month"
- **Rewards:** Discounts for frequent travelers

---

## 11. Implementation Priorities (Must-Have vs Nice-to-Have)

### 🚨 MUST-HAVE (MVP - Minimum Viable Product)

1. **Map Display** - Show itinerary places on map
2. **User Location** - Display current location
3. **Route Visualization** - Draw path between places
4. **Visit Detection** - Detect arrival/departure automatically
5. **Basic Notifications** - Alert on arrival and departure
6. **Progress Tracking** - Show X/Y places visited
7. **Manual Completion** - User can mark places as visited

**Timeline:** 6 weeks

---

### ✅ SHOULD-HAVE (Enhanced Experience)

1. **Interactive Notifications** - Actions like "Mark Complete"
2. **Time Tracking** - Track how long spent at each place
3. **Off-Route Detection** - Alert when user deviates
4. **Map Search** - Add places from map search
5. **Visit History** - See all past visits with timestamps
6. **Multi-Day Support** - Separate routes per day

**Timeline:** +2 weeks (Total: 8 weeks)

---

### 🌟 NICE-TO-HAVE (Future Enhancements)

1. **Trip Sharing** - Share itinerary with friends
2. **AR Navigation** - Augmented reality directions
3. **Offline Maps** - Download for offline use
4. **Social Features** - Check-ins, photo sharing
5. **Smart Suggestions** - Context-aware recommendations
6. **Analytics Dashboard** - Travel insights
7. **Gamification** - Badges, challenges, rewards

**Timeline:** Post-launch (Months 3-6)

---

## 12. Success Metrics

**User Engagement:**

- % of users who enable location tracking
- Average number of places visited per trip
- Trip completion rate (finished all places)
- Daily active users during trips

**Feature Usage:**

- Notification tap rate (how many users interact with alerts)
- Manual vs automatic visit completion ratio
- Map search usage frequency
- Route editing frequency

**Performance:**

- Location update accuracy (deviation from actual GPS)
- Battery impact (% drain per hour of tracking)
- Visit detection latency (seconds to detect arrival)
- Notification delivery success rate

**Business Metrics:**

- User retention (7-day, 30-day)
- Trip creation to completion rate
- Average trip duration
- User ratings/feedback

---

## 13. Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Battery drain from GPS | High | High | Reduce update frequency, optimize geofencing |
| Poor GPS accuracy indoors | Medium | High | Increase geofence radius, manual override |
| Google Maps API costs | High | Medium | Cache routes, implement usage limits |
| User privacy concerns | High | Low | Clear permissions, opt-in tracking, data encryption |
| Network connectivity issues | Medium | Medium | Offline mode, queue updates |
| Device compatibility | Medium | Medium | Test on wide range of devices, graceful degradation |
| Notification fatigue | Medium | High | User preferences, frequency limits, smart triggers |

---

## 14. Development Team & Roles

**Recommended Team Structure:**

- **Frontend Developer (Web)** - React/Next.js, Google Maps integration
- **Mobile Developer** - React Native, native modules, geofencing
- **Backend Developer** - Node.js, API design, database optimization
- **UX/UI Designer** - Map interfaces, notification design, user flows
- **QA Tester** - GPS simulation, edge case testing, device testing
- **Project Manager** - Timeline tracking, feature prioritization

**Your Current Setup:**

- You (Full-stack focus) - Can handle all phases with focused effort

**Estimated Effort:**

- **Solo Development:** 8-10 weeks for MVP (Phases 1-4)
- **With Team:** 4-6 weeks for MVP

---

## 15. Next Steps (Action Items)

### Immediate (This Week)

1. ✅ Review this implementation plan
2. [ ] Set up Google Maps API account and get API keys
3. [ ] Install required libraries (react-native-maps, geolocation)
4. [ ] Create database tables (visit_logs, active_geofences)
5. [ ] Set up Firebase project for push notifications

### Week 1-2 (Phase 1)

1. [ ] Implement `MapComponent` for desktop
2. [ ] Implement `MapComponent` for mobile
3. [ ] Add location permission flow
4. [ ] Display itinerary places as markers
5. [ ] Show user's current location

### Week 3 (Phase 2)

1. [ ] Build `/api/map/generate-route` endpoint
2. [ ] Call Google Directions API
3. [ ] Display route polyline on map
4. [ ] Save route to database

### Week 4-5 (Phase 3)

1. [ ] Create `BackgroundTracker` service
2. [ ] Implement geofence creation logic
3. [ ] Build visit detection (entry/exit)
4. [ ] Save visit logs to database

### Week 6 (Phase 4)

1. [ ] Set up Firebase Cloud Messaging
2. [ ] Implement `NotificationService`
3. [ ] Add notification triggers
4. [ ] Test interactive notifications

---

## 16. Resources & Documentation

**Official Documentation:**

- [Google Maps API Docs](https://developers.google.com/maps/documentation)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [React Native Geolocation](https://github.com/Agontuk/react-native-geolocation-service)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Docs](https://supabase.com/docs)

**Tutorials:**

- [Building a Location Tracker with React Native](https://www.example.com)
- [Geofencing in React Native](https://www.example.com)
- [Push Notifications Setup](https://www.example.com)

**Tools:**

- [GPS Simulator (Xcode)](https://developer.apple.com/documentation/xcode/simulating-location-updates)
- [Android Location Mocking](https://developer.android.com/studio/debug/dev-options)
- [Postman (API Testing)](https://www.postman.com/)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building location-based travel tracking into Project Odyssey. By following the phased approach, you'll create a robust system that works across desktop and mobile, tracks user visits automatically, and provides intelligent guidance throughout trips.

**Key Takeaways:**

- Start with map visualization (Phase 1-2) to establish foundation
- Core value is in visit tracking (Phase 3) - prioritize this
- Notifications (Phase 4) enhance user experience significantly
- Keep it simple initially - add advanced features post-MVP
- Test extensively with real-world trips

**Timeline Summary:**

- **MVP (Phases 1-4):** 6 weeks
- **Enhanced (Phases 5-6):** +2 weeks
- **Total:** 8 weeks to full-featured location tracking

**Next Action:** Set up Google Maps API and Firebase, then start Phase 1 implementation.

---

## APPENDIX: 2-Day Demo Sprint Plan (Feature-Based Teams)

### Overview

This appendix provides an accelerated implementation strategy for teams with limited time (2 days) who need to deliver a working demo. Unlike the 8-week phased approach above, this plan uses **feature-based full-stack teams** where each group owns their feature end-to-end (database → backend → frontend).

**Team Structure:**

- **Group 1 (Map Search & Manual Builder)**: 2 people - Map search, place discovery, manual itinerary creation, route visualization
- **Group 2 (Visit Tracking)**: 2 people - Geofencing, visit detection, check-in/out
- **Group 3 (Progress & Notifications)**: 2 people - Dashboard, notifications, trip summary

**Key Principle:** Each group owns their feature completely, enabling parallel development with minimal conflicts.

**⚠️ WORKFLOW PRIORITY:** Group 1's map search feature is built FIRST as it's the foundation for manual itinerary planning. Groups 2 and 3 can work in parallel using AI-generated itineraries for testing, then integrate with manual itineraries on Day 2.

---

### Pre-Sprint Setup (Hour 0 - 1 hour, All Teams)

#### Shared Foundation

**1. Create shared types file** - `types/shared.types.ts`

```typescript
export interface Location {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  coordinates: Location;
  category: string;
  visitDurationMin: number;
}

export interface Itinerary {
  id: string;
  user_id: string;
  trip_name: string;
  selected_places: Place[];
}
```

**2. Create Git branches:**

- `feature/map-routes` (Group 1)
- `feature/visit-tracking` (Group 2)
- `feature/progress-notifications` (Group 3)

**3. Define API namespace to avoid conflicts:**

- Group 1: `/api/map/*`
- Group 2: `/api/visits/*`
- Group 3: `/api/progress/*` and `/api/notifications/*`

**4. UI Layout agreement:**

- Group 1: Tab/modal called "Map Builder" (PRIMARY - shown first)
- Group 2: Tab/modal called "Active Trip"
- Group 3: Tab/modal called "Trip Progress"

   **Navigation flow:**

- Landing → Planner → "Map Builder" tab OR "AI Assistant" tab
- Map Builder → Create manual itinerary → Active Trip → Progress
- AI Assistant → Generate itinerary → Active Trip → Progress

---

### Day 1: Parallel Full-Stack Development

**⚠️ IMPORTANT WORKFLOW NOTE:**

Group 1 is building the foundation (map search + manual builder) that enables core functionality. Groups 2 and 3 should:

1. **Morning:** Use existing AI-generated itineraries for development and testing
2. **Afternoon:** Begin integration with Group 1's map search API
3. **Evening:** Full integration with manual itineraries

This approach ensures all groups can work in parallel without blocking each other.

#### 🗺️ GROUP 1: Map Search & Manual Itinerary Builder (Foundation Feature)

**Scope:** Map search, place discovery, manual itinerary creation, and route visualization

**⚠️ PRIORITY: This feature is built FIRST as it enables manual itinerary planning**

**Database (30 min):**

```sql
-- server/sql/map_routes_schema.sql
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS map_routes JSONB;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS transport_mode VARCHAR DEFAULT 'walking';
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS creation_method VARCHAR DEFAULT 'ai'; -- 'ai' or 'manual'

CREATE INDEX IF NOT EXISTS idx_itineraries_map_routes 
ON itineraries USING GIN (map_routes);

-- Cache search results for performance
CREATE TABLE IF NOT EXISTS place_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query VARCHAR NOT NULL,
  place_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_place_search_query ON place_search_cache(search_query);
```

**Backend (3.5 hours):**

- [ ] `server/src/routes/mapRoutes.js` - Map and search API

```javascript
POST /api/map/search-places (Google Places Autocomplete)
GET /api/map/place-details/:placeId (Get full place info)
POST /api/map/nearby-search (Find nearby places)
POST /api/map/generate-route (Generate route from places)
GET /api/map/route/:itineraryId
PUT /api/map/route/:itineraryId (update waypoint order)
POST /api/map/create-manual-itinerary (Create from selected places)
```

- [ ] `server/src/services/googleMapsService.js` - Google Maps API wrapper
  - Places Autocomplete
  - Place Details
  - Nearby Search
  - Directions API
- [ ] `server/src/services/placeSearchService.js` - Search caching logic
- [ ] Store route polyline, distance, duration in database

**Agent prompt:**

```
"Create Express API for Google Places search with endpoints: 
1) /api/map/search-places - accepts query string, calls Google Places 
   Autocomplete, returns place predictions with name, address, coordinates
2) /api/map/place-details/:placeId - fetches full place info (photos, 
   reviews, hours, category)
3) /api/map/nearby-search - accepts lat/lng and radius, returns nearby 
   places by category
4) /api/map/create-manual-itinerary - accepts array of selected places, 
   creates itinerary with creation_method='manual'
Include caching, error handling, and TypeScript types."
```

**Frontend (5 hours):**

- [ ] `client/odyssey/components/MapSearch.tsx` - Search bar with autocomplete
- [ ] `client/odyssey/components/MapView.tsx` - Google Maps component
- [ ] `client/odyssey/components/PlaceDetailsModal.tsx` - Show place info
- [ ] `client/odyssey/components/ManualItineraryBuilder.tsx` - Build itinerary from map
- [ ] `client/odyssey/services/mapService.ts` - API calls
- [ ] Search functionality:
  - Search bar with Google Places Autocomplete
  - Display search results as markers
  - Click marker → show place details
  - "Add to Itinerary" button on each place
- [ ] Manual itinerary creation:
  - Selected places list (sidebar)
  - Drag to reorder places
  - Remove place from list
  - "Create Itinerary" button
- [ ] Route visualization:
  - Draw polyline between selected places
  - Show distance and duration
  - Display user's current location (blue dot)
- [ ] Nearby discovery:
  - "Find nearby restaurants" button
  - Filter by category (food, attractions, hotels)

**Agent prompt:**

```
"Create React map interface with Google Maps that includes:
1) Search bar using Google Places Autocomplete - shows dropdown suggestions
2) Click result → adds marker to map and shows details modal with photos, 
   rating, address, 'Add to Itinerary' button
3) Sidebar showing selected places list with drag-to-reorder (use dnd-kit), 
   remove buttons, and 'Create Itinerary' button at bottom
4) When places selected, draw polyline route between them in order
5) 'Nearby Places' dropdown with categories (Restaurants, Attractions, Hotels) 
   that searches within 1km radius
6) Show user's current location as blue pulsing dot
TypeScript + Tailwind + dnd-kit for drag-drop."
```

**Integration (1.5 hours):**

- [ ] Add "Map Builder" as PRIMARY tab in planner page
- [ ] Create new route: `/planner/map-builder`
- [ ] Test: Search → Select places → Reorder → Create itinerary → View route
- [ ] Mock Google API if quota exceeded (use sample data)
- [ ] Connect to existing itinerary system (save to database)

**Deliverables:**
✅ Google Places search integration working
✅ Search results display as map markers
✅ Place details modal with full info
✅ Manual itinerary builder with drag-to-reorder
✅ "Add to Itinerary" functionality
✅ Route generation for selected places
✅ Database stores manually-created itineraries
✅ Nearby places discovery
✅ User location visible

---

#### 📍 GROUP 2: Visit Tracking & Detection (Complete Feature)

**Scope:** Track when user visits places, manual check-in/out, visit logs

**Database (30 min):**

```sql
-- server/sql/visit_tracking_schema.sql
CREATE TABLE IF NOT EXISTS visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  place_id VARCHAR NOT NULL,
  place_name VARCHAR NOT NULL,
  entered_at TIMESTAMP,
  exited_at TIMESTAMP,
  time_spent INTEGER, -- seconds
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visit_logs_itinerary ON visit_logs(itinerary_id);
CREATE INDEX idx_visit_logs_status ON visit_logs(status);
```

**Backend (3 hours):**

- [ ] `server/src/routes/visitRoutes.js` - Visit tracking API

```javascript
POST /api/visits/check-in
POST /api/visits/check-out
GET /api/visits/logs/:itineraryId
GET /api/visits/current/:itineraryId
DELETE /api/visits/:visitId (skip place)
```

- [ ] `server/src/models/VisitLog.js` - Database operations
- [ ] `server/src/services/visitTracker.js` - Visit timing logic

**Agent prompt:**

```
"Create Express API for visit tracking with check-in endpoint that 
creates visit_log record with entered_at timestamp and status 
'in_progress', check-out endpoint that updates exited_at and calculates 
time_spent in seconds, and GET endpoint that returns all visit logs for 
an itinerary. Include Supabase queries."
```

**Frontend (4 hours):**

- [ ] `client/odyssey/app/trip/[id]/page.tsx` - Active trip view
- [ ] `client/odyssey/components/PlaceVisitCard.tsx` - Card with check-in button
- [ ] `client/odyssey/services/visitService.ts` - API calls
- [ ] Manual "Check In" / "Check Out" buttons
- [ ] Live timer showing time at current place
- [ ] Visual status: Pending → In Progress → Completed

**Agent prompt:**

```
"Create React component that displays itinerary places as cards, shows 
visit status with color coding (gray=pending, blue=in-progress, 
green=completed), includes Check In/Out buttons that call /api/visits 
endpoints, displays live timer for current visit using useEffect. 
TypeScript + Tailwind."
```

**Integration (1 hour):**

- [ ] Add "Active Trip" tab to planner
- [ ] Test: Check in → Timer starts → Check out → Status updates
- [ ] Handle edge cases (check-in twice, check-out without check-in)

**Deliverables:**
✅ Database stores visit logs
✅ API tracks check-in/out with timestamps
✅ UI shows current visit status
✅ Manual check-in buttons work
✅ Timer displays time spent

---

#### 🔔 GROUP 3: Progress Dashboard & Notifications (Complete Feature)

**Scope:** Show trip progress, send notifications, trip summary

**Database (30 min):**

```sql
-- server/sql/progress_schema.sql
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id VARCHAR PRIMARY KEY,
  arrival_enabled BOOLEAN DEFAULT TRUE,
  departure_enabled BOOLEAN DEFAULT TRUE,
  browser_notifications_enabled BOOLEAN DEFAULT FALSE
);

-- Optional: notification logs for analytics
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Backend (3 hours):**

- [ ] `server/src/routes/progressRoutes.js` - Progress API

```javascript
GET /api/progress/:itineraryId (completion %, time stats)
GET /api/progress/summary/:itineraryId (final summary)
POST /api/notifications/send (trigger notification)
GET /api/notifications/preferences/:userId
PUT /api/notifications/preferences/:userId
```

- [ ] `server/src/services/progressCalculator.js` - Stats calculation
- [ ] Calculate: places visited, distance traveled, time spent

**Agent prompt:**

```
"Create Express endpoint /api/progress/:itineraryId that fetches visit 
logs from database, calculates percentage completed (visited/total places), 
total time spent (sum of all time_spent), returns JSON with stats. Include 
endpoint for trip summary with total distance from map_routes."
```

**Frontend (4 hours):**

- [ ] `client/odyssey/components/ProgressBar.tsx` - Visual progress
- [ ] `client/odyssey/components/TripSummary.tsx` - Stats card
- [ ] `client/odyssey/services/notificationService.ts` - Browser notifications
- [ ] Request notification permissions on trip start
- [ ] Show notification on check-in: "Arrived at [Place]!"
- [ ] Confetti animation on trip completion

**Agent prompt:**

```
"Create React dashboard with circular progress bar showing X/Y places 
visited, stats cards for total time and distance, Browser Notification 
wrapper that requests permission and sends notifications, confetti 
animation using react-confetti when progress reaches 100%. TypeScript + 
Tailwind + Framer Motion."
```

**Integration (1 hour):**

- [ ] Add "Progress" tab to planner
- [ ] Listen to check-in events → trigger notification
- [ ] Test: Complete all visits → Summary appears with confetti
- [ ] Export summary as screenshot/PDF

**Deliverables:**
✅ Database stores notification preferences
✅ API calculates progress statistics
✅ Progress bar updates in real-time
✅ Browser notifications on check-in
✅ Trip summary with stats
✅ Confetti on completion

---

### Day 1 Evening: Quick Integration (1 hour)

**Integration Points:**

1. **Group 2 → Group 3**: Visit check-in triggers progress update and notification
2. **Group 1 → Group 2**: Map highlights currently visited place
3. **All Groups**: Test full flow end-to-end

**Merge Strategy:**

```bash
# Evening merge order
git checkout develop
git merge feature/map-routes        # Group 1 (foundation)
git merge feature/visit-tracking    # Group 2 (depends on itineraries)
git merge feature/progress-notifications # Group 3 (depends on visit_logs)
```

**Quick Fixes Only** - Major bugs addressed Day 2 morning

---

### Day 2: Integration, Polish & Demo Prep

#### Morning (4 hours): Cross-Feature Integration

**All Groups Together:**

**Integration Task 1: Connect Map ↔ Visit Tracking**

- [ ] Map highlights current place being visited (blue border)
- [ ] Map shows checkmarks on completed places
- [ ] Click marker → shows visit status

**Integration Task 2: Connect Visits ↔ Notifications**

- [ ] Check-in triggers notification immediately
- [ ] Progress bar updates on status change
- [ ] Notification shows next place info

**Integration Task 3: Complete User Flow**

- [ ] Create itinerary → Generate route → Start trip → Check in → Progress updates → Complete all → Summary

**Agent prompt (all groups):**

```
"Add event listener that detects when check-in API succeeds, then 
triggers both map marker highlight and browser notification. Update 
progress bar using context/state management. Show example with React 
Context or Zustand."
```

**Conflict Resolution:**

- [ ] Test all features together
- [ ] Fix any API response mismatches
- [ ] Ensure consistent state across tabs

---

#### Afternoon (4 hours): Demo Polish

**Group 1 (Map):**

- [ ] Add "Start Trip" button that enables tracking mode
- [ ] Auto-center on user location
- [ ] Add distance/time labels on route
- [ ] Demo mode: Simulate GPS movement between places
- [ ] Loading states and smooth animations

**Agent prompt:**

```
"Add demo mode toggle that simulates GPS location moving along route 
polyline from place to place at 5-second intervals, triggering check-in 
automatically when reaching each place. Include speed control slider."
```

**Group 2 (Tracking):**

- [ ] Add "Skip Place" option
- [ ] Time spent displays as "2h 15m" format
- [ ] Add place photos/images to cards
- [ ] Smooth status transitions with animations
- [ ] Empty state: "Start your trip!"

**Agent prompt:**

```
"Add skip functionality that marks place as 'skipped' status with gray 
strikethrough styling, formats time_spent as human-readable (e.g., 
'2h 15m'), includes Framer Motion animations for status changes."
```

**Group 3 (Progress):**

- [ ] Enhanced trip summary card (beautiful design)
- [ ] Export summary as image (html2canvas)
- [ ] Share button (copy link, social media)
- [ ] Add achievements/badges ("Speed Tourist", "Explorer")
- [ ] Smooth number counting animations

**Agent prompt:**

```
"Create stunning trip summary card with gradient background, stats 
with counting animation using react-countup, export to image using 
html2canvas, include share buttons for Twitter/Facebook with pre-filled 
text. Make it Instagram-worthy."
```

---

#### Evening (2 hours): Demo Rehearsal & Backup Plan

**Demo Script (10 minutes):**

**1. Intro (30 sec):**

- "Project Odyssey: AI-powered AND manual trip planning with real-time tracking"

**2. Manual Itinerary Creation (2.5 min):**

- Click "Map Builder" tab
- Search for "Eiffel Tower, Paris" → Shows on map
- Click marker → Details modal appears with photos
- Click "Add to Itinerary" → Appears in sidebar
- Search "Louvre Museum" → Add to itinerary
- Search "Arc de Triomphe" → Add to itinerary
- Use "Nearby Restaurants" → Find lunch spot near Louvre
- Add restaurant to itinerary
- Drag places to reorder in sidebar
- Route automatically draws between places
- Click "Create Itinerary" → Saves as "My Paris Adventure"

**3. View Generated Route (1 min):**

- Route displayed with walking distances and times
- Total: 8.5km, 6-7 hours
- All 5 places marked on map

**4. Start Trip (3 min):**

- Click "Start Trip" → Goes to Active Trip view
- Enable demo mode (simulated GPS)
- Watch as location moves to first place
- Auto check-in triggers notification
- Progress bar updates: "1/5 completed"
- Timer starts counting

**5. Progress Through Places (2 min):**

- Fast-forward simulation (speed slider)
- Visit 3 more places rapidly
- Show notifications appearing
- Show map markers turning green

**6. Trip Summary (1 min):**

- Complete last place → Confetti! 🎉
- Trip summary appears with stats:
  - Distance: 8.5km
  - Time: 6h 45m
  - All 5 places completed
- Click "Share Trip" → Copy link

**7. Closing (30 sec):**

- "Future: Auto GPS tracking, mobile app, offline mode"

---

**Backup Plans:**

- [ ] Record full demo video (if live fails)
- [ ] Screenshots of each step
- [ ] Prepared dataset (pre-generated route)
- [ ] Mock notifications (if browser blocks)

---

### File Ownership (Prevent Conflicts)

#### Group 1 Files (Map & Routes)

```
server/src/
  ├── routes/mapRoutes.js          # Group 1 only
  ├── services/googleMapsService.js # Group 1 only
  
client/odyssey/
  ├── components/
  │   └── MapView.tsx               # Group 1 only
  ├── services/
  │   └── mapService.ts             # Group 1 only
  
database/
  └── map_routes_schema.sql         # Group 1 only
```

#### Group 2 Files (Visit Tracking)

```
server/src/
  ├── routes/visitRoutes.js         # Group 2 only
  ├── models/VisitLog.js            # Group 2 only
  ├── services/visitTracker.js      # Group 2 only
  
client/odyssey/
  ├── app/trip/[id]/page.tsx        # Group 2 only
  ├── components/
  │   └── PlaceVisitCard.tsx        # Group 2 only
  ├── services/
  │   └── visitService.ts           # Group 2 only
  
database/
  └── visit_tracking_schema.sql     # Group 2 only
```

#### Group 3 Files (Progress & Notifications)

```
server/src/
  ├── routes/progressRoutes.js      # Group 3 only
  ├── services/progressCalculator.js # Group 3 only
  
client/odyssey/
  ├── components/
  │   ├── ProgressBar.tsx           # Group 3 only
  │   ├── TripSummary.tsx           # Group 3 only
  │   └── NotificationBanner.tsx    # Group 3 only
  ├── services/
  │   └── notificationService.ts    # Group 3 only
  
database/
  └── progress_schema.sql           # Group 3 only
```

#### Shared Files (Coordinate in Slack)

```
server/src/server.js              # Import routes - coordinate merge
client/odyssey/app/planner/page.tsx # Add tabs - coordinate merge
types/shared.types.ts             # Add types - coordinate
```

---

### Communication Protocol

#### Slack Channels

- `#2day-sprint-general` - General coordination
- `#group1-map` - Group 1 internal
- `#group2-tracking` - Group 2 internal  
- `#group3-progress` - Group 3 internal

#### Stand-ups (15 min each)

- **9 AM:** What you'll build today
- **2 PM:** Progress check, blockers
- **6 PM:** Demo prep, integration issues

#### Integration Alerts

When your API is ready, post to #general:

```
✅ Group 1: /api/map/generate-route is LIVE
📋 Response format: { routeId, polyline, waypoints[], totalDistance }
🔗 Test endpoint: POST http://localhost:4000/api/map/generate-route
```

---

### Agent Workflow (Each Group)

#### Step-by-Step Agent Usage

**1. Database Schema (15 min):**

```
Agent Prompt: "Create PostgreSQL schema for [feature] with tables 
[table_names]. Include indexes, foreign keys, and sample INSERT 
statements. Use Supabase-compatible syntax."
```

**Group 1 Specific Workflow:**

**Phase 1 (Morning - 4 hours): Map Search Foundation**

- Search bar with Google Places Autocomplete
- Display search results as markers
- Place details modal
- Basic "Add to Itinerary" functionality

**Phase 2 (Afternoon - 3 hours): Manual Builder**

- Selected places sidebar with drag-to-reorder
- Route visualization between places
- "Create Itinerary" saves to database
- Nearby places discovery

**Phase 3 (Evening - 1 hour): Integration**

- Connect to Groups 2 & 3 APIs
- Test with visit tracking
- Ensure manual itineraries work with progress tracking

**2. Backend API (2 hours):**

```
Agent Prompt: "Create Express.js REST API for [feature] with routes 
[list routes], Supabase database integration, error handling, JWT 
authentication middleware, and TypeScript types. Include request 
validation using express-validator."
```

**3. Frontend Components (3 hours):**

```
Agent Prompt: "Create React component for [feature] that calls API 
endpoints [list], handles loading/error states, uses TypeScript, 
styled with Tailwind CSS, includes animations with Framer Motion, 
and follows our existing design system."
```

**4. Integration (1 hour):**

```
Agent Prompt: "Integrate [component] into existing planner page at 
[location], add state management, handle API errors, show toast 
notifications on success/failure."
```

#### Agent Best Practices

- ✅ Always specify: "TypeScript + Tailwind CSS + Supabase"
- ✅ Include: "Error handling and loading states"
- ✅ Request: "Follow REST API conventions"
- ✅ Ask for: "Unit tests with Jest" (if time permits)
- ✅ Iterate: Get basic version → refine → polish

---

### Risk Mitigation

| Risk | Solution |
|------|----------|
| Groups block each other | Mock APIs first, integrate later |
| Merge conflicts in server.js | Coordinate route imports in Slack |
| Google Maps API limit | Use sample polyline data, cache routes |
| Database conflicts | Each group has separate tables |
| Time runs out | Cut features: Skip trip summary, keep basic tracking |
| Agent produces buggy code | Have human review, quick manual fix |
| Demo machine fails | Backup video + screenshots |

---

### Success Metrics

**Minimum Viable Demo:**

- ✅ Map shows itinerary with route
- ✅ Manual check-in/out works
- ✅ Progress bar updates
- ✅ Notification appears on check-in
- ✅ Basic trip summary

**Impressive Demo:**

- ✅ Demo mode simulates GPS movement
- ✅ Smooth animations throughout
- ✅ Beautiful trip summary card
- ✅ Confetti celebration
- ✅ Share functionality

---

### Timeline Summary

**Pre-Sprint: 1 hour**

- Setup, define contracts, create branches

**Day 1: 10 hours**

- Full-stack development per feature
- Evening: Quick integration test

**Day 2: 10 hours**

- Morning: Cross-feature integration
- Afternoon: Polish and demo mode
- Evening: Rehearsal

**Total: 21 hours over 2 days**

---

**Key Advantage of This Approach:**
Each group delivers a **complete, working feature** independently. If integration fails, you can still demo each feature separately. Agents handle both backend and frontend, making this faster than layer-based splitting.

---

*Document Version: 1.1*  
*Last Updated: January 31, 2026*  
*Author: Project Odyssey Development Team*
