// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Deno types for local TS
/// <reference types="deno" />
import { corsHeaders } from "../_shared/cors.ts";

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// @ts-ignore
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { email, password, fullName } = body;
    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, password, fullName",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Register user with Supabase Auth (email/password)
    // @ts-ignore: npm import only works in Deno Edge runtime
    const { createClient } = await import("npm:@supabase/supabase-js@2.39.3");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // The welcome email is now redundant since Supabase sends a confirmation email.
    // You can re-enable this or integrate it into your workflow as needed.
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration successful! Please check your email to confirm your account.",
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    // Catch-all error handler
    // deno-lint-ignore no-console
    console.error("Unexpected error in register function:", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected server error. Please try again later.",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
