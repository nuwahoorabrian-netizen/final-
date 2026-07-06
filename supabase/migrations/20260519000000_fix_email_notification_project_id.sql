-- Update send_email_notification to use the correct project ID/URL and key
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
    -- Build the edge function URL using the correct project ID (qqmzhdnofylwjkyqeqei)
    edge_function_url := 'https://qqmzhdnofylwjkyqeqei.supabase.co/functions/v1/send-email-notification';
    
    -- Get service role key from vault (or use the publishable key as fallback)
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL THEN
        service_role_key := 'sb_publishable_L_zJii59FBUF_9tggtiQ4Q_exE4x_wR';
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
