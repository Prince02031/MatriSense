-- =============================================================================
-- GROUP TRIPS SCHEMA
-- Run this in the Supabase SQL editor ONCE.
-- Tables: group_trips → group_members → group_expenses → group_activities
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. group_trips
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_trips (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id       VARCHAR NOT NULL,                -- MongoDB user _id of organizer
  itinerary_id       UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,

  -- Display Info
  title              VARCHAR(150) NOT NULL,
  description        TEXT,
  cover_image        TEXT,                            -- URL to cover photo

  -- Trip Details
  destination_tags   JSONB DEFAULT '[]',             -- e.g. ["Cox's Bazar", "Dhaka"]
  date_range_start   DATE,
  date_range_end     DATE,
  activity_type      VARCHAR(50),                     -- adventure, cultural, beach, etc.

  -- Membership
  max_participants   INTEGER DEFAULT 10,
  cost_per_person    NUMERIC(10, 2) DEFAULT 0,
  currency           VARCHAR(5) DEFAULT 'BDT',

  -- Visibility & Join Config
  is_public          BOOLEAN DEFAULT true,
  auto_approve       BOOLEAN DEFAULT false,           -- if true, discovery joins are instant
  invite_code        VARCHAR(12) UNIQUE NOT NULL,     -- nanoid(8) generated on create

  -- Status
  status             VARCHAR(20) DEFAULT 'open',      -- open, full, in_progress, completed, cancelled

  -- Timestamps
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_trips_organizer    ON public.group_trips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_group_trips_status       ON public.group_trips(status);
CREATE INDEX IF NOT EXISTS idx_group_trips_invite_code  ON public.group_trips(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_trips_is_public    ON public.group_trips(is_public);
CREATE INDEX IF NOT EXISTS idx_group_trips_date_start   ON public.group_trips(date_range_start);

-- -----------------------------------------------------------------------------
-- 2. group_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_trip_id  UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  user_id        VARCHAR NOT NULL,                    -- MongoDB user _id

  -- Role & Status
  role           VARCHAR(20) DEFAULT 'member',        -- organizer, admin, member
  status         VARCHAR(20) DEFAULT 'pending',       -- pending, approved, rejected, left, invite_rejected

  -- How they joined
  joined_via     VARCHAR(20) DEFAULT 'discovery',     -- invite_link, discovery

  -- Timestamps
  joined_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- One row per user per trip
  UNIQUE(group_trip_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id  ON public.group_members(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id   ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status    ON public.group_members(status);

-- -----------------------------------------------------------------------------
-- 3. group_expenses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_trip_id   UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,

  paid_by         VARCHAR NOT NULL,                   -- MongoDB user_id of payer
  title           VARCHAR(150) NOT NULL,
  amount          NUMERIC(10, 2) NOT NULL,
  currency        VARCHAR(5) DEFAULT 'BDT',
  category        VARCHAR(30) DEFAULT 'other',        -- food, transport, accommodation, tickets, other

  -- Split config
  split_type      VARCHAR(20) DEFAULT 'equal',        -- equal, custom, individual
  split_among     JSONB DEFAULT '[]',                 -- array of user_ids to split among
  custom_splits   JSONB DEFAULT '{}',                 -- { user_id: amount } for custom splits

  -- Optional
  receipt_url     TEXT,
  notes           TEXT,
  expense_date    DATE DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id  ON public.group_expenses(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_paid_by   ON public.group_expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_group_expenses_category  ON public.group_expenses(category);

-- -----------------------------------------------------------------------------
-- 4. group_activities  (shared task board)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_activities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_trip_id  UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,

  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  assigned_to    VARCHAR,                             -- MongoDB user_id (nullable = unassigned)
  created_by     VARCHAR NOT NULL,                    -- MongoDB user_id

  status         VARCHAR(20) DEFAULT 'todo',          -- todo, in_progress, done
  priority       VARCHAR(10) DEFAULT 'medium',        -- low, medium, high
  due_date       DATE,

  -- Timestamps
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_activities_group_id    ON public.group_activities(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_assigned_to ON public.group_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_group_activities_status      ON public.group_activities(status);

-- =============================================================================
-- DONE — paste all of the above into the Supabase SQL editor and click Run.
-- =============================================================================
