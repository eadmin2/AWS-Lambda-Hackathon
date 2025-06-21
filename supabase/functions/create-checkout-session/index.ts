// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { stripe } from "./_shared/stripe.ts";
import { supabase } from "./_shared/supabase.ts";
import { corsHeaders } from "./_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
      },
    });
  }

  // Require JWT authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: corsHeaders },
    );
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false },
  });
  let userId;
  try {
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    userId = user?.id;
    if (userError || !userId) throw new Error("No user ID in JWT");
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const { mode, success_url, cancel_url } = await req.json();

    // Get the appropriate price ID based on mode
    const priceId =
      mode === "subscription"
        ? Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_ID")
        : Deno.env.get("STRIPE_SINGLE_UPLOAD_PRICE_ID");

    if (!priceId) {
      throw new Error(`Price ID not found for mode: ${mode}`);
    }

    let customerId = undefined;
    let metadata = {};

    if (userId) {
      // Get user's email from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        throw new Error("User profile not found");
      }

      // Create or retrieve Stripe customer
      const { data: payment } = await supabase
        .from("payments")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .single();

      customerId = payment?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile.email,
          metadata: {
            user_id: userId,
          },
        });
        customerId = customer.id;

        // Store Stripe customer ID
        await supabase.from("payments").insert({
          user_id: userId,
          stripe_customer_id: customerId,
        });
      }
      metadata = { user_id: userId };
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : {}),
      mode: mode === "subscription" ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
      ...(Object.keys(metadata).length > 0
        ? {
            metadata,
            ...(mode === "subscription"
              ? { subscription_data: { metadata } }
              : { payment_intent_data: { metadata } }),
          }
        : {}),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
