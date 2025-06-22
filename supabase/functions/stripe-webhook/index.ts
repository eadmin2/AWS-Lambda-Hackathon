// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: "Bolt Integration",
    version: "1.0.0",
  },
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("No signature found", { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret,
      );
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(
        `Webhook signature verification failed: ${error.message}`,
        { status: 400 },
      );
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.log("handleEvent called with event:", event.type, "ID:", event.id);

  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    console.log("No stripeData in event");
    return;
  }

  // Log the full event for debugging
  console.log("Event data:", JSON.stringify(stripeData, null, 2));

  if (!("customer" in stripeData)) {
    console.log("No customer in stripeData");
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === "payment_intent.succeeded") {
    console.log("Ignoring payment_intent.succeeded event");
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== "string") {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
    return;
  }

  // Check if this is a checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    console.log(
      `Processing checkout.session.completed: mode=${mode}, payment_status=${payment_status}`,
    );

    if (mode === "subscription") {
      console.info(`Starting subscription sync for customer: ${customerId}`);

      // Ensure stripe_customers mapping exists
      if (stripeData.metadata && stripeData.metadata.user_id) {
        const { error: upsertCustomerError } = await supabase
          .from("stripe_customers")
          .upsert(
            {
              user_id: stripeData.metadata.user_id,
              customer_id: customerId,
            },
            { onConflict: "user_id" },
          );
        if (upsertCustomerError) {
          console.error(
            "Failed to upsert stripe_customers mapping for subscription:",
            upsertCustomerError,
          );
          // Optionally, decide if you should stop or continue
        } else {
          console.info(
            "stripe_customers mapping ensured for subscription user:",
            stripeData.metadata.user_id,
          );
        }
      } else {
        console.warn(
          "No user_id in subscription session metadata; cannot upsert stripe_customers.",
        );
      }

      await syncCustomerFromStripe(customerId);
      return;
    }

    // Handle one-time payment
    if (mode === "payment" && payment_status === "paid") {
      try {
        console.log("Processing one-time payment for customerId:", customerId);
        console.log("Session metadata:", stripeData.metadata);

        // Ensure stripe_customers mapping exists (upsert)
        if (stripeData.metadata && stripeData.metadata.user_id) {
          const { error: upsertCustomerError } = await supabase
            .from("stripe_customers")
            .upsert(
              {
                user_id: stripeData.metadata.user_id,
                customer_id: customerId,
              },
              { onConflict: "user_id" },
            );

          if (upsertCustomerError) {
            console.error(
              "Failed to upsert stripe_customers after order:",
              upsertCustomerError,
            );
          } else {
            console.info(
              "stripe_customers mapping ensured for user:",
              stripeData.metadata.user_id,
            );
          }
        } else {
          console.warn(
            "No user_id in session metadata; cannot upsert stripe_customers.",
          );
        }

        // Find the user associated with this Stripe customer
        const { data: customerMap, error: customerMapError } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", customerId)
          .is("deleted_at", null)
          .maybeSingle();

        console.log(
          "stripe_customers lookup result:",
          customerMap,
          customerMapError,
        );

        if (customerMapError || !customerMap?.user_id) {
          console.error(
            "Could not find user for Stripe customer:",
            customerId,
            customerMapError,
          );
          return;
        }

        // Handle token-based purchases
        if (stripeData.metadata?.product_type && stripeData.metadata?.tokens) {
          const productType = stripeData.metadata.product_type;
          const tokensToAdd = parseInt(stripeData.metadata.tokens);
          const amountPaid = stripeData.amount_total || 0;

          console.log(
            `Processing token purchase: ${productType}, ${tokensToAdd} tokens for user:`,
            customerMap.user_id,
          );

          // Record the purchase
          const { error: purchaseError } = await supabase
            .from("token_purchases")
            .insert({
              user_id: customerMap.user_id,
              stripe_payment_intent_id: stripeData.payment_intent,
              product_type: productType,
              tokens_purchased: tokensToAdd,
              amount_paid: amountPaid,
              status: "completed",
            });

          if (purchaseError) {
            console.error("Failed to record token purchase:", purchaseError);
          }

          // Add tokens to user account
          const { data: addTokensResult, error: addTokensError } = await supabase
            .rpc("add_user_tokens", {
              p_user_id: customerMap.user_id,
              p_tokens: tokensToAdd,
            });

          if (addTokensError) {
            console.error("Failed to add tokens to user account:", addTokensError);
          } else {
            console.info(
              `Successfully added ${tokensToAdd} tokens to user ${customerMap.user_id}`,
            );
          }
        } else {
          // Legacy upload credit system
          console.log(
            "About to call increment_upload_credits RPC for user:",
            customerMap.user_id,
          );

          // Use RPC function for atomic increment
          const { data, error } = await supabase.rpc("increment_upload_credits", {
            p_user_id: customerMap.user_id,
            p_stripe_customer_id: customerId,
            p_increment_by: 1,
          });

          console.log("RPC call result:", { data, error });

          if (error) {
            console.error("Failed to increment upload credits:", error);
          } else if (data) {
            // Handle both array and single object responses
            const result = Array.isArray(data) ? data[0] : data;

            if (result && result.success) {
              console.info(
                `Successfully incremented upload credits for user ${customerMap.user_id} to ${result.new_credits}`,
              );
            } else if (result) {
              console.error(
                "RPC function returned failure:",
                result.message || "Unknown error",
              );
            } else {
              console.warn("No result data from increment_upload_credits RPC");
            }
          } else {
            console.warn("No data returned from increment_upload_credits RPC");
          }
        }
      } catch (error) {
        console.error("Error processing one-time payment:", error);
      }
      return;
    }
  }

  // Handle other webhook events if needed
  console.log(`Unhandled event type: ${event.type}`);
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    // Handle no subscriptions case
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase
        .from("stripe_subscriptions")
        .upsert(
          {
            customer_id: customerId,
            subscription_status: "not_started",
          },
          {
            onConflict: "customer_id",
          },
        );

      if (noSubError) {
        console.error("Error updating subscription status:", noSubError);
        throw new Error("Failed to update subscription status in database");
      }
      return;
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase
      .from("stripe_subscriptions")
      .upsert(
        {
          customer_id: customerId,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0].price.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          ...(subscription.default_payment_method &&
          typeof subscription.default_payment_method !== "string"
            ? {
                payment_method_brand:
                  subscription.default_payment_method.card?.brand ?? null,
                payment_method_last4:
                  subscription.default_payment_method.card?.last4 ?? null,
              }
            : {}),
          status: subscription.status,
        },
        {
          onConflict: "customer_id",
        },
      );

    // Also update the payments table for this user
    // First, look up the user_id from stripe_customers
    const { data: customerMap, error: customerMapError } = await supabase
      .from("stripe_customers")
      .select("user_id")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!customerMapError && customerMap?.user_id) {
      await supabase
        .from("payments")
        .update({
          subscription_status: subscription.status,
          subscription_end_date: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
        .eq("user_id", customerMap.user_id);
    }

    if (subError) {
      console.error("Error syncing subscription:", subError);
      throw new Error("Failed to sync subscription in database");
    }
    console.info(
      `Successfully synced subscription for customer: ${customerId}`,
    );
  } catch (error) {
    console.error(
      `Failed to sync subscription for customer ${customerId}:`,
      error,
    );
    throw error;
  }
}
