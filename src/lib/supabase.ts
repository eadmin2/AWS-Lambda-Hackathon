import { createClient, User } from "@supabase/supabase-js";
import { ConditionData } from "../components/ui/ConditionItem";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types based on the schema
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: "veteran" | "admin";
  payment_status?: "registered" | "paid" | "admin";
  payments?: Payment[];
  upload_credits?: number;
};

export type Payment = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  upload_credits: number;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  storage_path: string;
};

export type DisabilityEstimate = {
  id: number;
  document_id: string;
  condition: string;
  disability_rating: number;
  diagnostic_code: string;
  created_at: string;
  combined_rating: number;
};

export type UserCondition = {
  id: string;
  user_id: string;
  name: string;
  rating?: number;
  summary?: string;
  body_system?: string;
  keywords?: string[];
  cfr_criteria?: string;
  recommendation?: ConditionData;
};

export type UserTokens = {
  id: string;
  user_id: string;
  tokens_available: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
};

export type TokenPurchase = {
  id: string;
  user_id: string;
  stripe_payment_intent_id?: string;
  product_type: string;
  tokens_purchased: number;
  amount_paid: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  created_at: string;
  updated_at: string;
};

export type PromotionalCode = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount" | "free_tokens";
  discount_value: number;
  max_uses?: number;
  current_uses: number;
  valid_from: string;
  valid_until?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPromotionalCode = {
  id: string;
  user_id: string;
  promotional_code_id: string;
  used_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  created_at: string;
};

// User status management
export type UserStatus = "registered" | "paid" | "admin";

export interface UserPermissions {
  canUpload: boolean;
  canAccessPaidFeatures: boolean;
  canAccessAdminFeatures: boolean;
  hasActiveSubscription: boolean;
  hasUploadCredits: boolean;
  uploadCreditsRemaining: number;
}

// Helper functions for database operations
export async function getProfile(user: User): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, payments(*)")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in getProfile:", error);
    throw error;
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return data as Document[];
}

export async function getUserConditions(userId: string) {
  const { data, error } = await supabase
    .from("user_conditions")
    .select("*, recommendation")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as UserCondition[];
}

// User permission checking functions
export function getUserStatus(profile: Profile | null): UserStatus {
  if (!profile) return "registered";
  
  // Use database payment_status if available, otherwise calculate
  if (profile.payment_status) {
    return profile.payment_status;
  }
  
  // Fallback calculation for backward compatibility
  if (profile.role === "admin") return "admin";
  
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  const hasActiveSubscription = payments.some(p => p.subscription_status === 'active');
  const hasCredits = payments.some(p => p.upload_credits > 0);
  const isTrialing = payments.some(p => 
    p.subscription_status === 'trialing' && 
    p.subscription_end_date && 
    new Date(p.subscription_end_date) > new Date()
  );
  
  if (hasActiveSubscription || hasCredits || isTrialing) {
    return "paid";
  }
  
  return "registered";
}

export async function getUserPermissions(profile: Profile | null): Promise<UserPermissions> {
  const defaultPermissions: UserPermissions = {
    canUpload: false,
    canAccessPaidFeatures: false,
    canAccessAdminFeatures: false,
    hasActiveSubscription: false,
    hasUploadCredits: false,
    uploadCreditsRemaining: 0,
  };

  if (!profile) {
    return defaultPermissions;
  }

  const isAdmin = profile.role === "admin";
  const payments = Array.isArray(profile.payments) ? profile.payments : [];

  // Check for subscription and payment-based credits
  const hasActiveSubscription = payments.some(
    (p) => p.subscription_status === "active",
  );
  const hasPaymentCredits = payments.some((p) => (p.upload_credits || 0) > 0);
  const uploadCreditsFromPayments = payments.reduce(
    (total, p) => total + (p.upload_credits || 0),
    0,
  );

  // Check for token-based credits
  const tokenBalance = await getUserTokenBalance(profile.id);
  const hasTokens = tokenBalance > 0;

  // Combine permissions
  const canUpload = isAdmin || hasActiveSubscription || hasPaymentCredits || hasTokens;
  const canAccessPaidFeatures = isAdmin || hasActiveSubscription || hasPaymentCredits || hasTokens;
  const hasUploadCredits = hasPaymentCredits || hasTokens; // Consider both for this flag
  const uploadCreditsRemaining = uploadCreditsFromPayments + tokenBalance;

  return {
    canUpload,
    canAccessPaidFeatures,
    canAccessAdminFeatures: isAdmin,
    hasActiveSubscription,
    hasUploadCredits,
    uploadCreditsRemaining,
  };
}

// Token-related helper functions
export async function getUserTokenBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("user_tokens")
      .select("tokens_available")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No token record found, so balance is 0
        return 0;
      }
      console.error("Error fetching user token balance:", error);
      throw error;
    }

    return data?.tokens_available || 0;
  } catch (error) {
    console.error("Error in getUserTokenBalance:", error);
    return 0; // Return 0 in case of any other error
  }
}

export async function validateTokens(userId: string, tokensRequired: number): Promise<{
  valid: boolean;
  currentBalance: number;
  message?: string;
}> {
  const currentBalance = await getUserTokenBalance(userId);
  
  if (currentBalance >= tokensRequired) {
    return {
      valid: true,
      currentBalance,
    };
  }

  return {
    valid: false,
    currentBalance,
    message: `Insufficient tokens. You need ${tokensRequired} tokens but only have ${currentBalance}.`,
  };
}

export async function useTokens(userId: string, tokensToUse: number): Promise<boolean> {
  const { data, error } = await supabase
    .rpc("use_user_tokens", {
      p_user_id: userId,
      p_tokens: tokensToUse,
    });

  if (error) {
    console.error("Error using tokens:", error);
    return false;
  }

  return data || false;
}

export { supabaseAnonKey };
