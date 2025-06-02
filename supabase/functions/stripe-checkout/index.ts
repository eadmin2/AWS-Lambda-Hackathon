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

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  // For 204 No Content, don't include Content-Type or body
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

    const { price_id, success_url, cancel_url, mode } = await req.json();

    const error = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: "string",
        price_id: "string",
        success_url: "string",
        mode: { values: ["payment", "subscription"] },
      },
    );

    if (error) {
      return corsResponse({ error }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return corsResponse({ error: "Missing authorization header" }, 401);
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
    if (getUserError) {
      return corsResponse({ error: "Failed to authenticate user" }, 401);
    }
    if (!user) {
      return corsResponse({ error: "User not found" }, 404);
    }

    const { data: customer, error: getCustomerError } = await supabase
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (getCustomerError) {
      console.error(
        "Failed to fetch customer information from the database",
        getCustomerError,
      );

      return corsResponse(
        { error: "Failed to fetch customer information" },
        500,
      );
    }

    let customerId;

    /**
     * In case we don't have a mapping yet, the customer does not exist and we need to create one.
     */
    if (!customer || !customer.customer_id) {
      let newCustomer;
      try {
        newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
      } catch (stripeError) {
        console.error("Stripe customer creation failed:", stripeError);
        return corsResponse({ error: "Failed to create Stripe customer" }, 500);
      }

      console.log(
        `Created new Stripe customer ${newCustomer.id} for user ${user.id}`,
      );

      // Upsert mapping into stripe_customers
      const { error: upsertError } = await supabase
        .from("stripe_customers")
        .upsert(
          {
            user_id: user.id,
            customer_id: newCustomer.id,
          },
          { onConflict: "user_id" },
        );
      if (upsertError) {
        console.error(
          "Failed to upsert stripe_customers mapping:",
          upsertError,
        );
        // Optionally clean up the Stripe customer
        try {
          await stripe.customers.del(newCustomer.id);
        } catch {}
        return corsResponse(
          { error: "Failed to create customer mapping" },
          500,
        );
      }
      customerId = newCustomer.id;

      if (mode === "subscription") {
        const { error: createSubscriptionError } = await supabase
          .from("stripe_subscriptions")
          .insert({
            customer_id: customerId,
            status: "not_started",
          });

        if (createSubscriptionError) {
          console.error(
            "Failed to save subscription in the database",
            createSubscriptionError,
          );

          // Try to clean up the Stripe customer since we couldn't create the subscription
          try {
            await stripe.customers.del(customerId);
          } catch (deleteError) {
            console.error(
              "Failed to delete Stripe customer after subscription creation error:",
              deleteError,
            );
          }

          return corsResponse(
            { error: "Unable to save the subscription in the database" },
            500,
          );
        }
      }

      console.log(
        `Successfully set up new customer ${customerId} with subscription record`,
      );
    } else {
      customerId = customer.customer_id;

      if (mode === "subscription") {
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } =
          await supabase
            .from("stripe_subscriptions")
            .select("status")
            .eq("customer_id", customerId)
            .maybeSingle();

        if (getSubscriptionError) {
          console.error(
            "Failed to fetch subscription information from the database",
            getSubscriptionError,
          );

          return corsResponse(
            { error: "Failed to fetch subscription information" },
            500,
          );
        }

        if (!subscription) {
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase
            .from("stripe_subscriptions")
            .insert({
              customer_id: customerId,
              status: "not_started",
            });

          if (createSubscriptionError) {
            console.error(
              "Failed to create subscription record for existing customer",
              createSubscriptionError,
            );

            return corsResponse(
              {
                error:
                  "Failed to create subscription record for existing customer",
              },
              500,
            );
          }
        }
      }
    }

    // create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
      metadata: {
        user_id: user.id,
      },
    });

    console.log(
      `Created checkout session ${session.id} for customer ${customerId}`,
    );

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

type ExpectedType = "string" | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(
  values: T,
  expected: Expectations<T>,
): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === "string") {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== "string") {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(", ")}`;
      }
    }
  }

  return undefined;
}
