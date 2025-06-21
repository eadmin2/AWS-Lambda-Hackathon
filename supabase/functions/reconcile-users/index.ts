import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (_req) => {
  try {
    // 1. Get all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // 2. Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id");
    if (profilesError) throw profilesError;

    const profileIds = new Set(profiles.map((p) => p.id));

    // 3. Find users in auth.users that are not in profiles
    const missingUsers = authUsers.users.filter((user) => !profileIds.has(user.id));

    if (missingUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "All users are reconciled." }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // 4. Create missing profiles
    const newProfiles = missingUsers.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email, // Fallback for full_name
      role: "veteran", 
    }));

    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert(newProfiles);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        message: `Successfully created ${newProfiles.length} missing profiles.`,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}); 