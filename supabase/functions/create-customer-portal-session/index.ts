// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: "Bolt Integration",
    version: "1.0.0",
  },
});

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
    // Look up Stripe customer ID for this user
    const { data: customer, error: getCustomerError } = await supabase
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (getCustomerError || !customer?.customer_id) {
      return corsResponse({ error: "Stripe customer not found for user" }, 404);
    }
    // Create a Stripe customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.customer_id,
      return_url: `${req.headers.get("origin") || "https://" + req.headers.get("host")}/profile`,
    });
    return corsResponse({ url: portalSession.url });
  } catch (error: any) {
    console.error("Error creating customer portal session:", error);
    return corsResponse({ error: error.message }, 500);
  }
});
