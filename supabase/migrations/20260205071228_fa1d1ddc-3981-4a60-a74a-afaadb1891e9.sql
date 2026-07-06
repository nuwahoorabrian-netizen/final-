-- Create registrations table to track student event registrations
CREATE TABLE public.registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    attended BOOLEAN NOT NULL DEFAULT false,
    attended_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Students can view their own registrations
CREATE POLICY "Users can view their own registrations"
ON public.registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and organizers can view all registrations for their events
CREATE POLICY "Admins and organizers can view event registrations"
ON public.registrations
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = registrations.event_id 
        AND events.organizer_id = auth.uid()
    )
);

-- Students can register for approved events
CREATE POLICY "Students can register for events"
ON public.registrations
FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_id 
        AND events.status = 'approved'
    )
);

-- Students can cancel their own registrations
CREATE POLICY "Users can cancel their registrations"
ON public.registrations
FOR DELETE
USING (auth.uid() = user_id);

-- Admins and organizers can update attendance
CREATE POLICY "Admins and organizers can update attendance"
ON public.registrations
FOR UPDATE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = registrations.event_id 
        AND events.organizer_id = auth.uid()
    )
);

-- Create function to update event registered_count on registration
CREATE OR REPLACE FUNCTION public.update_event_registered_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.events 
        SET registered_count = registered_count + 1 
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.events 
        SET registered_count = registered_count - 1 
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger to auto-update registered_count
CREATE TRIGGER trigger_update_registered_count
AFTER INSERT OR DELETE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_event_registered_count();

-- Create function to update attended_count when attendance is marked
CREATE OR REPLACE FUNCTION public.update_event_attended_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.attended = true AND (OLD.attended = false OR OLD.attended IS NULL) THEN
        UPDATE public.events 
        SET attended_count = attended_count + 1 
        WHERE id = NEW.event_id;
    ELSIF NEW.attended = false AND OLD.attended = true THEN
        UPDATE public.events 
        SET attended_count = attended_count - 1 
        WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-update attended_count
CREATE TRIGGER trigger_update_attended_count
AFTER UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_event_attended_count();

-- Create notification for organizers when someone registers
CREATE OR REPLACE FUNCTION public.notify_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    event_record RECORD;
    user_name TEXT;
BEGIN
    -- Get event and organizer details
    SELECT e.*, p.user_id as organizer_user_id
    INTO event_record
    FROM public.events e
    LEFT JOIN public.profiles p ON e.organizer_id = p.user_id
    WHERE e.id = NEW.event_id;
    
    -- Get registrant name
    SELECT name INTO user_name FROM public.profiles WHERE user_id = NEW.user_id;
    
    -- Create notification for organizer
    IF event_record.organizer_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, event_id)
        VALUES (
            event_record.organizer_id,
            'success',
            'New Registration',
            COALESCE(user_name, 'A student') || ' registered for your event "' || event_record.title || '".',
            NEW.event_id
        );
    END IF;
    
    -- Create confirmation notification for the student
    INSERT INTO public.notifications (user_id, type, title, message, event_id)
    VALUES (
        NEW.user_id,
        'success',
        'Registration Confirmed',
        'You have successfully registered for "' || event_record.title || '".',
        NEW.event_id
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for registration notifications
CREATE TRIGGER trigger_notify_registration
AFTER INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.notify_registration();