-- Enable RLS on user_conditions table
ALTER TABLE public.user_conditions ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own conditions
CREATE POLICY "Users can read their own conditions"
ON public.user_conditions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to insert their own conditions
CREATE POLICY "Users can insert their own conditions"
ON public.user_conditions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own conditions
CREATE POLICY "Users can update their own conditions"
ON public.user_conditions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own conditions
CREATE POLICY "Users can delete their own conditions"
ON public.user_conditions
FOR DELETE
USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_conditions TO authenticated;

-- Revoke all access from anon users
REVOKE ALL ON public.user_conditions FROM anon;

-- Allow service_role to bypass RLS
ALTER TABLE public.user_conditions FORCE ROW LEVEL SECURITY; 