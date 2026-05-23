/**
 * Visit Tracking Types
 * TypeScript interfaces for visit logs, geofences, and related data
 */

// ==========================================
// LOCATION TYPE
// ==========================================
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number; // in meters
  altitude?: number; // in meters
  timestamp?: number; // Unix timestamp
}

// ==========================================
// VISIT LOG TYPES
// ==========================================

export type VisitStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface VisitLog {
  id: string; // UUID
  user_id: string;
  itinerary_id: string; // UUID
  place_id: string;
  place_name: string;

  // Timing
  entered_at?: string; // ISO 8601 timestamp
  exited_at?: string; // ISO 8601 timestamp
  time_spent?: number; // in seconds
  expected_duration?: number; // in seconds

  // Status
  status: VisitStatus;

  // Location Data
  entry_location?: Location;
  exit_location?: Location;

  // User Feedback
  user_rating?: number; // 1-5
  notes?: string;
  photos?: string[]; // Array of URLs

  // Metadata
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CreateVisitLogInput {
  user_id: string;
  itinerary_id: string;
  place_id: string;
  place_name: string;
  entered_at?: string;
  exited_at?: string;
  expected_duration?: number;
  entry_location?: Location;
  exit_location?: Location;
}

export interface UpdateVisitLogInput {
  exited_at?: string;
  time_spent?: number;
  status?: VisitStatus;
  exit_location?: Location;
  user_rating?: number;
  notes?: string;
  photos?: string[];
}

// ==========================================
// GEOFENCE TYPES
// ==========================================

export type GeofenceStatus = 'active' | 'triggered' | 'expired';

export interface Geofence {
  id: string; // UUID
  user_id: string;
  itinerary_id: string; // UUID
  place_id: string;
  place_name: string;

  // Location & Size
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
  radius: number; // in meters

  // Status
  status: GeofenceStatus;

  // Place category
  place_category?: string;

  // Metadata
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CreateGeofenceInput {
  user_id: string;
  itinerary_id: string;
  place_id: string;
  place_name: string;
  latitude: number;
  longitude: number;
  radius: number;
  place_category?: string;
}

// ==========================================
// NOTIFICATION PREFERENCE TYPES
// ==========================================

export type NotificationFrequency = 'low' | 'normal' | 'high';

export interface NotificationPreferences {
  user_id: string;

  // Notification Types
  arrival_notifications: boolean;
  departure_notifications: boolean;
  time_warning_notifications: boolean;
  off_route_notifications: boolean;
  next_place_notifications: boolean;

  // Quiet Hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // HH:MM:SS format
  quiet_hours_end?: string; // HH:MM:SS format

  // Frequency
  notification_frequency: NotificationFrequency;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  arrival_notifications?: boolean;
  departure_notifications?: boolean;
  time_warning_notifications?: boolean;
  off_route_notifications?: boolean;
  next_place_notifications?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  notification_frequency?: NotificationFrequency;
}

// ==========================================
// TRIP PROGRESS TYPES
// ==========================================

export interface TripProgress {
  total_places: number;
  completed: number;
  in_progress: number;
  pending: number;
  skipped: number;
  completion_percent: number; // 0-100
  estimated_time_remaining?: number; // in seconds
  total_time_spent?: number; // in seconds
}

export interface VisitSummary {
  place_name: string;
  status: VisitStatus;
  entered_at?: string;
  exited_at?: string;
  time_spent?: number;
  expected_duration?: number;
  completion_percent?: number; // 0-100
  user_rating?: number;
  notes?: string;
}

// ==========================================
// TRIP SUMMARY TYPES
// ==========================================

export interface TripSummary {
  itinerary_id: string;
  trip_name: string;
  total_places: number;
  places_visited: number;
  completion_percent: number;
  total_distance?: number; // in meters
  total_time: number; // in seconds
  average_time_per_place?: number; // in seconds
  favorite_place?: {
    name: string;
    rating: number;
  };
  budget_total?: number;
  amount_spent?: number;
  budget_remaining?: number;
  start_time?: string;
  end_time?: string;
  duration_days?: number;
  visits: VisitSummary[];
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==========================================
// EVENT TYPES
// ==========================================

export type VisitEvent = 'ENTER' | 'EXIT' | 'DWELL' | 'CHECK_IN' | 'CHECK_OUT' | 'SKIP';

export interface VisitEventData {
  type: VisitEvent;
  visit_id?: string;
  place_id: string;
  place_name: string;
  timestamp: string;
  location?: Location;
  metadata?: Record<string, any>;
}

// ==========================================
// DISTANCE & DURATION CALCULATIONS
// ==========================================

export interface DistanceInfo {
  distance_meters: number;
  distance_km: string; // formatted as "1.5km"
  distance_miles: string; // formatted as "0.9mi"
}

export interface DurationInfo {
  duration_seconds: number;
  duration_minutes: number;
  duration_hours: number;
  formatted: string; // formatted as "2h 15m" or "45m"
}

export interface RouteInfo {
  origin: Location;
  destination: Location;
  distance: DistanceInfo;
  duration: DurationInfo;
  polyline?: string; // Google Maps encoded polyline
}

// ==========================================
// GEOFENCE EVENT TYPES
// ==========================================

export interface GeofenceEventData {
  geofence_id: string;
  type: 'ENTER' | 'EXIT' | 'DWELL';
  user_location: Location;
  timestamp: string;
  place_id: string;
  place_name: string;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface TimeSpentBreakdown {
  total_seconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string; // "2h 15m 30s"
}

export interface PlaceVisitStats {
  place_id: string;
  place_name: string;
  visit_count: number;
  average_time_spent: TimeSpentBreakdown;
  average_rating: number;
  total_rating_count: number;
}

export interface UserTripStats {
  total_trips: number;
  completed_trips: number;
  active_trips: number;
  total_places_visited: number;
  total_distance: number;
  total_time: TimeSpentBreakdown;
  average_trip_duration: TimeSpentBreakdown;
  favorite_place?: PlaceVisitStats;
  most_visited_place?: PlaceVisitStats;
}

// ==========================================
// ERROR TYPES
// ==========================================

export interface VisitTrackingError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export enum VisitTrackingErrorCode {
  GEOFENCE_OVERLAP = 'GEOFENCE_OVERLAP',
  INVALID_LOCATION = 'INVALID_LOCATION',
  VISIT_NOT_FOUND = 'VISIT_NOT_FOUND',
  GEOFENCE_NOT_FOUND = 'GEOFENCE_NOT_FOUND',
  DUPLICATE_CHECK_IN = 'DUPLICATE_CHECK_IN',
  CHECK_OUT_WITHOUT_CHECK_IN = 'CHECK_OUT_WITHOUT_CHECK_IN',
  INSUFFICIENT_TIME = 'INSUFFICIENT_TIME',
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
}

// ==========================================
// CONSTANTS
// ==========================================

export const GEOFENCE_RADIUS_BY_CATEGORY = {
  landmark: 100, // Large landmarks
  museum: 75, // Medium indoor spaces
  restaurant: 50, // Smaller locations
  hotel: 50, // Smaller locations
  park: 150, // Large outdoor areas
  attraction: 75,
  default: 75,
} as const;

export const VISIT_COMPLETION_THRESHOLD = 0.7; // 70% of expected time

export const DEFAULT_EXPECTED_DURATION = 3600; // 1 hour in seconds
