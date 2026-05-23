-- ========================================
-- VISIT TRACKING SETUP GUIDE
-- ========================================
-- Step-by-step instructions for setting up visit tracking schema
--
-- Last Updated: February 1, 2026
-- ========================================

-- ==========================================
-- STEP 1: RUN SCHEMA CREATION
-- ==========================================
-- Execute the SQL in visit_tracking_schema.sql first
-- This creates:
--   - visit_logs table
--   - active_geofences table
--   - notification_preferences table
-- 
-- Command: 
-- psql -h your-supabase-host -U postgres -d your-db -f visit_tracking_schema.sql

-- ==========================================
-- STEP 2: EXTEND ITINERARIES TABLE
-- ==========================================
-- Execute the SQL in itineraries_extensions.sql
-- This adds tracking-related columns to existing itineraries table
--
-- Command:
-- psql -h your-supabase-host -U postgres -d your-db -f itineraries_extensions.sql

-- ==========================================
-- STEP 3: VERIFY TABLES WERE CREATED
-- ==========================================
-- Run these queries in Supabase SQL Editor to confirm everything is set up

-- Check if visit_logs table exists and has data
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('visit_logs', 'active_geofences', 'notification_preferences')
ORDER BY tablename;

-- Check visit_logs columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visit_logs'
ORDER BY ordinal_position;

-- Check active_geofences columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'active_geofences'
ORDER BY ordinal_position;

-- Check itineraries new columns
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'itineraries'
AND column_name IN (
  'trip_status', 'map_routes', 'transport_mode', 'creation_method',
  'trip_start_date', 'trip_end_date', 'actual_start_time', 'actual_end_time',
  'budget_total', 'amount_spent'
)
ORDER BY ordinal_position;

-- ==========================================
-- STEP 4: TEST DATA INSERTION
-- ==========================================
-- Insert test data to verify everything works

-- Insert test visit log (replace UUIDs with real ones)
INSERT INTO public.visit_logs (
  user_id,
  itinerary_id,
  place_id,
  place_name,
  entered_at,
  exited_at,
  time_spent,
  expected_duration,
  status,
  entry_location,
  exit_location,
  user_rating,
  notes
) VALUES (
  'test-user-123',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'eiffel-tower-123',
  'Eiffel Tower',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  3600,
  5400,
  'completed',
  '{"lat": 48.8584, "lng": 2.2945, "accuracy": 20}'::jsonb,
  '{"lat": 48.8584, "lng": 2.2945, "accuracy": 20}'::jsonb,
  5,
  'Amazing view! Worth the wait in line.'
) RETURNING *;

-- Insert test geofence
INSERT INTO public.active_geofences (
  user_id,
  itinerary_id,
  place_id,
  place_name,
  latitude,
  longitude,
  radius,
  status,
  place_category
) VALUES (
  'test-user-123',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'louvre-456',
  'Louvre Museum',
  48.8606,
  2.3352,
  100,
  'active',
  'museum'
) RETURNING *;

-- ==========================================
-- STEP 5: VERIFY INDEXES
-- ==========================================
-- Check if all indexes were created

SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('visit_logs', 'active_geofences', 'notification_preferences')
ORDER BY tablename, indexname;

-- ==========================================
-- STEP 6: TEST QUERIES
-- ==========================================

-- Query: Get all visits for a user
SELECT 
  place_name,
  status,
  entered_at,
  exited_at,
  time_spent,
  expected_duration,
  ROUND(100.0 * time_spent / NULLIF(expected_duration, 0))::INT as completion_percent,
  user_rating
FROM public.visit_logs
WHERE user_id = 'test-user-123'
ORDER BY entered_at DESC;

-- Query: Get trip progress
SELECT 
  COUNT(*) as total_places,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0))::INT as completion_percent
FROM public.visit_logs
WHERE itinerary_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- Query: Get average time spent vs expected
SELECT 
  place_name,
  AVG(time_spent)::INT as avg_time_spent,
  AVG(expected_duration)::INT as avg_expected_duration,
  ROUND(AVG(time_spent) / AVG(expected_duration), 2) as ratio
FROM public.visit_logs
WHERE status IN ('completed', 'in_progress')
GROUP BY place_name
ORDER BY avg_time_spent DESC;

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================

-- If RLS policies cause issues, disable them with:
-- ALTER TABLE public.visit_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.active_geofences DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification_preferences DISABLE ROW LEVEL SECURITY;

-- To drop tables (if needed):
-- DROP TABLE IF EXISTS public.visit_logs CASCADE;
-- DROP TABLE IF EXISTS public.active_geofences CASCADE;
-- DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- Check if a column exists before altering:
-- SELECT EXISTS (
--   SELECT 1 FROM information_schema.columns 
--   WHERE table_name = 'itineraries' 
--   AND column_name = 'trip_status'
-- );
