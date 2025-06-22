// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { stripe } from "./_shared/stripe.ts";
import { supabase } from "./_shared/supabase.ts";
import { corsHeaders } from "./_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Product configuration mapping
const PRODUCT_CONFIG = {
  'starter': {
    name: 'Starter Pack',
    description: 'Analyze up to 50 pages with AI-powered condition identification',
    price: 2999, // $29.99 in cents
    tokens: 50
  },
  'file-review': {
    name: 'File Review Pack',
    description: 'Analyze up to 150 pages with priority processing and enhanced analysis',
    price: 4999, // $49.99 in cents
    tokens: 150
  },
  'full-review': {
    name: 'Full Review Pack',
    description: 'Analyze up to 500 pages with comprehensive medical record analysis',
    price: 8999, // $89.99 in cents
    tokens: 500
  },
  'tokens-100': {
    name: 'Token Boost',
    description: '100 additional tokens for document analysis',
    price: 1999, // $19.99 in cents
    tokens: 100
  },
  'tokens-250': {
    name: 'Token Pack',
    description: '250 additional tokens for document analysis',
    price: 3999, // $39.99 in cents
    tokens: 250
  },
  'tokens-500': {
    name: 'Token Bundle',
    description: '500 additional tokens for document analysis',
    price: 6999, // $69.99 in cents
    tokens: 500
  }
};

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
    const { mode, success_url, cancel_url, product_type } = await req.json();

    let priceId;
    let productConfig;

    if (product_type && PRODUCT_CONFIG[product_type]) {
      // Handle new token-based products
      productConfig = PRODUCT_CONFIG[product_type];
      
      // Create or get existing Stripe product and price
      const products = await stripe.products.list({
        limit: 100,
      });
      
      let product = products.data.find(p => p.metadata?.product_type === product_type);
      
      if (!product) {
        // Create new product
        product = await stripe.products.create({
          name: productConfig.name,
          description: productConfig.description,
          metadata: {
            product_type: product_type,
            tokens: productConfig.tokens.toString()
          }
        });
      }
      
      // Get or create price for this product
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 10,
      });
      
      let price = prices.data.find(p => p.unit_amount === productConfig.price);
      
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: productConfig.price,
          currency: 'usd',
          metadata: {
            product_type: product_type,
            tokens: productConfig.tokens.toString()
          }
        });
      }
      
      priceId = price.id;
    } else {
      // Fallback to legacy mode-based pricing
      priceId =
        mode === "subscription"
          ? Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_ID")
          : Deno.env.get("STRIPE_SINGLE_UPLOAD_PRICE_ID");
    }

    if (!priceId) {
      throw new Error(`Price ID not found for product: ${product_type || mode}`);
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

      // Check if user already has a Stripe customer ID
      const { data: existingCustomer } = await supabase
        .from("stripe_customers")
        .select("customer_id")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .single();

      customerId = existingCustomer?.customer_id;

      if (!customerId) {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: profile.email,
          metadata: {
            user_id: userId,
          },
        });
        customerId = customer.id;

        // Store Stripe customer mapping
        await supabase.from("stripe_customers").insert({
          user_id: userId,
          customer_id: customerId,
        });
      }
      
      metadata = { 
        user_id: userId,
        ...(product_type && { product_type: product_type }),
        ...(productConfig && { tokens: productConfig.tokens.toString() })
      };
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
