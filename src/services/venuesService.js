import { supabase } from './supabaseClient.js';

/**
 * Get all venues ordered by name
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getVenues() {
    try {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Error fetching venues:', error);
            return { data: null, error };
        }
        
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error in getVenues:', error);
        throw error;
    }
}

/**
 * Get venue by ID
 * @param {string} id - Venue UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getVenueById(id) {
    try {
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Error fetching venue:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in getVenueById:', error);
        throw error;
    }
}
