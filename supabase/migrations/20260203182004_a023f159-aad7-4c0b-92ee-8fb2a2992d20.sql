-- Create email notification settings table (admin configurable)
CREATE TABLE public.email_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email settings
CREATE POLICY "Admins can view email settings"
ON public.email_notification_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update email settings"
ON public.email_notification_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default notification types
INSERT INTO public.email_notification_settings (notification_type, enabled, description) VALUES
    ('event_created', true, 'Email when a new event is created'),
    ('event_updated', true, 'Email when event details are updated'),
    ('event_cancelled', true, 'Email when an event is cancelled'),
    ('event_approved', true, 'Email when an event is approved'),
    ('event_rejected', true, 'Email when an event is rejected'),
    ('meeting_scheduled', true, 'Email when a planning meeting is scheduled'),
    ('meeting_updated', true, 'Email when meeting details are updated'),
    ('meeting_cancelled', true, 'Email when a meeting is cancelled'),
    ('meeting_invitation', true, 'Email when invited to a meeting'),
    ('event_reminder', true, 'Reminder email before an event'),
    ('meeting_reminder', true, 'Reminder email before a meeting'),
    ('role_assigned', true, 'Email when assigned a role for an event');

-- Create user email preferences table
CREATE TABLE public.user_email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type TEXT NOT NULL REFERENCES public.email_notification_settings(notification_type) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_email_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_email_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_email_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create email notification log table for monitoring
CREATE TABLE public.email_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_user_id UUID,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view email logs"
ON public.email_notification_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
ON public.email_notification_logs FOR SELECT
USING (auth.uid() = recipient_user_id);

-- System can insert logs (via service role)
CREATE POLICY "System can insert logs"
ON public.email_notification_logs FOR INSERT
WITH CHECK (true);

-- System can update logs (via service role)
CREATE POLICY "System can update logs"
ON public.email_notification_logs FOR UPDATE
USING (true);

-- Create trigger to update timestamps
CREATE TRIGGER update_email_notification_settings_updated_at
BEFORE UPDATE ON public.email_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_email_preferences_updated_at
BEFORE UPDATE ON public.user_email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();