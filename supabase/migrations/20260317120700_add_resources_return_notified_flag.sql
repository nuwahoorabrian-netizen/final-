-- Add a flag to events to indicate if the organizer has been notified to return resources
ALTER TABLE events ADD COLUMN IF NOT EXISTS resources_return_notified BOOLEAN DEFAULT FALSE;
