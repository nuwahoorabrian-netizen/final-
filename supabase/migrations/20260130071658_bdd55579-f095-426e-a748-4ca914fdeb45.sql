-- Create meetings table for event planning meetings
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_link TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  agenda TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting participants table
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  attended BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS on meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on meeting_participants
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- Meetings policies: View if you're a participant, organizer of the event, or admin
CREATE POLICY "Users can view meetings they're part of"
ON public.meetings
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = meetings.event_id 
    AND events.organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants 
    WHERE meeting_participants.meeting_id = meetings.id 
    AND meeting_participants.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- Only admins and event organizers can create meetings
CREATE POLICY "Admins and organizers can create meetings"
ON public.meetings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_id 
    AND events.organizer_id = auth.uid()
  )
);

-- Only admins and meeting creators can update meetings
CREATE POLICY "Admins and creators can update meetings"
ON public.meetings
FOR UPDATE
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- Only admins and meeting creators can delete meetings
CREATE POLICY "Admins and creators can delete meetings"
ON public.meetings
FOR DELETE
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- Meeting participants policies
CREATE POLICY "Users can view meeting participants for their meetings"
ON public.meeting_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND (meetings.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Only admins and meeting creators can add participants
CREATE POLICY "Admins and meeting creators can add participants"
ON public.meeting_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_id 
    AND (meetings.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Participants can update their own status, admins and creators can update all
CREATE POLICY "Users can update their own participation"
ON public.meeting_participants
FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND (meetings.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Only admins and meeting creators can remove participants
CREATE POLICY "Admins and meeting creators can remove participants"
ON public.meeting_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND (meetings.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Add trigger for updated_at on meetings
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify participants when invited to a meeting
CREATE OR REPLACE FUNCTION public.notify_meeting_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meeting_title TEXT;
  meeting_date DATE;
  meeting_time TIME;
  event_title TEXT;
BEGIN
  SELECT m.title, m.meeting_date, m.meeting_time, e.title
  INTO meeting_title, meeting_date, meeting_time, event_title
  FROM public.meetings m
  JOIN public.events e ON e.id = m.event_id
  WHERE m.id = NEW.meeting_id;

  INSERT INTO public.notifications (user_id, type, title, message, event_id)
  SELECT 
    NEW.user_id,
    'meeting',
    'Meeting Invitation',
    'You have been invited to "' || meeting_title || '" for event "' || event_title || '" on ' || meeting_date || ' at ' || meeting_time,
    m.event_id
  FROM public.meetings m
  WHERE m.id = NEW.meeting_id;

  RETURN NEW;
END;
$$;

-- Create trigger to notify when participant is added
CREATE TRIGGER on_meeting_participant_added
AFTER INSERT ON public.meeting_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_meeting_participant();