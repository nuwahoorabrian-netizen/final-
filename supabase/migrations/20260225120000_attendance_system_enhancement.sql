-- Add 'live' to event_status enum
-- Since PostgreSQL doesn't support adding a value to an enum within a transaction easily in some versions,
-- and Supabase migrations run in a specific way, we use this approach:
ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'live';

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, student_id)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policies for attendance
-- Students can insert their own attendance
CREATE POLICY "Students can mark their own attendance"
ON public.attendance
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can view their own attendance
CREATE POLICY "Students can view their own attendance"
ON public.attendance
FOR SELECT
USING (auth.uid() = student_id);

-- Admins and Organizers can view all attendance
CREATE POLICY "Admins and Organizers can view all attendance"
ON public.attendance
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND role IN ('admin', 'organizer')
    )
);

-- Note: The 'live' status will be used to allow/deny self-check-in in the application layer.
