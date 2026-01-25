import { supabase } from './supabaseClient.js';

/**
 * Get all published events with optional filters
 * @param {Object} filters - Optional filters { search, venueId, fromDate }
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPublishedEvents(filters = {}) {
    try {
        let query = supabase
            .from('events')
            .select(`
                *,
                venue:venues(id, name, address, capacity)
            `)
            .eq('status', 'published')
            .order('starts_at', { ascending: true });
        
        // Apply search filter (title or description)
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        
        // Apply venue filter
        if (filters.venueId) {
            query = query.eq('venue_id', filters.venueId);
        }
        
        // Apply date filter (events starting from specified date)
        if (filters.fromDate) {
            query = query.gte('starts_at', filters.fromDate);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching published events:', error);
            return { data: null, error };
        }
        
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error in getPublishedEvents:', error);
        throw error; // Only throw for unexpected errors
    }
}

/**
 * Get event by ID with venue information
 * @param {string} id - Event UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getEventById(id) {
    try {
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                venue:venues(id, name, address, capacity)
            `)
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Error fetching event:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in getEventById:', error);
        throw error;
    }
}

/**
 * Create a new event
 * Sets created_by from current user, defaults status to 'draft'
 * @param {Object} eventData - Event data (title, description, starts_at, venue_id, etc.)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createEvent(eventData) {
    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            const error = new Error('Must be logged in to create events');
            console.error('User not authenticated:', userError);
            return { data: null, error };
        }
        
        // Prepare event data with created_by and default status
        const event = {
            ...eventData,
            created_by: user.id,
            status: eventData.status || 'draft' // Default to draft
        };
        
        const { data, error } = await supabase
            .from('events')
            .insert(event)
            .select(`
                *,
                venue:venues(id, name, address, capacity)
            `)
            .single();
        
        if (error) {
            console.error('Error creating event:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in createEvent:', error);
        throw error;
    }
}

/**
 * Update an existing event
 * @param {string} id - Event UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateEvent(id, updates) {
    try {
        const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                venue:venues(id, name, address, capacity)
            `)
            .single();
        
        if (error) {
            console.error('Error updating event:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in updateEvent:', error);
        throw error;
    }
}

/**
 * Delete an event
 * @param {string} id - Event UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function deleteEvent(id) {
    try {
        const { data, error } = await supabase
            .from('events')
            .delete()
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error deleting event:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in deleteEvent:', error);
        throw error;
    }
}

/**
 * Get all venues for dropdowns/filters
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
 * Get events created by current user (for My Events page)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getMyEvents() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            const error = new Error('Must be logged in');
            return { data: null, error };
        }
        
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                venue:venues(id, name, address, capacity)
            `)
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching user events:', error);
            return { data: null, error };
        }
        
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error in getMyEvents:', error);
        throw error;
    }
}
