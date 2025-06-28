// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

async function sendEmail(to: string, subject: string, htmlContent: string) {
  const resendApiKey = Deno.env.get("PICA_RESEND_CONNECTION_KEY");
  if (!resendApiKey) {
    throw new Error("PICA_RESEND_CONNECTION_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "VA Rating Assistant <noreply@varating.ai>",
      to: [to],
      subject: subject,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: cors });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: getUserError,
    } = await supabaseClient.auth.getUser();

    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: "Failed to authenticate user" }), { status: 401, headers: cors });
    }

    const { alert_type, pages_required, current_balance, shortage } = await req.json();

    if (!alert_type) {
      return new Response(JSON.stringify({ error: "Missing alert_type parameter" }), { status: 400, headers: cors });
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), { status: 404, headers: cors });
    }

    let subject: string;
    let htmlContent: string;

    switch (alert_type) {
      case "insufficient_tokens":
        subject = "Insufficient Tokens - VA Rating Assistant";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Insufficient Tokens</h2>
            <p>Hi ${profile.full_name || "there"},</p>
            <p>You attempted to analyze a document that requires <strong>${pages_required} tokens</strong>, but you currently have only <strong>${current_balance} tokens</strong> in your account.</p>
            <p>You need <strong>${shortage} more tokens</strong> to complete this analysis.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Purchase More Tokens</h3>
              <p>Choose from our token packages:</p>
              <ul>
                <li><strong>Token Boost:</strong> 100 tokens for $19.99</li>
                <li><strong>Token Pack:</strong> 250 tokens for $39.99</li>
                <li><strong>Token Bundle:</strong> 500 tokens for $69.99</li>
              </ul>
              <a href="${Deno.env.get("SITE_URL")}/pricing" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Buy Tokens Now</a>
            </div>
            <p>Thank you for using VA Rating Assistant!</p>
          </div>
        `;
        break;

      case "low_balance":
        subject = "Low Token Balance - VA Rating Assistant";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Low Token Balance</h2>
            <p>Hi ${profile.full_name || "there"},</p>
            <p>Your token balance is running low. You currently have <strong>${current_balance} tokens</strong> remaining.</p>
            <p>To avoid interruptions in your document analysis, consider purchasing more tokens.</p>
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">Recommended Action</h3>
              <p>Purchase additional tokens to continue analyzing your documents:</p>
              <ul>
                <li><strong>Token Boost:</strong> 100 tokens for $19.99</li>
                <li><strong>Token Pack:</strong> 250 tokens for $39.99</li>
                <li><strong>Token Bundle:</strong> 500 tokens for $69.99</li>
              </ul>
              <a href="${Deno.env.get("SITE_URL")}/pricing" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Buy Tokens Now</a>
            </div>
            <p>Thank you for using VA Rating Assistant!</p>
          </div>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Invalid alert_type" }), { status: 400, headers: cors });
    }

    // Send the email
    const emailResult = await sendEmail(profile.email, subject, htmlContent);

    return new Response(JSON.stringify({
      success: true,
      message: "Alert email sent successfully",
      email_id: emailResult.id,
    }), { headers: cors });
  } catch (error: any) {
    console.error("Error sending token alert:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
}); 