// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { from, to, subject, tags, ...optionalFields } = body;
  if (!from || !to || !subject || !tags) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: from, to, subject, tags" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const PICA_SECRET_KEY = Deno.env.get("PICA_SECRET_KEY");
  const PICA_RESEND_CONNECTION_KEY = Deno.env.get("PICA_RESEND_CONNECTION_KEY");
  const PICA_ACTION_ID = "conn_mod_def::GC4q4JE4I28::x8Elxo0VRMK1X-uH1C3NeA";

  if (!PICA_SECRET_KEY || !PICA_RESEND_CONNECTION_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Pica API keys in environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const apiRes = await fetch("https://api.picaos.com/v1/passthrough/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pica-secret": PICA_SECRET_KEY,
        "x-pica-connection-key": PICA_RESEND_CONNECTION_KEY,
        "x-pica-action-id": PICA_ACTION_ID,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        tags,
        ...optionalFields,
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: apiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 