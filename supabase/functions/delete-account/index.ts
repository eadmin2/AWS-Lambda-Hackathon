// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "./_shared/supabase.ts";
import { stripe } from "./_shared/stripe.ts";
import { corsHeaders } from "./_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
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

    console.log(`Starting account deletion for user: ${userId}`);

    // 1. Fetch Stripe customer_id for this user (if any)
    const { data: stripeCustomer, error: stripeCustomerError } = await supabase
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (stripeCustomerError) throw stripeCustomerError;
    const customerId = stripeCustomer?.customer_id;

    // 2. Cancel Stripe subscriptions and delete customer (if exists)
    if (customerId) {
      console.log(`Processing Stripe customer: ${customerId}`);
      
      try {
        // Cancel all active subscriptions for this customer via Stripe API
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all"
        });
        
        for (const sub of subscriptions.data) {
          if (sub.status !== "canceled") {
            try {
              await stripe.subscriptions.del(sub.id);
              console.log(`✓ Cancelled Stripe subscription: ${sub.id}`);
            } catch (subError) {
              console.warn(`⚠ Could not cancel subscription ${sub.id}:`, subError.message);
              // Continue with other subscriptions
            }
          }
        }

        // Delete the Stripe customer via Stripe API
        await stripe.customers.del(customerId);
        console.log(`✓ Deleted Stripe customer: ${customerId}`);
        
      } catch (stripeError) {
        console.warn(`⚠ Stripe customer deletion failed for ${customerId}:`, stripeError.message);
        
        // Check if it's a "customer not found" error (customer may already be deleted)
        if (stripeError.code === 'resource_missing' || stripeError.message.includes('No such customer')) {
          console.log(`ℹ Customer ${customerId} was already deleted from Stripe - continuing with database cleanup`);
        } else {
          console.error(`⚠ Unexpected Stripe error:`, stripeError);
          // Don't throw here - we still want to clean up the database even if Stripe fails
        }
      }
    }

    // 3. Delete all user files from Supabase Storage (documents bucket)
    try {
      const { data: fileList, error: fileListError } = await supabase.storage
        .from("documents")
        .list(userId, {
          limit: 1000,
          offset: 0,
          search: ""
        });

      if (!fileListError && fileList && fileList.length > 0) {
        const paths = fileList.map((f) => `${userId}/${f.name}`);
        const { error: removeError } = await supabase.storage
          .from("documents")
          .remove(paths);
        
        if (removeError) {
          console.warn("Error removing files:", removeError);
        } else {
          console.log(`Deleted ${paths.length} files from storage`);
        }
      }
    } catch (storageError) {
      console.warn("Storage cleanup failed:", storageError);
      // Don't throw here - continue with database cleanup
    }

    // 4. Delete all user data from database tables in correct order to avoid foreign key issues
    console.log("Starting database cleanup...");

    // List of database views that should be skipped (they're read-only)
    const databaseViews = [
      "searchable_chunks",        // View of document_chunks + documents
      "stripe_user_orders",       // View of stripe_customers + stripe_orders  
      "stripe_user_subscriptions" // View of stripe_customers + stripe_subscriptions
    ];

    // Helper function to safely delete from table
    const safeDelete = async (tableName: string, whereClause: any, description: string) => {
      // Skip views - they can't be deleted from and will be cleaned automatically
      if (databaseViews.includes(tableName)) {
        console.log(`⏭ Skipping ${tableName} (view) - will be cleaned automatically when underlying tables are cleaned`);
        return;
      }

      try {
        const { error } = await supabase.from(tableName).delete().match(whereClause);
        if (error && error.code !== "42P01") { // 42P01 = table doesn't exist
          throw error;
        }
        console.log(`✓ Deleted from ${tableName}: ${description}`);
      } catch (error) {
        console.warn(`⚠ Failed to delete from ${tableName}: ${error.message}`);
        // For some tables, we might want to continue even if deletion fails
        if (!["admin_activity_log", "audit_log_entries", "processed_webhook_events"].includes(tableName)) {
          throw error;
        }
      }
    };

    // Delete dependent records first (respecting foreign key constraints)
    
    // Auth-related tables (Supabase managed)
    await safeDelete("sessions", { user_id: userId }, "user sessions");
    await safeDelete("mfa_factors", { user_id: userId }, "MFA factors");
    await safeDelete("identities", { user_id: userId }, "user identities");
    await safeDelete("one_time_tokens", { user_id: userId }, "one-time tokens");
    await safeDelete("refresh_tokens", { user_id: userId }, "refresh tokens");
    await safeDelete("flow_state", { user_id: userId }, "auth flow state");

    // Application-specific tables (ordered by dependencies)
    await safeDelete("condition_updates", { user_id: userId }, "condition updates");
    await safeDelete("searchable_chunks", { user_id: userId }, "searchable chunks");
    await safeDelete("document_chunks", { user_id: userId }, "document chunks");
    await safeDelete("document_summaries", { user_id: userId }, "document summaries");
    await safeDelete("medical_entities", { user_id: userId }, "medical entities");
    await safeDelete("textract_jobs", { user_id: userId }, "textract jobs");
    await safeDelete("disability_estimates", { user_id: userId }, "disability estimates");
    await safeDelete("user_conditions", { user_id: userId }, "user conditions");
    await safeDelete("documents", { user_id: userId }, "documents");
    await safeDelete("upload_sessions", { user_id: userId }, "upload sessions");
    
    // Token and purchase related
    await safeDelete("token_purchases", { user_id: userId }, "token purchases");
    await safeDelete("user_tokens", { user_id: userId }, "user tokens");
    await safeDelete("user_promotional_codes", { user_id: userId }, "promotional code usage");
    
    // Payment related
    await safeDelete("payments", { user_id: userId }, "payments");

    // Stripe-related tables (by customer_id)
    if (customerId) {
      await safeDelete("stripe_user_orders", { customer_id: customerId }, "Stripe user orders");
      await safeDelete("stripe_user_subscriptions", { customer_id: customerId }, "Stripe user subscriptions");
      await safeDelete("stripe_orders", { customer_id: customerId }, "Stripe orders");
      await safeDelete("stripe_subscriptions", { customer_id: customerId }, "Stripe subscriptions");
    }

    // Delete stripe_customers record
    await safeDelete("stripe_customers", { user_id: userId }, "Stripe customer record");

    // Storage-related cleanup (objects table - by owner)
    await safeDelete("objects", { owner: userId }, "storage objects by owner UUID");
    await safeDelete("objects", { owner_id: userId }, "storage objects by owner_id");

    // Admin activity logs (if user was an admin)
    await safeDelete("admin_activity_log", { admin_id: userId }, "admin activity logs");

    // Webhook processing logs
    await safeDelete("processed_webhook_events", { user_id: userId }, "webhook event logs");

    // Delete user profile
    await safeDelete("profiles", { id: userId }, "user profile");

    // 5. Delete user from Supabase Auth (auth.users) - this should be last
    console.log("Deleting user from auth.users...");
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Failed to delete from auth.users:", authError);
      throw authError;
    }

    console.log(`✓ Successfully completed account deletion for user: ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Account successfully deleted",
      details: {
        userId,
        customerId,
        deletedAt: new Date().toISOString()
      }
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
      error: error.message || "An unexpected error occurred",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});