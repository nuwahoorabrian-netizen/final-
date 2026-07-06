-- Migration to add RPC functions for user management to bypass Edge Functions

-- Function to delete a user securely (Only admins can execute)
CREATE OR REPLACE FUNCTION delete_user_admin(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  status json;
BEGIN
  -- Verify the requesting user is an admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object('error', 'Only admins can delete users');
  END IF;

  IF auth.uid() = user_id_to_delete THEN
    RETURN json_build_object('error', 'Cannot delete your own account');
  END IF;

  -- Delete from auth.users (cascades automatically to profiles and user_roles)
  DELETE FROM auth.users WHERE id = user_id_to_delete;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;
