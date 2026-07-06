-- Enable Realtime on the notifications table
-- This is required for the real-time subscription in the frontend to work.
-- Run this in the Supabase SQL Editor.

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
