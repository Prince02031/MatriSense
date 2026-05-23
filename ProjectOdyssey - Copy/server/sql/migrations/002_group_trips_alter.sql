-- =============================================================================
-- MIGRATION: 002_group_trips_alter.sql
-- Purpose : Bring existing group_trips, group_members, group_expenses, and
--           group_activities tables up to the current schema definition.
-- Safe    : Every statement uses IF NOT EXISTS / IF EXISTS — safe to re-run.
-- Run in  : Supabase SQL editor (paste & click Run)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. group_trips  — ensure all current columns exist
-- -----------------------------------------------------------------------------
ALTER TABLE public.group_trips
  ADD COLUMN IF NOT EXISTS organizer_id       VARCHAR,
  ADD COLUMN IF NOT EXISTS itinerary_id       UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title              VARCHAR(150),
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS cover_image        TEXT,
  ADD COLUMN IF NOT EXISTS destination_tags   JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS date_range_start   DATE,
  ADD COLUMN IF NOT EXISTS date_range_end     DATE,
  ADD COLUMN IF NOT EXISTS activity_type      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS max_participants   INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cost_per_person    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency           VARCHAR(5) DEFAULT 'BDT',
  ADD COLUMN IF NOT EXISTS is_public          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_approve       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_code        VARCHAR(12),
  ADD COLUMN IF NOT EXISTS status             VARCHAR(20) DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Unique constraint on invite_code (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_trips_invite_code_key'
      AND conrelid = 'public.group_trips'::regclass
  ) THEN
    ALTER TABLE public.group_trips ADD CONSTRAINT group_trips_invite_code_key UNIQUE (invite_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_trips_organizer    ON public.group_trips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_group_trips_status       ON public.group_trips(status);
CREATE INDEX IF NOT EXISTS idx_group_trips_invite_code  ON public.group_trips(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_trips_is_public    ON public.group_trips(is_public);
CREATE INDEX IF NOT EXISTS idx_group_trips_date_start   ON public.group_trips(date_range_start);


-- -----------------------------------------------------------------------------
-- 2. group_members  — ensure all current columns exist
-- -----------------------------------------------------------------------------
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS group_trip_id  UUID REFERENCES public.group_trips(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id        VARCHAR,
  ADD COLUMN IF NOT EXISTS role           VARCHAR(20) DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status         VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS joined_via     VARCHAR(20) DEFAULT 'discovery',
  ADD COLUMN IF NOT EXISTS joined_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Unique constraint: one row per user per trip
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_members_group_trip_id_user_id_key'
      AND conrelid = 'public.group_members'::regclass
  ) THEN
    ALTER TABLE public.group_members
      ADD CONSTRAINT group_members_group_trip_id_user_id_key UNIQUE (group_trip_id, user_id);
  END IF;
END $$;

-- Party size: how many people this member row represents (e.g., family of 3 under one account)
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS party_size INTEGER DEFAULT 1;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id  ON public.group_members(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id   ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status    ON public.group_members(status);


-- -----------------------------------------------------------------------------
-- 3. group_expenses  — ensure all current columns exist
-- -----------------------------------------------------------------------------
ALTER TABLE public.group_expenses
  ADD COLUMN IF NOT EXISTS group_trip_id   UUID REFERENCES public.group_trips(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS paid_by         VARCHAR,
  ADD COLUMN IF NOT EXISTS title           VARCHAR(150),
  ADD COLUMN IF NOT EXISTS amount          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency        VARCHAR(5) DEFAULT 'BDT',
  ADD COLUMN IF NOT EXISTS category        VARCHAR(30) DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS split_type      VARCHAR(20) DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS split_among     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_splits   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS receipt_url     TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS expense_date    DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id  ON public.group_expenses(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_paid_by   ON public.group_expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_group_expenses_category  ON public.group_expenses(category);


-- -----------------------------------------------------------------------------
-- 4. group_activities  — ensure all current columns exist
-- -----------------------------------------------------------------------------
ALTER TABLE public.group_activities
  ADD COLUMN IF NOT EXISTS group_trip_id  UUID REFERENCES public.group_trips(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title          VARCHAR(200),
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to    VARCHAR,
  ADD COLUMN IF NOT EXISTS created_by     VARCHAR,
  ADD COLUMN IF NOT EXISTS status         VARCHAR(20) DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS priority       VARCHAR(10) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS due_date       DATE,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_activities_group_id     ON public.group_activities(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_assigned_to  ON public.group_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_group_activities_status       ON public.group_activities(status);


-- =============================================================================
-- DONE — paste all of the above into the Supabase SQL editor and click Run.
-- =============================================================================
