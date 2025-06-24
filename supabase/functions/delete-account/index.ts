// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "./_shared/supabase.ts";
import { stripe } from "./_shared/stripe.ts";
import { corsHeaders } from "./_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    // Only allow authenticated DELETE requests
    if (req.method !== "DELETE") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Get user from JWT
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Create a Supabase client as the current user (JWT in global.headers)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        persistSession: false
      }
    });
    let userId;
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      userId = user?.id;
      if (userError || !userId) throw new Error("No user ID in JWT");
    } catch (err) {
      return new Response(JSON.stringify({
        error: "Invalid or expired token"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // 1. Fetch Stripe customer_id for this user (if any)
    const { data: stripeCustomer, error: stripeCustomerError } = await supabase.from("stripe_customers").select("customer_id").eq("user_id", userId).maybeSingle();
    if (stripeCustomerError) throw stripeCustomerError;
    const customerId = stripeCustomer?.customer_id;
    // 2. Cancel Stripe subscriptions and delete customer (if exists)
    if (customerId) {
      // Cancel all active subscriptions for this customer via Stripe API
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all"
      });
      for (const sub of subscriptions.data){
        if (sub.status !== "canceled") {
          await stripe.subscriptions.del(sub.id);
        }
      }
      // Delete the Stripe customer via Stripe API
      await stripe.customers.del(customerId);
    }
    // 3. Delete all user files from Supabase Storage (documents bucket)
    // Note: You may want to uncomment and modify this section based on your storage setup
    try {
      const { data: fileList, error: fileListError } = await supabase.storage.from("documents").list(userId, {
        limit: 1000,
        offset: 0,
        search: ""
      });
      if (!fileListError && fileList && fileList.length > 0) {
        const paths = fileList.map((f)=>`${userId}/${f.name}`);
        const { error: removeError } = await supabase.storage.from("documents").remove(paths);
        if (removeError) {
          console.warn("Error removing files:", removeError);
        // Don't throw here - continue with database cleanup
        }
      }
    } catch (storageError) {
      console.warn("Storage cleanup failed:", storageError);
    // Don't throw here - continue with database cleanup
    }
    // 4. Delete all user data from database tables (in correct order to avoid foreign key issues)
    // Delete from disability_estimates
    const { error: deError } = await supabase.from("disability_estimates").delete().eq("user_id", userId);
    if (deError) throw deError;
    // Delete from documents
    const { error: docError } = await supabase.from("documents").delete().eq("user_id", userId);
    if (docError) throw docError;
    // Delete from payments
    const { error: payError } = await supabase.from("payments").delete().eq("user_id", userId);
    if (payError) throw payError;
    // Delete from user_tokens if it exists
    const { error: tokenError } = await supabase.from("user_tokens").delete().eq("user_id", userId);
    if (tokenError && tokenError.code !== "42P01") {
      throw tokenError;
    }
    // Delete from token_purchases if it exists
    const { error: purchaseError } = await supabase.from("token_purchases").delete().eq("user_id", userId);
    if (purchaseError && purchaseError.code !== "42P01") {
      throw purchaseError;
    }
    // Delete from stripe_orders (by customer_id)
    if (customerId) {
      const { error: soError } = await supabase.from("stripe_orders").delete().eq("customer_id", customerId);
      if (soError) throw soError;
    }
    // Delete from stripe_subscriptions (by customer_id)
    if (customerId) {
      const { error: ssError } = await supabase.from("stripe_subscriptions").delete().eq("customer_id", customerId);
      if (ssError) throw ssError;
    }
    // Delete from stripe_customers
    const { error: scError } = await supabase.from("stripe_customers").delete().eq("user_id", userId);
    if (scError) throw scError;
    // Delete from profiles
    const { error: profError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profError) throw profError;
    // 5. Delete user from Supabase Auth (auth.users) - this should be last
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;
    return new Response(JSON.stringify({
      success: true,
      message: "Account successfully deleted"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
