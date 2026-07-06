-- Add event_registration to email notification settings
-- This enables the registration confirmation email to be tracked and toggled by admins
INSERT INTO public.email_notification_settings (notification_type, enabled, description)
VALUES ('event_registration', true, 'Confirmation email when a user registers for an event')
ON CONFLICT (notification_type) DO NOTHING;
