-- Add missing end_date and end_time columns to the events table.
-- These columns are used by the frontend to support multi-day events
-- but were never added to the database schema.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS end_time text;
