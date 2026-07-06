-- ============================================================
-- FINAL FIX: Update app_role enum and handle_new_user trigger
-- ============================================================

-- 1. Add 'user' to app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'user') THEN
        ALTER TYPE app_role ADD VALUE 'user';
    END IF;
END
$$;

-- 2. Update the handle_new_user function to use 'user' as default
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

  -- Read the role from signup metadata, default to 'user'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'user'
  );

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- 3. Update existing 'student' roles to 'user' (SKIPPED: user wants both to exist)
-- UPDATE user_roles SET role = 'user' WHERE role = 'student';
-- ALTER TYPE app_role RENAME VALUE 'student' TO 'old_student'; -- Optional cleanup
