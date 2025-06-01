// @ts-ignore: Deno runtime and remote module imports are valid in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore: Deno runtime and remote module imports are valid in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

serve(async (req) => {
  // Get the target user ID from the request body
  const { user_id } = await req.json()

  // Get the current user's JWT from the Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 })
  }
  const jwt = authHeader.replace('Bearer ', '')

  // Create a Supabase client as the current user
  // @ts-ignore: Deno is available in Edge Function runtime
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // @ts-ignore: Deno is available in Edge Function runtime
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // Get the current user's profile
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid user session' }), { status: 401 })
  }

  // Check if the user is a super admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('admin_level')
    .eq('id', user.id)
    .single()
  if (profileError || !profile || profile.admin_level !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 })
  }

  // Create a session for the target user
  const { data: impersonation, error: impersonateError } = await supabase.auth.admin.createUserSession({
    user_id
  })
  if (impersonateError || !impersonation) {
    return new Response(JSON.stringify({ error: impersonateError?.message || 'Failed to impersonate user' }), { status: 500 })
  }

  return new Response(JSON.stringify({ session: impersonation.session }), {
    headers: { 'Content-Type': 'application/json' }
  })
}) 