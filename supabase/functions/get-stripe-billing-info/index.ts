// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

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
    "Access-Control-Allow-Origin": "https://varatingassistant.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true"
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
    const origin = req.headers.get("origin") || undefined;
    if (req.method === "OPTIONS") {
      return handleCorsPreflightRequest(origin);
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: getCorsHeaders(origin),
      });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: getCorsHeaders(origin),
      });
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
      return new Response(JSON.stringify({ error: "Failed to authenticate user" }), {
        status: 401,
        headers: getCorsHeaders(origin),
      });
    }
    // Look up Stripe customer ID for this user
    const { data: customer, error: getCustomerError } = await supabase
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (getCustomerError || !customer?.customer_id) {
      // If customer is not found, it's not an error, just means they have no billing info.
      return new Response(JSON.stringify({
        subscription: null,
        invoices: [],
      }), {
        headers: getCorsHeaders(origin),
      });
    }
    // Fetch subscription info
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.customer_id,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });
    const subscription = subscriptions.data[0] || null;
    // Fetch invoice/payment history
    const invoices = await stripe.invoices.list({
      customer: customer.customer_id,
      limit: 20,
    });
    // Compose response
    return new Response(JSON.stringify({
      subscription,
      invoices: invoices.data,
    }), {
      headers: getCorsHeaders(origin),
    });
  } catch (error: any) {
    console.error("Error fetching Stripe billing info:", error);
    const origin = req.headers.get("origin") || undefined;
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
});
