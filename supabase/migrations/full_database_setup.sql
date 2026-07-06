-- ============================================================
-- FULL DATABASE SETUP FOR EVENT MANAGEMENT SYSTEM
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE app_role AS ENUM ('admin', 'organizer', 'student');
CREATE TYPE event_category AS ENUM ('academic', 'social', 'sports', 'cultural', 'workshop', 'seminar', 'online_meeting');
CREATE TYPE event_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'live');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  department text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Roles
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

-- Events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time text NOT NULL,
  venue text NOT NULL,
  category event_category DEFAULT 'academic',
  capacity integer DEFAULT 100,
  status event_status DEFAULT 'pending',
  organizer_id uuid NOT NULL REFERENCES auth.users(id),
  image_url text,
  qr_code text,
  registered_count integer DEFAULT 0,
  attended_count integer DEFAULT 0,
  meeting_link text,
  meeting_status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Registrations
CREATE TABLE registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended boolean DEFAULT false,
  attended_at timestamptz,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Attendance
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  UNIQUE(event_id, student_id)
);

-- Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. MEETINGS TABLES
-- ============================================================

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_date date NOT NULL,
  meeting_time text NOT NULL,
  meeting_link text NOT NULL,
  duration_minutes integer DEFAULT 60,
  agenda text,
  status text DEFAULT 'scheduled',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'invited',
  attended boolean DEFAULT false,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  left_at timestamptz,
  UNIQUE(meeting_id, user_id)
);

-- ============================================================
-- 4. RESOURCE MANAGEMENT TABLES
-- ============================================================

CREATE TABLE resource_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  total_quantity integer DEFAULT 0,
  available_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE event_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  resource_type_id uuid NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  allocated_by uuid NOT NULL REFERENCES auth.users(id),
  allocated_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(event_id, resource_type_id)
);

CREATE TABLE event_resource_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  resource_type_id uuid NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
  requested_quantity integer DEFAULT 1,
  status text DEFAULT 'pending',
  notes text,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now()
);

CREATE TABLE resource_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_resource_id uuid REFERENCES event_resources(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id),
  resource_type_id uuid REFERENCES resource_types(id),
  quantity_returned integer NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'good',
  notes text,
  returned_by uuid,
  returned_at timestamptz DEFAULT now()
);

CREATE TABLE resource_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  resource_type_id uuid REFERENCES resource_types(id),
  action text NOT NULL,
  quantity integer,
  condition text,
  performed_by uuid,
  performed_at timestamptz DEFAULT now(),
  notes text
);

-- ============================================================
-- 5. EMAIL NOTIFICATION TABLES
-- ============================================================

CREATE TABLE email_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL UNIQUE,
  description text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE email_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  subject text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL REFERENCES email_notification_settings(notification_type),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- ============================================================
-- 6. FUNCTIONS
-- ============================================================

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Check if user can view a meeting
CREATE OR REPLACE FUNCTION can_view_meeting(_meeting_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meetings m
    JOIN events e ON m.event_id = e.id
    WHERE m.id = _meeting_id
    AND (
      e.organizer_id = _user_id
      OR EXISTS (SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = _meeting_id AND mp.user_id = _user_id)
      OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin')
    )
  );
$$;

-- Check if user is a meeting participant
CREATE OR REPLACE FUNCTION is_meeting_participant(_meeting_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM meeting_participants WHERE meeting_id = _meeting_id AND user_id = _user_id);
$$;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Read the role from signup metadata, default to 'student'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'student'
  );

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- Trigger: auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_resource_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User Roles
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_roles_update" ON user_roles FOR UPDATE TO authenticated USING (true);

-- Events
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (auth.uid() = organizer_id OR has_role('admin', auth.uid()));

-- Registrations
CREATE POLICY "registrations_select" ON registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "registrations_insert" ON registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "registrations_update" ON registrations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "registrations_delete" ON registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Meetings
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "meetings_insert" ON meetings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "meetings_update" ON meetings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "meetings_delete" ON meetings FOR DELETE TO authenticated USING (true);

-- Meeting Participants
CREATE POLICY "meeting_participants_select" ON meeting_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "meeting_participants_insert" ON meeting_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "meeting_participants_update" ON meeting_participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "meeting_participants_delete" ON meeting_participants FOR DELETE TO authenticated USING (true);

-- Resource Types
CREATE POLICY "resource_types_select" ON resource_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "resource_types_insert" ON resource_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "resource_types_update" ON resource_types FOR UPDATE TO authenticated USING (true);

-- Event Resources
CREATE POLICY "event_resources_select" ON event_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "event_resources_insert" ON event_resources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "event_resources_update" ON event_resources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "event_resources_delete" ON event_resources FOR DELETE TO authenticated USING (true);

-- Event Resource Requests
CREATE POLICY "event_resource_requests_select" ON event_resource_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "event_resource_requests_insert" ON event_resource_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "event_resource_requests_update" ON event_resource_requests FOR UPDATE TO authenticated USING (true);

-- Resource Returns
CREATE POLICY "resource_returns_select" ON resource_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "resource_returns_insert" ON resource_returns FOR INSERT TO authenticated WITH CHECK (true);

-- Resource Audit Log
CREATE POLICY "resource_audit_log_select" ON resource_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "resource_audit_log_insert" ON resource_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Email Notification Settings
CREATE POLICY "email_notification_settings_select" ON email_notification_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_notification_settings_insert" ON email_notification_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "email_notification_settings_update" ON email_notification_settings FOR UPDATE TO authenticated USING (true);

-- Email Notification Logs
CREATE POLICY "email_notification_logs_select" ON email_notification_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_notification_logs_insert" ON email_notification_logs FOR INSERT TO authenticated WITH CHECK (true);

-- User Email Preferences
CREATE POLICY "user_email_preferences_select" ON user_email_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_email_preferences_insert" ON user_email_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_email_preferences_update" ON user_email_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 8. SEED: Default Email Notification Settings
-- ============================================================
INSERT INTO email_notification_settings (notification_type, description, enabled) VALUES
  ('event_approved', 'When an event is approved', true),
  ('event_rejected', 'When an event is rejected', true),
  ('event_reminder', 'Reminder before event starts', true),
  ('registration_confirmation', 'Confirmation of event registration', true),
  ('meeting_invitation', 'When invited to a meeting', true),
  ('meeting_reminder', 'Reminder before meeting starts', true)
ON CONFLICT (notification_type) DO NOTHING;

-- ============================================================
-- DONE! Your database is fully set up.
-- ============================================================
