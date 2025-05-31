import { createClient, User } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on the schema
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'veteran' | 'admin';
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
};

// Helper functions for database operations
export async function getProfile(user: User): Promise<Profile> {
  try {
    // First attempt to get the existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // If no profile exists or there's an error
    if (error || !data) {
      const newProfile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name || null,
        role: 'veteran' as const
      };

      try {
        // Attempt to create a new profile
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          // If error is due to duplicate key, profile was created concurrently
          if (createError.code === '23505') {
            // Fetch the existing profile
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (fetchError) throw fetchError;
            return existingProfile as Profile;
          }
          throw createError;
        }
        return createdProfile as Profile;
      } catch (err) {
        console.error('Error in profile creation:', err);
        throw err;
      }
    }
    
    return data as Profile;
  } catch (error) {
    console.error('Error in getProfile:', error);
    throw error;
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data as Profile;
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });
  
  if (error) throw error;
  return data as Document[];
}

// Storage helper functions
export async function uploadDocument(file: File, userId: string) {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

export async function deleteDocument(path: string) {
  try {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

export async function getUserDisabilityEstimates(userId: string) {
  const { data, error } = await supabase
    .from('disability_estimates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as DisabilityEstimate[];
}