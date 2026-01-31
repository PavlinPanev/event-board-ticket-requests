/**
 * Storage Service
 * Handles file uploads to Supabase Storage and event_assets table management.
 * 
 * NOTE: This implementation assumes the 'event-assets' bucket is PUBLIC.
 * If the bucket is configured as PRIVATE, replace getAssetUrl() with signed URLs:
 * 
 * const { data, error } = await supabase.storage
 *   .from('event-assets')
 *   .createSignedUrl(filePath, 3600); // expires in 1 hour
 * 
 * return { data: data?.signedUrl, error };
 */

import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './authService.js';

/**
 * Upload an event asset file to storage
 * @param {string} eventId - UUID of the event
 * @param {File} file - File object from input
 * @returns {Promise<{data: {filePath: string, assetRecord: object}|null, error: Error|null}>}
 */
export async function uploadEventAsset(eventId, file) {
    try {
        // Validate inputs
        if (!eventId) {
            throw new Error('Event ID is required');
        }
        if (!file) {
            throw new Error('File is required');
        }

        // Get current user
        const { data: user, error: userError } = await getCurrentUser();
        if (userError) throw userError;
        if (!user) throw new Error('User must be authenticated to upload files');

        // Generate safe file name
        const timestamp = Date.now();
        const safeName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 100); // Limit length
        const filePath = `events/${eventId}/${timestamp}-${safeName}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('event-assets')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Insert record into event_assets table
        const { data: assetRecord, error: insertError } = await supabase
            .from('event_assets')
            .insert({
                event_id: eventId,
                file_path: filePath,
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
                uploaded_by: user.id
            })
            .select()
            .single();

        if (insertError) {
            // Cleanup: delete uploaded file if database insert fails
            await supabase.storage
                .from('event-assets')
                .remove([filePath]);
            throw insertError;
        }

        return {
            data: {
                filePath: uploadData.path,
                assetRecord
            },
            error: null
        };
    } catch (error) {
        console.error('uploadEventAsset error:', error);
        return { data: null, error };
    }
}

/**
 * Get all assets for an event
 * @param {string} eventId - UUID of the event
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getEventAssets(eventId) {
    try {
        if (!eventId) {
            throw new Error('Event ID is required');
        }

        const { data, error } = await supabase
            .from('event_assets')
            .select(`
                id,
                file_path,
                file_name,
                mime_type,
                file_size,
                created_at,
                uploader:profiles!uploaded_by (
                    display_name
                )
            `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('getEventAssets error:', error);
        return { data: null, error };
    }
}

/**
 * Get public URL for an asset file
 * @param {string} filePath - Path to file in storage (e.g., 'events/123/456-image.jpg')
 * @returns {Promise<{data: string|null, error: Error|null}>}
 */
export async function getAssetUrl(filePath) {
    try {
        if (!filePath) {
            throw new Error('File path is required');
        }

        const { data } = supabase.storage
            .from('event-assets')
            .getPublicUrl(filePath);

        // Note: getPublicUrl does not throw errors, it always returns a URL
        // Verify the URL is valid
        if (!data?.publicUrl) {
            throw new Error('Failed to generate public URL');
        }

        return { data: data.publicUrl, error: null };
    } catch (error) {
        console.error('getAssetUrl error:', error);
        return { data: null, error };
    }
}

/**
 * Delete an asset file and its database record
 * @param {string} assetId - UUID of the asset record
 * @returns {Promise<{data: {success: boolean}|null, error: Error|null}>}
 */
export async function deleteEventAsset(assetId) {
    try {
        if (!assetId) {
            throw new Error('Asset ID is required');
        }

        // Get asset record to find file path
        const { data: asset, error: fetchError } = await supabase
            .from('event_assets')
            .select('file_path')
            .eq('id', assetId)
            .single();

        if (fetchError) throw fetchError;
        if (!asset) throw new Error('Asset not found');

        // Delete file from storage
        const { error: storageError } = await supabase.storage
            .from('event-assets')
            .remove([asset.file_path]);

        if (storageError) throw storageError;

        // Delete database record
        const { error: deleteError } = await supabase
            .from('event_assets')
            .delete()
            .eq('id', assetId);

        if (deleteError) throw deleteError;

        return { data: { success: true }, error: null };
    } catch (error) {
        console.error('deleteEventAsset error:', error);
        return { data: null, error };
    }
}
