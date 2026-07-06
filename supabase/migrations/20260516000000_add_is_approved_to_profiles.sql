-- Add is_approved flag to profiles table to enforce admin approval workflow
ALTER TABLE public.profiles ADD COLUMN is_approved BOOLEAN DEFAULT false;

-- Set existing users to approved so they don't lose access
UPDATE public.profiles SET is_approved = true;
