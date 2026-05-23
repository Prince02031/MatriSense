-- Fix Visit Logs Table - Add Missing Columns
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns if they don't exist
ALTER TABLE public.visit_logs
ADD COLUMN IF NOT EXISTS entry_location JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS exit_location JSONB DEFAULT NULL;

-- Step 2: Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visit_logs' 
ORDER BY ordinal_position;

-- Step 3: Check if any records exist
SELECT COUNT(*) as total_visits FROM public.visit_logs;

-- If you need to completely reset the table, run this:
-- DROP TABLE IF EXISTS public.visit_logs CASCADE;
-- Then re-run the full visit_tracking_schema.sql file
