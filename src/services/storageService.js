/**
 * Storage Service
 * Handles file uploads to Supabase Storage and event_assets table management.
 * 
 * IMPORTANT: This implementation assumes the 'event-assets' bucket is PUBLIC.
 * If the bucket is configured as PRIVATE, URLs will return 403 errors.
 * 
 * To verify bucket is public:
 * 1. Upload a test file
 * 2. Get its public URL with getAssetUrl()
 * 3. Open the URL in an INCOGNITO/PRIVATE browser window
 * 4. File should load without authentication
 * 
 * If you get 403, enable public access:
 * Supabase Dashboard → Storage → event-assets → Settings → Enable "Public bucket"
 */

import { supabase } from './supabaseClient.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
];

/**
 * Sanitize file name by replacing spaces with hyphens and removing unsafe characters
 * @param {string} name - Original file name
 * @returns {string} Sanitized file name
 */
export function sanitizeFileName(name) {
    if (!name) return 'file';
    
    return name
        .replace(/\s+/g, '-')                    // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9._-]/g, '')         // Remove unsafe characters
        .replace(/^\.+/, '')                     // Remove leading dots
        .replace(/\.+$/, '')                     // Remove trailing dots
        .replace(/-+/g, '-')                     // Collapse multiple hyphens
        .toLowerCase()                           // Convert to lowercase
        .substring(0, 100);                      // Limit length
}

/**
 * Build storage path for an event asset
 * @param {string} eventId - UUID of the event
 * @param {string} fileName - Original or sanitized file name
 * @returns {string} Full storage path (e.g., 'events/123/1234567890-image.jpg')
 */
export function buildAssetPath(eventId, fileName) {
    const timestamp = Date.now();
    const sanitized = sanitizeFileName(fileName);
    return `events/${eventId}/${timestamp}-${sanitized}`;
}

/**
 * Upload an event asset file to storage
 * @param {Object} params - Upload parameters
 * @param {string} params.eventId - UUID of the event
 * @param {File} params.file - File object from input
 * @returns {Promise<{data: {asset: object, url: string}|null, error: Error|null}>}
 */
export async function uploadEventAsset({ eventId, file }) {
    try {
        // Validate inputs
        if (!eventId) {
            return { data: null, error: new Error('Event ID is required') };
        }
        if (!file) {
            return { data: null, error: new Error('File is required') };
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return { 
                data: null, 
                error: new Error(`File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`) 
            };
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return { 
                data: null, 
                error: new Error(`File type ${file.type} not allowed. Allowed types: images and PDF`) 
            };
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            return { data: null, error: userError };
        }
        if (!user) {
            return { data: null, error: new Error('User must be authenticated to upload files') };
        }

        // Build storage path
        const filePath = buildAssetPath(eventId, file.name);

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('event-assets')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });

        if (uploadError) {
            return { data: null, error: uploadError };
        }

        // Insert record into event_assets table
        const { data: asset, error: insertError } = await supabase
            .from('event_assets')
            .insert({
                event_id: eventId,
                uploaded_by: user.id,
                file_path: uploadData.path,
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size
            })
            .select()
            .single();

        if (insertError) {
            // Cleanup: delete uploaded file if database insert fails
            await supabase.storage
                .from('event-assets')
                .remove([uploadData.path]);
            return { data: null, error: insertError };
        }

        // Get public URL for the uploaded file
        const { data: url, error: urlError } = await getAssetUrl(uploadData.path);
        if (urlError) {
            console.warn('Failed to generate URL, but upload succeeded:', urlError);
        }

        return {
            data: {
                asset,
                url: url || null
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
            return { data: null, error: new Error('Event ID is required') };
        }

        const { data, error } = await supabase
            .from('event_assets')
            .select(`
                id,
                event_id,
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

        if (error) {
            return { data: null, error };
        }

        return { data, error: null };
    } catch (error) {
        console.error('getEventAssets error:', error);
        return { data: null, error };
    }
}

/**
 * Get public URL for an asset file
 * 
 * IMPORTANT: getPublicUrl() always returns a URL regardless of bucket privacy settings.
 * If the bucket is PRIVATE, the returned URL will be valid but inaccessible (returns 403).
 * 
 * To verify the bucket is truly public:
 * 1. Call this function to get the URL
 * 2. Open the URL in an incognito/private browser tab
 * 3. Check if the file loads without authentication
 * 
 * @param {string} filePath - Path to file in storage (e.g., 'events/123/456-image.jpg')
 * @returns {Promise<{data: string|null, error: Error|null}>}
 */
export async function getAssetUrl(filePath) {
    try {
        if (!filePath) {
            return { data: null, error: new Error('File path is required') };
        }

        const { data } = supabase.storage
            .from('event-assets')
            .getPublicUrl(filePath);

        // Note: getPublicUrl does not throw errors, it always returns a URL
        // The URL will be generated even if the bucket is private!
        if (!data?.publicUrl) {
            return { data: null, error: new Error('Failed to generate public URL') };
        }

        return { data: data.publicUrl, error: null };
    } catch (error) {
        console.error('getAssetUrl error:', error);
        return { data: null, error };
    }
}

/**
 * Delete an asset file and its database record
 * @param {Object} asset - Asset object with id and file_path
 * @param {string} asset.id - UUID of the asset record
 * @param {string} asset.file_path - Storage path of the file
 * @returns {Promise<{data: {success: boolean}|null, error: Error|null}>}
 */
export async function deleteAsset(asset) {
    try {
        if (!asset) {
            return { data: null, error: new Error('Asset object is required') };
        }
        if (!asset.id) {
            return { data: null, error: new Error('Asset ID is required') };
        }
        if (!asset.file_path) {
            return { data: null, error: new Error('Asset file path is required') };
        }

        // Delete file from storage
        const { error: storageError } = await supabase.storage
            .from('event-assets')
            .remove([asset.file_path]);

        if (storageError) {
            return { data: null, error: storageError };
        }

        // Delete database record
        const { error: deleteError } = await supabase
            .from('event_assets')
            .delete()
            .eq('id', asset.id);

        if (deleteError) {
            return { data: null, error: deleteError };
        }

        return { data: { success: true }, error: null };
    } catch (error) {
        console.error('deleteAsset error:', error);
        return { data: null, error };
    }
}
