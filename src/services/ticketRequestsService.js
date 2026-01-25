import { supabase } from './supabaseClient.js';

/**
 * Create a ticket request for an event
 * @param {string} eventId - Event UUID
 * @param {number} quantity - Number of tickets requested
 * @param {string} note - Optional note/message
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createTicketRequest(eventId, quantity, note = '') {
    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            const error = new Error('Must be logged in to request tickets');
            console.error('User not authenticated:', userError);
            return { data: null, error };
        }
        
        const request = {
            event_id: eventId,
            requester_id: user.id,
            quantity: parseInt(quantity),
            note: note || null,
            status: 'pending'
        };
        
        const { data, error } = await supabase
            .from('ticket_requests')
            .insert(request)
            .select(`
                *,
                event:events(id, title, starts_at)
            `)
            .single();
        
        if (error) {
            console.error('Error creating ticket request:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in createTicketRequest:', error);
        throw error;
    }
}

/**
 * Get current user's ticket requests with event information
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getMyRequests() {
    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            const error = new Error('Must be logged in');
            console.error('User not authenticated:', userError);
            return { data: null, error };
        }
        
        const { data, error } = await supabase
            .from('ticket_requests')
            .select(`
                *,
                event:events(id, title, starts_at, status)
            `)
            .eq('requester_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching ticket requests:', error);
            return { data: null, error };
        }
        
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error in getMyRequests:', error);
        throw error;
    }
}

/**
 * Delete a ticket request
 * @param {string} id - Request UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function deleteRequest(id) {
    try {
        const { data, error } = await supabase
            .from('ticket_requests')
            .delete()
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error deleting ticket request:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in deleteRequest:', error);
        throw error;
    }
}

/**
 * Get all ticket requests for an event (admin use)
 * @param {string} eventId - Event UUID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getEventRequests(eventId) {
    try {
        const { data, error } = await supabase
            .from('ticket_requests')
            .select(`
                *,
                requester:profiles(id, display_name)
            `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching event requests:', error);
            return { data: null, error };
        }
        
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error in getEventRequests:', error);
        throw error;
    }
}

/**
 * Update ticket request status (admin/owner only)
 * @param {string} id - Request UUID
 * @param {string} status - New status ('approved' or 'rejected')
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateRequestStatus(id, status) {
    try {
        const { data, error } = await supabase
            .from('ticket_requests')
            .update({ status })
            .eq('id', id)
            .select(`
                *,
                event:events(id, title),
                requester:profiles(id, display_name)
            `)
            .single();
        
        if (error) {
            console.error('Error updating request status:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Unexpected error in updateRequestStatus:', error);
        throw error;
    }
}
