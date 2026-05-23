-- DROP and RECREATE visit_logs table with correct schema
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing table and policies
DROP TABLE IF EXISTS public.visit_logs CASCADE;

-- Step 2: Create the correct visit_logs table
CREATE TABLE public.visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  itinerary_id UUID NOT NULL,
  place_id VARCHAR(255) NOT NULL,
  place_name VARCHAR(500) NOT NULL,
  entered_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMP WITHOUT TIME ZONE,
  time_spent INTEGER,
  expected_duration INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  entry_location JSONB,
  exit_location JSONB,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  photos JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE CASCADE
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_visit_logs_user_id ON public.visit_logs(user_id);
CREATE INDEX idx_visit_logs_itinerary_id ON public.visit_logs(itinerary_id);
CREATE INDEX idx_visit_logs_status ON public.visit_logs(status);
CREATE INDEX idx_visit_logs_place_id ON public.visit_logs(place_id);
CREATE INDEX idx_visit_logs_user_itinerary ON public.visit_logs(user_id, itinerary_id);

-- Step 4: Enable RLS
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies for visit_logs
-- SELECT: Users can view their own visits
DROP POLICY IF EXISTS "Users can view their own visits" ON public.visit_logs;
CREATE POLICY "Users can view their own visits"
ON public.visit_logs
FOR SELECT
USING (auth.uid()::text = user_id);

-- INSERT: Users can create their own visits
DROP POLICY IF EXISTS "Users can create their own visits" ON public.visit_logs;
CREATE POLICY "Users can create their own visits"
ON public.visit_logs
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own visits
DROP POLICY IF EXISTS "Users can update their own visits" ON public.visit_logs;
CREATE POLICY "Users can update their own visits"
ON public.visit_logs
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Step 6: Verify table creation
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visit_logs' 
ORDER BY ordinal_position;

-- Result should show all these columns:
-- id, user_id, itinerary_id, place_id, place_name, entered_at, exited_at,
-- time_spent, expected_duration, status, entry_location, exit_location,
-- user_rating, notes, photos, created_at, updated_at
