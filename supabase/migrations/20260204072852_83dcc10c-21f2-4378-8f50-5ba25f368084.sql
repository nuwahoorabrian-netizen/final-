-- Drop and recreate the trigger functions with proper type casting

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
    
    -- Notify all admins
    FOR admin_record IN 
        SELECT p.email, p.name, p.user_id
        FROM public.profiles p
        INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
        WHERE ur.role = 'admin'
    LOOP
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

CREATE OR REPLACE FUNCTION public.notify_event_status_change_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            notification_type := notification_type::text,
            recipient_email := organizer_record.email::text,
            recipient_user_id := organizer_record.user_id,
            recipient_name := organizer_record.name::text,
            subject := subject_line::text,
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
            organizer_name := organizer_record.name::text,
            status := NEW.status::text,
            additional_message := NULL::text
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_meeting_participant_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            notification_type := 'meeting_invitation'::text,
            recipient_email := participant_record.email::text,
            recipient_user_id := participant_record.user_id,
            recipient_name := participant_record.name::text,
            subject := ('Meeting Invitation: ' || meeting_record.title)::text,
            event_id := meeting_record.event_id,
            meeting_id := meeting_record.id,
            event_title := COALESCE(event_record.title, '')::text,
            event_date := NULL::text,
            event_time := NULL::text,
            event_venue := NULL::text,
            meeting_title := meeting_record.title::text,
            meeting_date := meeting_record.meeting_date::text,
            meeting_time := meeting_record.meeting_time::text,
            meeting_link := meeting_record.meeting_link::text,
            organizer_name := NULL::text,
            status := NULL::text,
            additional_message := NULL::text
        );
    END IF;
    
    RETURN NEW;
END;
$function$;