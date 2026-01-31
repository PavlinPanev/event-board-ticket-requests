/**
 * Admin Service
 * Provides admin-only operations for dashboard, moderation, and management.
 * All operations rely on RLS policies - requires admin role in profiles table.
 */

import { supabase } from './supabaseClient.js';

/**
 * Get admin dashboard statistics
 * @returns {Promise<{data: {pendingRequests: number, totalRequests: number, upcomingEvents: number, totalEvents: number}|null, error: Error|null}>}
 */
export async function getAdminStats() {
    try {
        const now = new Date().toISOString();

        // Run all count queries in parallel
        const [
            pendingRequestsResult,
            totalRequestsResult,
            upcomingEventsResult,
            totalEventsResult
        ] = await Promise.all([
            supabase
                .from('ticket_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending'),
            supabase
                .from('ticket_requests')
                .select('id', { count: 'exact', head: true }),
            supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .gte('starts_at', now),
            supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
        ]);

        // Check for errors in any query
        if (pendingRequestsResult.error) throw pendingRequestsResult.error;
        if (totalRequestsResult.error) throw totalRequestsResult.error;
        if (upcomingEventsResult.error) throw upcomingEventsResult.error;
        if (totalEventsResult.error) throw totalEventsResult.error;

        return {
            data: {
                pendingRequests: pendingRequestsResult.count ?? 0,
                totalRequests: totalRequestsResult.count ?? 0,
                upcomingEvents: upcomingEventsResult.count ?? 0,
                totalEvents: totalEventsResult.count ?? 0
            },
            error: null
        };
    } catch (error) {
        console.error('getAdminStats error:', error);
        return { data: null, error };
    }
}

/**
 * Get all pending ticket requests with event and requester details
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPendingRequests() {
    try {
        const { data, error } = await supabase
            .from('ticket_requests')
            .select(`
                id,
                quantity,
                note,
                status,
                created_at,
                requester_id,
                event:events (
                    id,
                    title,
                    starts_at
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch requester profiles separately
        if (data && data.length > 0) {
            const requesterIds = [...new Set(data.map(r => r.requester_id))];
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, display_name')
                .in('id', requesterIds);

            if (profileError) throw profileError;

            // Map profiles to requests
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            data.forEach(request => {
                request.requester = profileMap.get(request.requester_id) || { display_name: 'Unknown User' };
            });
        }

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('getPendingRequests error:', error);
        return { data: null, error };
    }
}

/**
 * Update ticket request status (approve/reject)
 * @param {string} requestId - UUID of the ticket request
 * @param {string} status - New status ('approved' or 'rejected')
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function setRequestStatus(requestId, status) {
    try {
        // Validate status
        const validStatuses = ['approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
        }

        const { data, error } = await supabase
            .from('ticket_requests')
            .update({ status })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('setRequestStatus error:', error);
        return { data: null, error };
    }
}

/**
 * Get all events for moderation with venue and creator details
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getEventsForModeration() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select(`
                id,
                title,
                description,
                starts_at,
                status,
                created_at,
                created_by,
                venue:venues (
                    id,
                    name
                )
            `)
            .order('starts_at', { ascending: true });

        if (error) throw error;

        // Fetch creator profiles separately
        if (data && data.length > 0) {
            const creatorIds = [...new Set(data.map(e => e.created_by))];
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, display_name')
                .in('id', creatorIds);

            if (profileError) throw profileError;

            // Map profiles to events
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            data.forEach(event => {
                event.creator = profileMap.get(event.created_by) || { display_name: 'Unknown User' };
            });
        }

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('getEventsForModeration error:', error);
        return { data: null, error };
    }
}

/**
 * Update event status (publish/archive/draft)
 * @param {string} eventId - UUID of the event
 * @param {string} status - New status ('published', 'archived', or 'draft')
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function setEventStatus(eventId, status) {
    try {
        // Validate status
        const validStatuses = ['published', 'archived', 'draft'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
        }

        const { data, error } = await supabase
            .from('events')
            .update({ status })
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('setEventStatus error:', error);
        return { data: null, error };
    }
}

/**
 * Delete an event (admin only via RLS)
 * @param {string} eventId - UUID of the event to delete
 * @returns {Promise<{data: {success: boolean}|null, error: Error|null}>}
 */
export async function deleteEvent(eventId) {
    try {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;

        return { data: { success: true }, error: null };
    } catch (error) {
        console.error('deleteEvent error:', error);
        return { data: null, error };
    }
}
