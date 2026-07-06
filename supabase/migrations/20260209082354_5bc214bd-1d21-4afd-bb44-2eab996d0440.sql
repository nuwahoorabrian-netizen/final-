
-- Allow students who registered for an event to view its meetings
DROP POLICY IF EXISTS "Users can view meetings they're part of" ON public.meetings;

CREATE POLICY "Users can view meetings they're part of"
ON public.meetings
FOR SELECT
USING (
  (created_by = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM events e WHERE e.id = meetings.event_id AND e.organizer_id = auth.uid()
  ))
  OR is_meeting_participant(auth.uid(), id)
  OR (EXISTS (
    SELECT 1 FROM registrations r WHERE r.event_id = meetings.event_id AND r.user_id = auth.uid()
  ))
);

-- Also allow registered students to view meeting participants
DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON public.meeting_participants;

CREATE POLICY "Users can view meeting participants for their meetings"
ON public.meeting_participants
FOR SELECT
USING (
  (user_id = auth.uid())
  OR can_view_meeting(auth.uid(), meeting_id)
  OR (EXISTS (
    SELECT 1 FROM meetings m
    JOIN registrations r ON r.event_id = m.event_id
    WHERE m.id = meeting_participants.meeting_id AND r.user_id = auth.uid()
  ))
);

-- Allow registered students to join meetings (insert themselves as participants)
DROP POLICY IF EXISTS "Admins and meeting creators can add participants" ON public.meeting_participants;

CREATE POLICY "Users can add participants to meetings"
ON public.meeting_participants
FOR INSERT
WITH CHECK (
  can_view_meeting(auth.uid(), meeting_id)
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meetings m
      JOIN registrations r ON r.event_id = m.event_id
      WHERE m.id = meeting_participants.meeting_id AND r.user_id = auth.uid()
    )
  )
);
