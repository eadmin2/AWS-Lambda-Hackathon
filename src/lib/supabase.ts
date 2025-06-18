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
};

export type Document = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
};

export type DisabilityEstimate = {
  id: string;
  user_id: string;
  document_id: string;
  condition: string;
  estimated_rating: number;
  combined_rating: number;
  created_at: string;
  excerpt?: string;
  cfr_criteria?: string;
  matched_keywords?: string[];
};

// Helper functions for database operations
export async function getProfile(user: User): Promise<Profile> {
  try {
    // First attempt to get the existing profile
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // If no profile exists or there's an error
    if (error || !data) {
      const newProfile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name || null,
        role: "veteran" as const,
      };

      try {
        // Use upsert instead of insert to avoid conflicts
        const { data: upsertedProfile, error: upsertError } = await supabase
          .from("profiles")
          .upsert([newProfile], { onConflict: "id" })
          .select()
          .single();

        if (upsertError) {
          throw upsertError;
        }
        return upsertedProfile as Profile;
      } catch (err) {
        console.error("Error in profile upsert:", err);
        throw err;
      }
    }

    return data as Profile;
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

export async function getUserDisabilityEstimates(userId: string) {
  const { data, error } = await supabase
    .from("disability_estimates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DisabilityEstimate[];
}

export { supabaseAnonKey };
