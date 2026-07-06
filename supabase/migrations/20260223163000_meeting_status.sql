-- Add status column to meetings table
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended'));

-- Update existing meetings to be 'scheduled' if they are in the future, 'ended' if in the past
UPDATE public.meetings 
SET status = 'ended' 
WHERE (meeting_date + meeting_time) < (now() AT TIME ZONE 'UTC');
