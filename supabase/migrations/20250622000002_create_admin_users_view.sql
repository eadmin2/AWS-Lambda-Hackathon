-- Drop the old view and policy if they exist to ensure a clean slate
DROP POLICY IF EXISTS "Allow admins to select all users" ON public.admin_users_view;
DROP VIEW IF EXISTS public.admin_users_view;

-- Create a function that returns the combined user data
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    email text,
    last_sign_in_at timestamptz,
    created_at timestamptz,
    full_name text,
    role text
)
LANGUAGE plpgsql
-- This is the key part: it runs with the permissions of the user who defined it (a superuser)
SECURITY DEFINER
-- This is a security best practice to prevent search path hijacking
SET search_path = public
AS $$
BEGIN
    -- This policy check is now inside the function, ensuring only admins can run it
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
        RAISE EXCEPTION 'Only admins can access this function';
    END IF;

    -- Return the combined user data
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.last_sign_in_at,
        u.created_at,
        p.full_name,
        p.role::text
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id;
END;
$$; 