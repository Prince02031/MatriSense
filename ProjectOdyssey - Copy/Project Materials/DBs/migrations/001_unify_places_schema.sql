-- Migration: Unify Places Schema
-- Description: Adds columns to 'places' table to match 'pois' richness and support admin hierarchy.
-- Run this in your Supabase SQL Editor.

-- 1. Add Google Place ID (Unique but allowing NULLs)
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS google_place_id character varying,
ADD CONSTRAINT places_google_place_id_key UNIQUE (google_place_id);

-- 2. Add Location Hierarchy & IDs
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS city character varying,          -- The city name (string)
ADD COLUMN IF NOT EXISTS city_id uuid,                    -- Reference to cities table ID
ADD COLUMN IF NOT EXISTS country_id uuid,                 -- Reference to countries table ID
ADD COLUMN IF NOT EXISTS neighborhood character varying,
ADD COLUMN IF NOT EXISTS address text;

-- 3. Add Activity Details (Rich Data)
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS opening_hours jsonb,
ADD COLUMN IF NOT EXISTS entry_fee jsonb,
ADD COLUMN IF NOT EXISTS accessibility jsonb,
ADD COLUMN IF NOT EXISTS visit_duration_min integer;      -- Ensure this exists (it might already)

-- 4. Add Contact & Meta Info
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS website character varying,
ADD COLUMN IF NOT EXISTS phone_number character varying,
ADD COLUMN IF NOT EXISTS email character varying,
ADD COLUMN IF NOT EXISTS amenities text[];

-- 5. Add Macro Category (Urban, Nature, History)
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS macro_category character varying,
ADD CONSTRAINT check_macro_category CHECK (macro_category IN ('Urban', 'Nature', 'History'));

-- 6. Add Statistics & Ratings
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS average_rating numeric(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS popularity_score integer DEFAULT 0;

-- 7. Add Foreign Key Constraints
-- (These assume the referenced IDs will be valid. If data is inserted without valid IDs, it will fail, which is good for integrity)
ALTER TABLE public.places 
ADD CONSTRAINT places_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id),
ADD CONSTRAINT places_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);

-- 8. Add Secondary Category
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS secondary_category character varying;

-- Confirmation
SELECT 'Migration applied successfully' as status;
