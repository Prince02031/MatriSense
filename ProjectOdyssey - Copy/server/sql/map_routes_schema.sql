-- SQL schema for map search and quota tracking
-- Run these in Supabase SQL Editor

-- 1. API Usage Tracking (Quota Management)
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_type VARCHAR NOT NULL, -- 'autocomplete', 'placeDetails', 'directions'
  date DATE NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint for daily counts per API type
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_unique 
ON api_usage_logs(api_type, date);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_api_usage_date 
ON api_usage_logs(api_type, date);

-- 2. Place Search Cache (7-day cache for autocomplete results)
-- Already exists from previous work, but here's the full schema:
CREATE TABLE IF NOT EXISTS place_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query VARCHAR NOT NULL,
  place_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_place_search_query 
ON place_search_cache(search_query);

CREATE INDEX IF NOT EXISTS idx_place_search_expires 
ON place_search_cache(expires_at);

-- 3. Places Cache (Permanent cache for Place Details API)
CREATE TABLE IF NOT EXISTS places_cache (
  place_id VARCHAR PRIMARY KEY,
  place_data JSONB NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_cache_fetched 
ON places_cache(fetched_at);

-- 4. Update itineraries table for manual planning
ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS map_routes JSONB;

ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR DEFAULT 'walking';

ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS creation_method VARCHAR DEFAULT 'ai'; -- 'ai' or 'manual'

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_itineraries_map_routes 
ON itineraries USING GIN (map_routes);

-- 5. Cleanup function (optional - run daily to clear expired cache)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM place_search_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a cron job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-cache', '0 2 * * *', 'SELECT cleanup_expired_cache()');

-- 6. Utility function to get today's API usage
CREATE OR REPLACE FUNCTION get_todays_api_usage()
RETURNS TABLE (
  api_type VARCHAR,
  count INTEGER,
  limit_value INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.api_type,
    COALESCE(a.count, 0) as count,
    CASE a.api_type
      WHEN 'autocomplete' THEN 500
      WHEN 'placeDetails' THEN 200
      WHEN 'directions' THEN 300
      ELSE 0
    END as limit_value
  FROM api_usage_logs a
  WHERE a.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
