-- Roles configuration for Supabase local development
-- This file ensures proper role setup for local development

-- Ensure authenticator role exists and has proper permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT;
    END IF;
    
    -- Grant basic roles to authenticator if not already granted
    IF NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid = (SELECT oid FROM pg_roles WHERE rolname = 'anon') AND member = (SELECT oid FROM pg_roles WHERE rolname = 'authenticator')) THEN
        GRANT anon TO authenticator;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated') AND member = (SELECT oid FROM pg_roles WHERE rolname = 'authenticator')) THEN
        GRANT authenticated TO authenticator;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid = (SELECT oid FROM pg_roles WHERE rolname = 'service_role') AND member = (SELECT oid FROM pg_roles WHERE rolname = 'authenticator')) THEN
        GRANT service_role TO authenticator;
    END IF;
END
$$;

-- Set role configurations
ALTER ROLE authenticator SET session_preload_libraries = 'safeupdate';
ALTER ROLE authenticator SET statement_timeout = '8s';
ALTER ROLE authenticator SET lock_timeout = '8s';
