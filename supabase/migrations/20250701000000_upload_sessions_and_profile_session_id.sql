-- Add active_upload_session_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_upload_session_id uuid REFERENCES public.upload_sessions(id);

-- Create upload_sessions table
CREATE TABLE IF NOT EXISTS public.upload_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('active', 'completed', 'expired', 'conflict')),
    files jsonb NOT NULL, -- array of file metadata (name, size, type, estimated_tokens, etc.)
    progress jsonb,       -- per-file progress, bytes uploaded, etc.
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    expires_at timestamptz NOT NULL, -- session expiration
    ended_at timestamptz,            -- when session is completed/expired
    audit_log jsonb NOT NULL DEFAULT '[]'::jsonb -- array of audit events
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON public.upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON public.upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at ON public.upload_sessions(expires_at);

-- RLS: Only session owner or admin can access
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can access own upload session" ON public.upload_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- (Optional) Add admin access policy if you have an admin role in profiles
-- CREATE POLICY "Admin can access all upload sessions" ON public.upload_sessions
--     FOR ALL TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Trigger to update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_upload_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_upload_session_updated_at ON public.upload_sessions;
CREATE TRIGGER trg_update_upload_session_updated_at
    BEFORE UPDATE ON public.upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_upload_session_updated_at(); 