-- ========================================
-- ITINERARIES TABLE EXTENSIONS
-- ========================================
-- Additional columns to support visit tracking and trip management
--
-- Last Updated: February 1, 2026
-- ========================================

-- ==========================================
-- ALTER TABLE itineraries - Add new columns
-- ==========================================

-- Track trip status (planning, active, completed, cancelled)
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS trip_status VARCHAR DEFAULT 'planning';
-- Values: 'planning', 'active', 'completed', 'cancelled'

-- Store route data (polyline, waypoints, legs from Google Directions API)
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS map_routes JSONB;
-- Structure: { routeId, generatedAt, waypoints[], legs[], summary{} }

-- Transportation mode used for route generation
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR DEFAULT 'walking';
-- Values: 'walking', 'driving', 'transit', 'cycling'

-- How the itinerary was created
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS creation_method VARCHAR DEFAULT 'ai';
-- Values: 'ai', 'manual', 'hybrid'

-- Date/time when trip is scheduled to start
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS trip_start_date TIMESTAMP WITH TIME ZONE;

-- Date/time when trip is scheduled to end
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS trip_end_date TIMESTAMP WITH TIME ZONE;

-- Date/time when user actually started the trip
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE;

-- Date/time when user actually completed the trip
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP WITH TIME ZONE;

-- Total budget for the trip
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS budget_total NUMERIC(10, 2);

-- Amount actually spent
ALTER TABLE IF EXISTS public.itineraries 
ADD COLUMN IF NOT EXISTS amount_spent NUMERIC(10, 2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_status 
ON public.itineraries(trip_status);

CREATE INDEX IF NOT EXISTS idx_itineraries_map_routes 
ON public.itineraries USING GIN (map_routes);

CREATE INDEX IF NOT EXISTS idx_itineraries_user_status 
ON public.itineraries(user_id, trip_status);

-- ==========================================
-- MIGRATION HELPER QUERIES
-- ==========================================

-- Query: Update all existing itineraries to 'planning' status
-- UPDATE public.itineraries 
-- SET trip_status = 'planning' 
-- WHERE trip_status IS NULL;

-- Query: Check for NULL values
-- SELECT id, trip_status, map_routes 
-- FROM public.itineraries 
-- WHERE trip_status IS NULL 
-- OR map_routes IS NULL;

-- Query: Verify new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'itineraries' 
-- AND column_name IN ('trip_status', 'map_routes', 'transport_mode', 'creation_method', 'actual_start_time', 'actual_end_time')
-- ORDER BY ordinal_position;
