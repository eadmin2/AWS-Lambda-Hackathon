// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    const { email, fullName } = body;
    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, fullName" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Register user with Supabase Auth (passwordless)
    const { createClient } = await import("npm:@supabase/supabase-js@2.39.3");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Send OTP (magic link) to email
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { full_name: fullName },
        emailRedirectTo:
          Deno.env.get("EMAIL_REDIRECT_TO") ||
          "https://varatingassistant.com/dashboard",
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Send welcome email via send-email Edge Function
    const websiteUrl = Deno.env.get("WEBSITE_URL") || "https://yourwebsite.com";
    let welcomeEmailWarning = null;
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
            html: `<h1>Welcome, ${fullName}!</h1><p>Your username: <b>${email}</b></p><p>To get started, check your inbox for a one-time passcode (OTP) or magic link to log in. <br/>If you didn't receive it, you can request another from the login page.</p><p><a href='${websiteUrl}'>Go to VA Rating Assistant</a></p>`,
            text: `Welcome, ${fullName}!\nYour username: ${email}\nTo get started, check your inbox for a one-time passcode (OTP) or magic link to log in. If you didn't receive it, you can request another from the login page.\n${websiteUrl}`,
          }),
        },
      );
      if (!welcomeEmailRes.ok) {
        const err = await welcomeEmailRes.json().catch(() => ({}));
        welcomeEmailWarning =
          "User registered, but failed to send welcome email.";
        // Optionally log the error for debugging
        console.error("Welcome email error:", err);
      }
    } catch (err) {
      welcomeEmailWarning =
        "User registered, but failed to send welcome email.";
      // Optionally log the error for debugging
      console.error("Welcome email exception:", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: welcomeEmailWarning
          ? `Registration initiated. Check your email for a login link or OTP. (Warning: ${welcomeEmailWarning})`
          : "Registration initiated. Check your email for a login link or OTP.",
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    // Catch-all error handler
    console.error("Unexpected error in register function:", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected server error. Please try again later.",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
