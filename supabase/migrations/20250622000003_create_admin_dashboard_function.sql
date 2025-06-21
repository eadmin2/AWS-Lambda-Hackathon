-- Clean up any previous, broken objects.
-- Dropping the view (if it exists) will also drop any dependent policies.
DROP VIEW IF EXISTS public.admin_users_view;
DROP FUNCTION IF EXISTS public.get_all_users();
DROP FUNCTION IF EXISTS public.get_admin_dashboard_data();

-- Create a single, comprehensive function to get all data for the admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data()
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    role text,
    created_at timestamptz,
    document_count bigint,
    subscription_status text,
    upload_credits int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ensure the user is an admin before proceeding
    IF (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) <> 'admin' THEN
        RAISE EXCEPTION 'Access denied: User is not an admin.';
    END IF;

    -- Return all users with their aggregated data
    RETURN QUERY
    SELECT
        u.id,
        u.email::text,
        p.full_name,
        p.role,
        u.created_at,
        (SELECT COUNT(*) FROM documents WHERE documents.user_id = u.id) as document_count,
        pay.subscription_status,
        pay.upload_credits
    FROM
        auth.users u
    LEFT JOIN
        profiles p ON u.id = p.id
    LEFT JOIN
        payments pay ON u.id = pay.user_id;
END;
$$; 