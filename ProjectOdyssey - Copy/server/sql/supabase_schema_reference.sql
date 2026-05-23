-- ========================================
-- SUPABASE SCHEMA REFERENCE
-- ========================================
-- WARNING: This schema is for REFERENCE ONLY and is not meant to be run as-is.
-- Table order and constraints may not be valid for direct execution.
-- Use this file to understand the current database structure.
--
-- Last Updated: January 31, 2026
-- ========================================

-- ===================
-- CHAT & MESSAGING
-- ===================

CREATE TABLE public.chat_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  message text NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['user'::character varying, 'ai'::character varying]::text[])),
  session_id character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_history_pkey PRIMARY KEY (id)
);

-- ===================
-- LOCATION HIERARCHY
-- ===================

CREATE TABLE public.countries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  description text,
  short_description text,
  google_place_id character varying UNIQUE,
  latitude numeric CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  country_code character NOT NULL UNIQUE,
  continent character varying NOT NULL,
  capital character varying,
  currency character,
  languages ARRAY,
  population bigint,
  area numeric,
  visa_required boolean DEFAULT false,
  best_time_to_visit character varying,
  total_reviews integer DEFAULT 0,
  average_rating numeric DEFAULT 0 CHECK (average_rating >= 0::numeric AND average_rating <= 5::numeric),
  total_visitors integer DEFAULT 0,
  popularity_score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  location USER-DEFINED,
  CONSTRAINT countries_pkey PRIMARY KEY (id)
);

CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL,
  description text,
  short_description text,
  google_place_id character varying UNIQUE,
  latitude numeric CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  country_id uuid NOT NULL,
  country_name character varying,
  state_province character varying,
  population bigint,
  area numeric,
  best_time_to_visit character varying,
  average_temperature character varying,
  famous_for ARRAY,
  poi_breakdown jsonb DEFAULT '{"urban": 0, "nature": 0, "history": 0}'::jsonb,
  total_reviews integer DEFAULT 0,
  average_rating numeric DEFAULT 0 CHECK (average_rating >= 0::numeric AND average_rating <= 5::numeric),
  total_visitors integer DEFAULT 0,
  popularity_score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  location USER-DEFINED,
  CONSTRAINT cities_pkey PRIMARY KEY (id),
  CONSTRAINT cities_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id)
);

-- ===================
-- PLACES & POIs
-- ===================

CREATE TABLE public.places (
  place_id integer NOT NULL DEFAULT nextval('places_place_id_seq'::regclass),
  name text NOT NULL,
  primary_category text,
  tags ARRAY,
  short_desc text,
  visit_duration_min integer,
  est_cost_per_day numeric,
  source text,
  verified boolean DEFAULT false,
  country text,
  region text,
  location USER-DEFINED,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT places_pkey PRIMARY KEY (place_id)
);

CREATE TABLE public.pois (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL,
  description text,
  short_description text,
  google_place_id character varying UNIQUE,
  latitude numeric CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  city_id uuid NOT NULL,
  city_name character varying,
  country_id uuid NOT NULL,
  country_name character varying,
  category USER-DEFINED NOT NULL,
  sub_category USER-DEFINED,
  tags ARRAY,
  address text,
  neighborhood character varying,
  opening_hours jsonb,
  entry_fee jsonb,
  estimated_duration character varying,
  accessibility jsonb,
  website character varying,
  phone_number character varying,
  email character varying,
  amenities ARRAY,
  features ARRAY,
  best_time_of_day character varying,
  best_season character varying,
  crowd_level character varying,
  total_reviews integer DEFAULT 0,
  average_rating numeric DEFAULT 0 CHECK (average_rating >= 0::numeric AND average_rating <= 5::numeric),
  total_visitors integer DEFAULT 0,
  popularity_score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  location USER-DEFINED,
  CONSTRAINT pois_pkey PRIMARY KEY (id),
  CONSTRAINT pois_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id),
  CONSTRAINT pois_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id)
);

CREATE TABLE public.nearby_pois (
  poi_id uuid NOT NULL,
  nearby_poi_id uuid NOT NULL,
  distance_km numeric NOT NULL CHECK (distance_km > 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nearby_pois_pkey PRIMARY KEY (poi_id, nearby_poi_id),
  CONSTRAINT nearby_pois_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id),
  CONSTRAINT nearby_pois_nearby_poi_id_fkey FOREIGN KEY (nearby_poi_id) REFERENCES public.pois(id)
);

CREATE TABLE public.top_places (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  parent_id uuid NOT NULL,
  parent_type USER-DEFINED NOT NULL CHECK (parent_type = ANY (ARRAY['COUNTRY'::place_type, 'CITY'::place_type])),
  poi_id uuid NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT top_places_pkey PRIMARY KEY (id),
  CONSTRAINT top_places_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id)
);

-- ===================
-- ITINERARIES
-- ===================

CREATE TABLE public.itineraries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  trip_name character varying NOT NULL,
  selected_places jsonb,
  selected_itinerary jsonb,
  status character varying DEFAULT 'draft'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT itineraries_pkey PRIMARY KEY (id)
);

-- ===================
-- IMAGES & MEDIA
-- ===================

CREATE TABLE public.place_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  url character varying NOT NULL,
  caption text,
  alt_text text,
  display_order integer DEFAULT 0,
  place_id uuid NOT NULL,
  place_type USER-DEFINED NOT NULL,
  uploaded_by uuid,
  is_verified boolean DEFAULT false,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT place_images_pkey PRIMARY KEY (id)
);

CREATE TABLE public.review_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  review_id uuid NOT NULL,
  url character varying NOT NULL,
  caption text,
  display_order integer DEFAULT 0,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_images_pkey PRIMARY KEY (id),
  CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);

-- ===================
-- REVIEWS
-- ===================

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  place_id uuid NOT NULL,
  place_type USER-DEFINED NOT NULL,
  place_name character varying,
  user_id uuid NOT NULL,
  user_name character varying,
  user_avatar character varying,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title character varying,
  comment text,
  visit_date date,
  images jsonb DEFAULT '[]'::jsonb,
  helpful_count integer DEFAULT 0 CHECK (helpful_count >= 0),
  is_verified boolean DEFAULT false,
  was_edited boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id)
);

-- ===================
-- CACHING & PERFORMANCE
-- ===================

CREATE TABLE public.place_search_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  search_query character varying NOT NULL,
  place_data jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp without time zone,
  CONSTRAINT place_search_cache_pkey PRIMARY KEY (id)
);

-- ===================
-- INDEXES
-- ===================

-- Add indexes here if needed for performance
CREATE INDEX IF NOT EXISTS idx_place_search_query ON place_search_cache(search_query);

-- ===================
-- NOTES
-- ===================

-- USER-DEFINED types referenced above:
--   - place_type (COUNTRY, CITY, POI)
--   - location (PostGIS geometry/geography type)
--   - category/sub_category (custom enums)

-- Tables to be added for location tracking (see LOCATION_TRACKING_IMPLEMENTATION_PLAN.md):
--   - visit_logs
--   - active_geofences
--   - user_devices
--   - notification_preferences
--   - notification_logs

-- Columns to be added to itineraries:
--   - map_routes JSONB
--   - transport_mode VARCHAR
--   - creation_method VARCHAR ('ai' or 'manual')
--   - trip_status VARCHAR ('planning', 'active', 'completed', 'cancelled')
