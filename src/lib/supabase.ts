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
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 means no rows found, which is not an error in this context.
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

export function getUserPermissions(profile: Profile | null): UserPermissions {
  const defaultPermissions: UserPermissions = {
    canUpload: false,
    canAccessPaidFeatures: false,
    canAccessAdminFeatures: false,
    hasActiveSubscription: false,
    hasUploadCredits: false,
    uploadCreditsRemaining: 0,
  };

  if (!profile) return defaultPermissions;

  const isAdmin = profile.role === 'admin';
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  
  const activeSubscription = payments.some(p => p.subscription_status === 'active');
  const hasCredits = payments.some(p => p.upload_credits > 0);
  const uploadCreditsRemaining = payments.reduce((total, p) => total + (p.upload_credits || 0), 0);
  const isTrialing = payments.some(p => 
    p.subscription_status === 'trialing' && 
    p.subscription_end_date && 
    new Date(p.subscription_end_date) > new Date()
  );

  const hasActiveSubscription = activeSubscription || isTrialing;
  const canUpload = isAdmin || hasActiveSubscription || hasCredits;
  const canAccessPaidFeatures = isAdmin || hasActiveSubscription || hasCredits;

  return {
    canUpload,
    canAccessPaidFeatures,
    canAccessAdminFeatures: isAdmin,
    hasActiveSubscription,
    hasUploadCredits: hasCredits,
    uploadCreditsRemaining,
  };
}

export { supabaseAnonKey };
