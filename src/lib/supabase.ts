import { createClient, User } from "@supabase/supabase-js";

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
  payments?: Payment[];
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
};

export type UserCondition = {
  id: string;
  user_id: string;
  name: string;
  summary: string;
  body_system: string;
  keywords: string[];
  created_at: string;
  rating?: number;
  cfr_criteria?: string;
};

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
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as UserCondition[];
}

export { supabaseAnonKey };
