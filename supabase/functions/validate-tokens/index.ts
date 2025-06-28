// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
  if (status === 204) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
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

    const { pages_required } = await req.json();

    if (!pages_required || pages_required <= 0) {
      return new Response(JSON.stringify({ error: "Invalid pages_required parameter" }), { status: 400, headers: cors });
    }

    // Get user's current token balance
    const { data: tokenBalance, error: balanceError } = await supabase
      .rpc("get_user_token_balance", {
        p_user_id: user.id,
      });

    if (balanceError) {
      console.error("Error getting token balance:", balanceError);
      return new Response(JSON.stringify({ error: "Failed to check token balance" }), { status: 500, headers: cors });
    }

    const currentBalance = tokenBalance || 0;
    const hasEnoughTokens = currentBalance >= pages_required;

    if (!hasEnoughTokens) {
      return new Response(JSON.stringify({
        valid: false,
        current_balance: currentBalance,
        required: pages_required,
        shortage: pages_required - currentBalance,
        message: `Insufficient tokens. You need ${pages_required} tokens but only have ${currentBalance}. Please purchase more tokens to continue.`,
      }), { headers: cors });
    }

    return new Response(JSON.stringify({
      valid: true,
      current_balance: currentBalance,
      required: pages_required,
      remaining_after: currentBalance - pages_required,
      message: "Sufficient tokens available",
    }), { headers: cors });
  } catch (error: any) {
    console.error("Error validating tokens:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
}); 