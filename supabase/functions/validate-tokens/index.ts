// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

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
  try {
    if (req.method === "OPTIONS") {
      return corsResponse({}, 204);
    }
    if (req.method !== "POST") {
      return corsResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return corsResponse({ error: "Missing Authorization header" }, 401);
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
      return corsResponse({ error: "Failed to authenticate user" }, 401);
    }

    const { pages_required } = await req.json();

    if (!pages_required || pages_required <= 0) {
      return corsResponse({ error: "Invalid pages_required parameter" }, 400);
    }

    // Get user's current token balance
    const { data: tokenBalance, error: balanceError } = await supabase
      .rpc("get_user_token_balance", {
        p_user_id: user.id,
      });

    if (balanceError) {
      console.error("Error getting token balance:", balanceError);
      return corsResponse({ error: "Failed to check token balance" }, 500);
    }

    const currentBalance = tokenBalance || 0;
    const hasEnoughTokens = currentBalance >= pages_required;

    if (!hasEnoughTokens) {
      return corsResponse({
        valid: false,
        current_balance: currentBalance,
        required: pages_required,
        shortage: pages_required - currentBalance,
        message: `Insufficient tokens. You need ${pages_required} tokens but only have ${currentBalance}. Please purchase more tokens to continue.`,
      });
    }

    return corsResponse({
      valid: true,
      current_balance: currentBalance,
      required: pages_required,
      remaining_after: currentBalance - pages_required,
      message: "Sufficient tokens available",
    });
  } catch (error: any) {
    console.error("Error validating tokens:", error);
    return corsResponse({ error: error.message }, 500);
  }
}); 