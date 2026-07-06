-- Create RPC function to approve users as an admin
CREATE OR REPLACE FUNCTION approve_user_admin(user_id_to_approve uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check if the calling user is an admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only administrators can approve users';
    END IF;

    -- Update the profile
    UPDATE profiles 
    SET is_approved = true 
    WHERE user_id = user_id_to_approve;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
END;
$$;
