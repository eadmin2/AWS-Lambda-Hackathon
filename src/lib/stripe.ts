import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''
);

export async function createUploadCheckoutSession(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        user_id: userId,
        mode: 'payment',
        success_url: `${window.location.origin}/dashboard?checkout=success`,
        cancel_url: `${window.location.origin}/pricing?checkout=canceled`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create checkout session');
    }

    if (!data?.url) {
      throw new Error('No checkout URL received from server');
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to process payment. Please try again.'
    );
  }
}

export async function createSubscriptionCheckoutSession(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        user_id: userId,
        mode: 'subscription',
        success_url: `${window.location.origin}/dashboard?subscription=success`,
        cancel_url: `${window.location.origin}/pricing?subscription=canceled`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create subscription checkout session');
    }

    if (!data?.url) {
      throw new Error('No checkout URL received from server');
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error('Error creating subscription checkout session:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to process subscription. Please try again.'
    );
  }
}

export async function checkUserSubscription(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('subscription_status')
      .maybeSingle();

    if (error) {
      console.error('Error checking subscription:', error);
      return false;
    }

    return data?.subscription_status === 'active' || data?.subscription_status === 'trialing';
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

export async function checkUserUploadCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('upload_credits')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking upload credits:', error);
      return 0;
    }

    return data?.upload_credits || 0;
  } catch (error) {
    console.error('Error checking upload credits:', error);
    return 0;
  }
}