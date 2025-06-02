import { supabase } from "./supabase";

export async function createUploadCheckoutSession(userId?: string) {
  try {
    const body: Record<string, unknown> = {
      mode: "payment",
      success_url: `${window.location.origin}/dashboard?checkout=success`,
      cancel_url: `${window.location.origin}/pricing?checkout=canceled`,
    };
    if (userId) body.user_id = userId;
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body,
      },
    );

    if (error) {
      throw new Error(error.message || "Failed to create checkout session");
    }

    if (!data?.url) {
      throw new Error("No checkout URL received from server");
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to process payment. Please try again.",
    );
  }
}

export async function createSubscriptionCheckoutSession(userId?: string) {
  try {
    const body: Record<string, unknown> = {
      mode: "subscription",
      success_url: `${window.location.origin}/dashboard?subscription=success`,
      cancel_url: `${window.location.origin}/pricing?subscription=canceled`,
    };
    if (userId) body.user_id = userId;
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body,
      },
    );

    if (error) {
      throw new Error(
        error.message || "Failed to create subscription checkout session",
      );
    }

    if (!data?.url) {
      throw new Error("No checkout URL received from server");
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error("Error creating subscription checkout session:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to process subscription. Please try again.",
    );
  }
}

export async function checkUserSubscription(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("stripe_user_subscriptions")
      .select("subscription_status")
      .maybeSingle();

    if (error) {
      console.error("Error checking subscription:", error);
      return false;
    }

    return (
      data?.subscription_status === "active" ||
      data?.subscription_status === "trialing"
    );
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
}

export async function checkUserUploadCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("upload_credits")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking upload credits:", error);
      return 0;
    }

    return data?.upload_credits || 0;
  } catch (error) {
    console.error("Error checking upload credits:", error);
    return 0;
  }
}

export async function openStripeCustomerPortal() {
  const supabaseClient = supabase;
  const session = supabaseClient.auth.getSession
    ? (await supabaseClient.auth.getSession()).data.session
    : null;
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("User is not authenticated");
  }
  const { data, error } = await supabase.functions.invoke(
    "create-customer-portal-session",
    {
      body: {},
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (error || !data?.url) {
    throw new Error(
      (error && error.message) ||
        "Failed to create Stripe customer portal session",
    );
  }
  window.location.href = data.url;
}

export interface StripeBillingInfo {
  subscription: Record<string, unknown> | null;
  invoices: Record<string, unknown>[];
}

export async function fetchStripeBillingInfo(): Promise<StripeBillingInfo> {
  const supabaseClient = supabase;
  const session = supabaseClient.auth.getSession
    ? (await supabaseClient.auth.getSession()).data.session
    : null;
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("User is not authenticated");
  }
  const { data, error } = await supabase.functions.invoke(
    "get-stripe-billing-info",
    {
      body: {},
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (error) {
    throw new Error(error.message || "Failed to fetch Stripe billing info");
  }
  return data as StripeBillingInfo;
}
