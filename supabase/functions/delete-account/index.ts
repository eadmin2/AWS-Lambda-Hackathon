// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabase } from './_shared/supabase.ts';
import { stripe } from './_shared/stripe.ts';
import { corsHeaders } from './_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow authenticated DELETE requests
  if (req.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Get user from JWT
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) {
    return new Response('Missing authorization header', { status: 401, headers: corsHeaders });
  }
  // Create a Supabase client as the current user (JWT in global.headers)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false }
  });
  let userId;
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    userId = user?.id;
    if (userError || !userId) throw new Error('No user ID in JWT');
  } catch (err) {
    return new Response('Invalid or expired token', { status: 401, headers: corsHeaders });
  }

  try {
    // 1. Fetch Stripe customer_id for this user (if any)
    const { data: stripeCustomer, error: stripeCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (stripeCustomerError) throw stripeCustomerError;
    const customerId = stripeCustomer?.customer_id;

    // 2. Cancel Stripe subscriptions and delete customer (if exists)
    if (customerId) {
      // Cancel all active subscriptions for this customer via Stripe API
      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
      for (const sub of subscriptions.data) {
        if (sub.status !== 'canceled') {
          await stripe.subscriptions.del(sub.id);
        }
      }
      // Delete the Stripe customer via Stripe API
      await stripe.customers.del(customerId);
    }

    // 3. Delete all user files from Supabase Storage (documents bucket)
    // List all files in the 'documents' bucket under userId/
    const { data: fileList, error: fileListError } = await supabase.storage
      .from('documents')
      .list(userId, { limit: 1000, offset: 0, search: '' });
    if (fileListError) throw fileListError;
    if (fileList && fileList.length > 0) {
      const paths = fileList.map(f => `${userId}/${f.name}`);
      const { error: removeError } = await supabase.storage.from('documents').remove(paths);
      if (removeError) throw removeError;
    }

    // 4. Delete all user data from database tables (in correct order)
    // Delete from disability_estimates
    const { error: deError } = await supabase.from('disability_estimates').delete().eq('user_id', userId);
    if (deError) throw deError;
    // Delete from documents
    const { error: docError } = await supabase.from('documents').delete().eq('user_id', userId);
    if (docError) throw docError;
    // Delete from payments
    const { error: payError } = await supabase.from('payments').delete().eq('user_id', userId);
    if (payError) throw payError;
    // Delete from stripe_orders (by customer_id)
    if (customerId) {
      const { error: soError } = await supabase.from('stripe_orders').delete().eq('customer_id', customerId);
      if (soError) throw soError;
    }
    // Delete from stripe_subscriptions (by customer_id)
    if (customerId) {
      const { error: ssError } = await supabase.from('stripe_subscriptions').delete().eq('customer_id', customerId);
      if (ssError) throw ssError;
    }
    // Delete from stripe_customers
    const { error: scError } = await supabase.from('stripe_customers').delete().eq('user_id', userId);
    if (scError) throw scError;
    // Delete from profiles
    const { error: profError } = await supabase.from('profiles').delete().eq('id', userId);
    if (profError) throw profError;

    // 5. Delete user from Supabase Auth (auth.users)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 