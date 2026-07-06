-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to send email notifications via edge function
CREATE OR REPLACE FUNCTION public.send_email_notification(
    notification_type TEXT,
    recipient_email TEXT,
    recipient_user_id UUID,
    recipient_name TEXT,
    subject TEXT,
    event_id UUID DEFAULT NULL,
    meeting_id UUID DEFAULT NULL,
    event_title TEXT DEFAULT NULL,
    event_date TEXT DEFAULT NULL,
    event_time TEXT DEFAULT NULL,
    event_venue TEXT DEFAULT NULL,
    meeting_title TEXT DEFAULT NULL,
    meeting_date TEXT DEFAULT NULL,
    meeting_time TEXT DEFAULT NULL,
    meeting_link TEXT DEFAULT NULL,
    organizer_name TEXT DEFAULT NULL,
    status TEXT DEFAULT NULL,
    additional_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    edge_function_url TEXT;
    service_role_key TEXT;
    request_body JSONB;
BEGIN
    -- Build the edge function URL
    edge_function_url := 'https://uluxmzitjdxcxitmbtwq.supabase.co/functions/v1/send-email-notification';
    
    -- Get service role key from vault (or use anon key for now)
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL THEN
        service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXhteml0amR4Y3hpdG1idHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjQyMDMsImV4cCI6MjA4NDY0MDIwM30.VOo-lc_C711LHicSt2euf8GCbrUXRIkZq9HwkkmLp2E';
    END IF;
    
    -- Build request body
    request_body := jsonb_build_object(
        'notification_type', notification_type,
        'recipient_email', recipient_email,
        'recipient_user_id', recipient_user_id,
        'recipient_name', recipient_name,
        'subject', subject,
        'event_id', event_id,
        'meeting_id', meeting_id,
        'event_title', event_title,
        'event_date', event_date,
        'event_time', event_time,
        'event_venue', event_venue,
        'meeting_title', meeting_title,
        'meeting_date', meeting_date,
        'meeting_time', meeting_time,
        'meeting_link', meeting_link,
        'organizer_name', organizer_name,
        'status', status,
        'additional_message', additional_message
    );
    
    -- Make async HTTP call to edge function
    PERFORM extensions.http_post(
        edge_function_url,
        request_body::TEXT,
        'application/json'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
END;
$$;

-- Function to notify admins about new events
CREATE OR REPLACE FUNCTION public.notify_admins_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_record RECORD;
    organizer_name TEXT;
BEGIN
    -- Get organizer name
    SELECT name INTO organizer_name FROM public.profiles WHERE user_id = NEW.organizer_id;
    
    -- Notify all admins
    FOR admin_record IN 
        SELECT p.email, p.name, p.user_id
        FROM public.profiles p
        INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
        WHERE ur.role = 'admin'
    LOOP
        PERFORM public.send_email_notification(
            'event_created',
            admin_record.email,
            admin_record.user_id,
            admin_record.name,
            'New Event Pending Approval: ' || NEW.title,
            NEW.id,
            NULL,
            NEW.title,
            NEW.date::TEXT,
            NEW.time,
            NEW.venue,
            NULL, NULL, NULL, NULL,
            organizer_name,
            NEW.status::TEXT,
            NULL
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Function to notify organizer about status changes
CREATE OR REPLACE FUNCTION public.notify_event_status_change_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    organizer_record RECORD;
    notification_type TEXT;
    subject_line TEXT;
BEGIN
    -- Only trigger on status changes
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Determine notification type and subject
    IF NEW.status = 'approved' THEN
        notification_type := 'event_approved';
        subject_line := 'Your Event Has Been Approved: ' || NEW.title;
    ELSIF NEW.status = 'rejected' THEN
        notification_type := 'event_rejected';
        subject_line := 'Your Event Was Not Approved: ' || NEW.title;
    ELSIF NEW.status = 'cancelled' THEN
        notification_type := 'event_cancelled';
        subject_line := 'Event Cancelled: ' || NEW.title;
    ELSE
        RETURN NEW;
    END IF;
    
    -- Get organizer details
    SELECT email, name, user_id INTO organizer_record
    FROM public.profiles
    WHERE user_id = NEW.organizer_id;
    
    IF organizer_record IS NOT NULL THEN
        PERFORM public.send_email_notification(
            notification_type,
            organizer_record.email,
            organizer_record.user_id,
            organizer_record.name,
            subject_line,
            NEW.id,
            NULL,
            NEW.title,
            NEW.date::TEXT,
            NEW.time,
            NEW.venue,
            NULL, NULL, NULL, NULL,
            organizer_record.name,
            NEW.status::TEXT,
            NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to notify meeting participants via email
CREATE OR REPLACE FUNCTION public.notify_meeting_participant_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    participant_record RECORD;
    meeting_record RECORD;
    event_record RECORD;
BEGIN
    -- Get meeting details
    SELECT * INTO meeting_record FROM public.meetings WHERE id = NEW.meeting_id;
    
    -- Get event details if available
    IF meeting_record.event_id IS NOT NULL THEN
        SELECT title INTO event_record FROM public.events WHERE id = meeting_record.event_id;
    END IF;
    
    -- Get participant details
    SELECT email, name, user_id INTO participant_record
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    IF participant_record IS NOT NULL AND meeting_record IS NOT NULL THEN
        PERFORM public.send_email_notification(
            'meeting_invitation',
            participant_record.email,
            participant_record.user_id,
            participant_record.name,
            'Meeting Invitation: ' || meeting_record.title,
            meeting_record.event_id,
            meeting_record.id,
            COALESCE(event_record.title, NULL),
            NULL, NULL, NULL,
            meeting_record.title,
            meeting_record.meeting_date::TEXT,
            meeting_record.meeting_time,
            meeting_record.meeting_link,
            NULL, NULL, NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_event_created_email ON public.events;
CREATE TRIGGER on_event_created_email
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_event_created();

DROP TRIGGER IF EXISTS on_event_status_change_email ON public.events;
CREATE TRIGGER on_event_status_change_email
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_status_change_email();

DROP TRIGGER IF EXISTS on_meeting_participant_added_email ON public.meeting_participants;
CREATE TRIGGER on_meeting_participant_added_email
AFTER INSERT ON public.meeting_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_meeting_participant_email();