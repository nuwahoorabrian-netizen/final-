
-- Update the notify_admins_event_created function to also create in-app notifications for admins
CREATE OR REPLACE FUNCTION public.notify_admins_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    admin_record RECORD;
    organizer_name TEXT;
BEGIN
    -- Get organizer name
    SELECT name INTO organizer_name FROM public.profiles WHERE user_id = NEW.organizer_id;
    
    -- Notify all admins (both in-app and email)
    FOR admin_record IN 
        SELECT p.email, p.name, p.user_id
        FROM public.profiles p
        INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
        WHERE ur.role = 'admin'
    LOOP
        -- Create in-app notification for admin
        INSERT INTO public.notifications (user_id, type, title, message, event_id)
        VALUES (
            admin_record.user_id,
            'info',
            'New Event Pending Approval',
            'A new event "' || NEW.title || '" by ' || COALESCE(organizer_name, 'Unknown') || ' is pending your approval.',
            NEW.id
        );
        
        -- Send email notification
        PERFORM public.send_email_notification(
            notification_type := 'event_created'::text,
            recipient_email := admin_record.email::text,
            recipient_user_id := admin_record.user_id,
            recipient_name := admin_record.name::text,
            subject := ('New Event Pending Approval: ' || NEW.title)::text,
            event_id := NEW.id,
            meeting_id := NULL::uuid,
            event_title := NEW.title::text,
            event_date := NEW.date::text,
            event_time := NEW.time::text,
            event_venue := NEW.venue::text,
            meeting_title := NULL::text,
            meeting_date := NULL::text,
            meeting_time := NULL::text,
            meeting_link := NULL::text,
            organizer_name := organizer_name::text,
            status := NEW.status::text,
            additional_message := NULL::text
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

-- Also update notify_meeting_participant_email to create in-app notifications
CREATE OR REPLACE FUNCTION public.notify_meeting_participant_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    participant_record RECORD;
    meeting_record RECORD;
BEGIN
    -- Get meeting details
    SELECT m.*, e.title as event_title
    INTO meeting_record
    FROM public.meetings m
    LEFT JOIN public.events e ON m.event_id = e.id
    WHERE m.id = NEW.meeting_id;
    
    -- Get participant details
    SELECT email, name, user_id INTO participant_record
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    IF participant_record IS NOT NULL AND meeting_record IS NOT NULL THEN
        -- Create in-app notification for participant
        INSERT INTO public.notifications (user_id, type, title, message, event_id)
        VALUES (
            participant_record.user_id,
            'reminder',
            'Meeting Invitation',
            'You have been invited to "' || meeting_record.title || '" scheduled for ' || meeting_record.meeting_date || ' at ' || meeting_record.meeting_time || '.',
            meeting_record.event_id
        );
        
        -- Send email notification
        PERFORM public.send_email_notification(
            notification_type := 'meeting_invitation'::text,
            recipient_email := participant_record.email::text,
            recipient_user_id := participant_record.user_id,
            recipient_name := participant_record.name::text,
            subject := ('Meeting Invitation: ' || meeting_record.title)::text,
            event_id := meeting_record.event_id,
            meeting_id := NEW.meeting_id,
            event_title := meeting_record.event_title::text,
            event_date := NULL::text,
            event_time := NULL::text,
            event_venue := NULL::text,
            meeting_title := meeting_record.title::text,
            meeting_date := meeting_record.meeting_date::text,
            meeting_time := meeting_record.meeting_time::text,
            meeting_link := meeting_record.meeting_link::text,
            organizer_name := NULL::text,
            status := NULL::text,
            additional_message := meeting_record.description::text
        );
    END IF;
    
    RETURN NEW;
END;
$function$;
