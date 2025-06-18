import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getUserConditions(userId) {
    try {
        const { data, error } = await supabase
            .from('user_conditions')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user conditions:', error);
        throw error;
    }
}