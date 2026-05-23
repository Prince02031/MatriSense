-- Trip Memories Table for Timeline Feature
-- Stores user memories, photos, ratings, and personal details about completed trips

CREATE TABLE public.trip_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id character varying NOT NULL,
  
  -- Memory data
  mood character varying,
  favorite_moment text,
  trip_rating integer CHECK (trip_rating >= 0 AND trip_rating <= 5),
  would_revisit boolean DEFAULT false,
  
  -- Photos (JSONB array of URLs)
  memory_photos jsonb DEFAULT '[]'::jsonb,
  
  -- Additional metadata
  visited_places jsonb DEFAULT '[]'::jsonb,
  trip_description text,
  badges_earned jsonb DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT trip_memories_pkey PRIMARY KEY (id),
  CONSTRAINT trip_memories_itinerary_id_fkey 
    FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE CASCADE,
  CONSTRAINT trip_memories_user_id_itinerary_id_unique 
    UNIQUE(user_id, itinerary_id)
);

-- Index for faster queries
CREATE INDEX trip_memories_user_id_idx ON public.trip_memories(user_id);
CREATE INDEX trip_memories_itinerary_id_idx ON public.trip_memories(itinerary_id);
CREATE INDEX trip_memories_created_at_idx ON public.trip_memories(created_at);
