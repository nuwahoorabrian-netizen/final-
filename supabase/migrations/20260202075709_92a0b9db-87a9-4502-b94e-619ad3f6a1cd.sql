-- Create security definer function to check if user can view a meeting
CREATE OR REPLACE FUNCTION public.can_view_meeting(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = _meeting_id
    AND (
      m.created_by = _user_id
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = m.event_id AND e.organizer_id = _user_id
      )
      OR public.has_role(_user_id, 'admin'::app_role)
    )
  )
$$;

-- Create security definer function to check if user is a meeting participant
CREATE OR REPLACE FUNCTION public.is_meeting_participant(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = _meeting_id AND user_id = _user_id
  )
$$;

-- Drop existing policies on meetings
DROP POLICY IF EXISTS "Users can view meetings they're part of" ON public.meetings;
DROP POLICY IF EXISTS "Admins and organizers can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Admins and creators can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Admins and creators can delete meetings" ON public.meetings;

-- Recreate meetings policies using security definer functions
CREATE POLICY "Users can view meetings they're part of"
ON public.meetings FOR SELECT
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = meetings.event_id AND e.organizer_id = auth.uid()
  )
  OR public.is_meeting_participant(auth.uid(), id)
);

CREATE POLICY "Admins and organizers can create meetings"
ON public.meetings FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = meetings.event_id AND events.organizer_id = auth.uid()
  )
);

CREATE POLICY "Admins and creators can update meetings"
ON public.meetings FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins and creators can delete meetings"
ON public.meetings FOR DELETE
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Drop and recreate meeting_participants policies to avoid recursion
DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON public.meeting_participants;
DROP POLICY IF EXISTS "Admins and meeting creators can add participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.meeting_participants;
DROP POLICY IF EXISTS "Admins and meeting creators can remove participants" ON public.meeting_participants;

CREATE POLICY "Users can view meeting participants for their meetings"
ON public.meeting_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR public.can_view_meeting(auth.uid(), meeting_id)
);

CREATE POLICY "Admins and meeting creators can add participants"
ON public.meeting_participants FOR INSERT
WITH CHECK (
  public.can_view_meeting(auth.uid(), meeting_id)
);

CREATE POLICY "Users can update their own participation"
ON public.meeting_participants FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.can_view_meeting(auth.uid(), meeting_id)
);

CREATE POLICY "Admins and meeting creators can remove participants"
ON public.meeting_participants FOR DELETE
USING (
  public.can_view_meeting(auth.uid(), meeting_id)
);