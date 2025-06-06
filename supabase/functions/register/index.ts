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
        JSON.stringify({ error: "Missing required fields: email, password, fullName" }),
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
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Send welcome email via send-email Edge Function
    // @ts-ignore
    const websiteUrl = Deno.env.get("WEBSITE_URL") || "https://yourwebsite.com";
    let welcomeEmailWarning: string | null = null;
    try {
      const welcomeEmailRes = await fetch(
        `${websiteUrl}/functions/v1/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `VA Rating Assistant <no-reply@${websiteUrl.replace(/^https?:\/\//, "")}>`,
            to: email,
            subject: "Welcome to VA Rating Assistant!",
            tags: [{ name: "welcome", value: "true" }],
            html: `<h1>Welcome, ${fullName}!</h1><p>Your username: <b>${email}</b></p><p>You can now log in with your email and password at <a href='${websiteUrl}/auth'>${websiteUrl}/auth</a>.</p>`,
            text: `Welcome, ${fullName}!\nYour username: ${email}\nYou can now log in with your email and password at ${websiteUrl}/auth`,
          }),
        },
      );
      if (!welcomeEmailRes.ok) {
        const err = await welcomeEmailRes.json().catch(() => ({}));
        welcomeEmailWarning =
          "User registered, but failed to send welcome email.";
        // Optionally log the error for debugging
        // deno-lint-ignore no-console
        console.error("Welcome email error:", err);
      }
    } catch (err) {
      welcomeEmailWarning =
        "User registered, but failed to send welcome email.";
      // Optionally log the error for debugging
      // deno-lint-ignore no-console
      console.error("Welcome email exception:", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: welcomeEmailWarning
          ? `Registration successful, but failed to send welcome email. (Warning: ${welcomeEmailWarning})`
          : "Registration successful! You can now log in with your email and password.",
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
