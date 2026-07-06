-- 1. Add department to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='department') THEN
        ALTER TABLE public.profiles ADD COLUMN department text;
    END IF;
END $$;

-- 2. Update handle_new_user to capture department from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile, now including department
  INSERT INTO profiles (user_id, name, email, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'department'
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
$function$;
