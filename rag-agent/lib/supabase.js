// FIXED VERSION: Update your lib/supabase.js file with this corrected function

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend operations

export const supabase = createClient(supabaseUrl, supabaseKey);

// FIXED: Changed from 'disability_estimates' to 'user_conditions' to match your processing
export async function getUserConditions(userId) {
    try {
        const { data, error } = await supabase
            .from('user_conditions')  // ✅ FIXED: Changed to correct table
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }); // Get newest first
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user conditions:', error);
        throw error;
    }
}

// ADDITIONAL: Add helper function to get conditions with better structure
export async function getUserConditionsWithDetails(userId) {
    try {
        const { data, error } = await supabase
            .from('user_conditions')
            .select(`
                id,
                name,
                summary,
                body_system,
                keywords,
                rating,
                cfr_criteria,
                recommendation,
                name_normalized,
                created_at
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching detailed user conditions:', error);
        throw error;
    }
}

// ADDITIONAL: Helper to get conditions by body system
export async function getUserConditionsBySystem(userId, bodySystem = null) {
    try {
        let query = supabase
            .from('user_conditions')
            .select('*')
            .eq('user_id', userId);
            
        if (bodySystem) {
            query = query.eq('body_system', bodySystem);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching conditions by system:', error);
        throw error;
    }
}