-- The capacity column is missing from the remote database schema.
-- This migration ensures the column exists so that event creation succeeds.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 100;
