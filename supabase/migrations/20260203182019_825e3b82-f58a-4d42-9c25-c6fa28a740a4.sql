-- Fix overly permissive RLS policies on email_notification_logs
-- These policies should only work for service role (edge functions)

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert logs" ON public.email_notification_logs;
DROP POLICY IF EXISTS "System can update logs" ON public.email_notification_logs;

-- The insert/update operations will be done by edge functions using service role key
-- which bypasses RLS entirely, so we don't need INSERT/UPDATE policies for the anon/authenticated role
-- The SELECT policies we have are sufficient for viewing logs