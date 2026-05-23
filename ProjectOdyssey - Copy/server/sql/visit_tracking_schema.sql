-- ========================================
-- VISIT TRACKING SCHEMA
-- ========================================
-- Tables for tracking user visits to places during trips
-- Includes visit logs and active geofences management
--
-- Last Updated: February 1, 2026
-- ========================================

-- ===================
-- VISIT LOGS TABLE
-- ===================
-- Records every visit to a place with timing and status information

CREATE TABLE IF NOT EXISTS public.visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  place_id VARCHAR NOT NULL,
  place_name VARCHAR NOT NULL,
  
  -- Timing Information
  entered_at TIMESTAMP WITH TIME ZONE,                    -- When user arrived at location
  exited_at TIMESTAMP WITH TIME ZONE,                     -- When user left location
  time_spent INTEGER,                                     -- Total seconds spent at location
  expected_duration INTEGER,                              -- Expected duration in seconds from itinerary
  
  -- Visit Status
  status VARCHAR NOT NULL DEFAULT 'pending',              -- pending, in_progress, completed, skipped
  
  -- Location Data (GPS coordinates and accuracy)
  entry_location JSONB,                                   -- {lat, lng, accuracy}
  exit_location JSONB,                                    -- {lat, lng, accuracy}
  
  -- User Feedback (optional)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),  -- 1-5 stars
  notes TEXT,                                             -- User comments about the visit
  photos JSONB,                                           -- Array of photo URLs: ["url1", "url2", ...]
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_visit_logs_user ON public.visit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_itinerary ON public.visit_logs(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_status ON public.visit_logs(status);
CREATE INDEX IF NOT EXISTS idx_visit_logs_place ON public.visit_logs(place_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_user_itinerary ON public.visit_logs(user_id, itinerary_id);

-- Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own visit logs
DROP POLICY IF EXISTS "Users can view their own visit logs" ON public.visit_logs;
CREATE POLICY "Users can view their own visit logs"
  ON public.visit_logs FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own visit logs" ON public.visit_logs;
CREATE POLICY "Users can insert their own visit logs"
  ON public.visit_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own visit logs" ON public.visit_logs;
CREATE POLICY "Users can update their own visit logs"
  ON public.visit_logs FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ===================
-- ACTIVE GEOFENCES TABLE
-- ===================
-- Tracks geofences (virtual boundaries) created for each itinerary

CREATE TABLE IF NOT EXISTS public.active_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  place_id VARCHAR NOT NULL,
  place_name VARCHAR NOT NULL,
  
  -- Geofence Location & Size
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  radius INTEGER NOT NULL,                                -- Radius in meters (typical: 50-150m)
  
  -- Geofence Status
  status VARCHAR NOT NULL DEFAULT 'active',              -- active, triggered, expired
  
  -- Place Category (for dynamic radius determination)
  place_category VARCHAR,                                 -- 'landmark', 'restaurant', 'museum', 'park', etc.
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for geofence queries
CREATE INDEX IF NOT EXISTS idx_active_geofences_itinerary ON public.active_geofences(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_active_geofences_user ON public.active_geofences(user_id);
CREATE INDEX IF NOT EXISTS idx_active_geofences_status ON public.active_geofences(status);
CREATE INDEX IF NOT EXISTS idx_active_geofences_place ON public.active_geofences(place_id);

-- Enable RLS for geofences
ALTER TABLE public.active_geofences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for geofences
DROP POLICY IF EXISTS "Users can view their own geofences" ON public.active_geofences;
CREATE POLICY "Users can view their own geofences"
  ON public.active_geofences FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own geofences" ON public.active_geofences;
CREATE POLICY "Users can insert their own geofences"
  ON public.active_geofences FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own geofences" ON public.active_geofences;
CREATE POLICY "Users can update their own geofences"
  ON public.active_geofences FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own geofences" ON public.active_geofences;
CREATE POLICY "Users can delete their own geofences"
  ON public.active_geofences FOR DELETE
  USING (auth.uid()::text = user_id);

-- ===================
-- NOTIFICATION PREFERENCES TABLE
-- ===================
-- User preferences for notification types and frequency

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id VARCHAR PRIMARY KEY,
  
  -- Notification Types
  arrival_notifications BOOLEAN DEFAULT TRUE,
  departure_notifications BOOLEAN DEFAULT TRUE,
  time_warning_notifications BOOLEAN DEFAULT TRUE,
  off_route_notifications BOOLEAN DEFAULT TRUE,
  next_place_notifications BOOLEAN DEFAULT TRUE,
  
  -- Quiet Hours (e.g., no notifications between 10 PM and 8 AM)
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,                                 -- e.g., '22:00:00'
  quiet_hours_end TIME,                                   -- e.g., '08:00:00'
  
  -- Notification Frequency
  notification_frequency VARCHAR DEFAULT 'normal',        -- 'low', 'normal', 'high'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid()::text = user_id);

-- ===================
-- SAMPLE QUERIES
-- ===================

-- Query: Get visit history for an itinerary
-- SELECT * FROM visit_logs 
-- WHERE itinerary_id = 'itinerary-uuid' 
-- ORDER BY entered_at DESC;

-- Query: Calculate completion percentage
-- SELECT 
--   COUNT(*) FILTER (WHERE status = 'completed') as completed,
--   COUNT(*) as total,
--   ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0)) as completion_percent
-- FROM visit_logs 
-- WHERE itinerary_id = 'itinerary-uuid';

-- Query: Get currently active visit
-- SELECT * FROM visit_logs 
-- WHERE itinerary_id = 'itinerary-uuid' 
-- AND status = 'in_progress' 
-- LIMIT 1;

-- Query: Calculate total time spent on trip
-- SELECT 
--   SUM(time_spent) as total_seconds,
--   SUM(time_spent) / 3600 as hours,
--   SUM(time_spent) / 60 as minutes
-- FROM visit_logs 
-- WHERE itinerary_id = 'itinerary-uuid' 
-- AND status IN ('in_progress', 'completed');
