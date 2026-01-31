-- Migration 006: Storage Bucket Policies
-- Date: 2026-01-31
-- Description: RLS policies for the 'event-assets' storage bucket
--
-- PREREQUISITE: 
-- The 'event-assets' bucket must be created first via Supabase Dashboard:
--   Storage → New Bucket → Name: "event-assets" → Public bucket: ON
--
-- These policies control who can upload, view, update, and delete files in the bucket.

-- ============================================================
-- STORAGE BUCKET POLICIES FOR 'event-assets'
-- ============================================================

-- 1. SELECT (View/Download) - Anyone can view/download public assets
-- This allows unauthenticated users to view event images
CREATE POLICY "Anyone can view event assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- 2. INSERT (Upload) - Only authenticated users can upload
-- Users must be logged in to upload files
CREATE POLICY "Authenticated users can upload event assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-assets');

-- 3. UPDATE (Replace) - Only file owner or admin can update
-- Users can only update files they uploaded
CREATE POLICY "Users can update own event assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'event-assets' 
    AND (
        auth.uid()::text = (storage.foldername(name))[2]
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);

-- 4. DELETE - Only file owner or admin can delete
-- Users can only delete files they uploaded, admins can delete any
CREATE POLICY "Users can delete own event assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'event-assets'
    AND (
        auth.uid()::text = (storage.foldername(name))[2]
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- File path structure: events/{event_id}/{timestamp}-{filename}
-- Example: events/abc123/1706745600000-photo.jpg
--
-- The bucket should be PUBLIC to allow unauthenticated viewing of images
-- on the event details page (for SEO and sharing).
--
-- To verify policies are working:
-- 1. Upload a file as authenticated user - should succeed
-- 2. View the file in incognito browser - should load
-- 3. Try to delete as different user - should fail
-- 4. Delete as owner or admin - should succeed
