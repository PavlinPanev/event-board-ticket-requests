# Storage Feature End-to-End Testing Checklist

## Prerequisites

Before starting tests, ensure:

- [ ] Development server is running (`npm run dev`)
- [ ] Supabase project is configured and running
- [ ] `event-assets` bucket exists in Supabase Storage
- [ ] `event-assets` bucket is set to PUBLIC
- [ ] RLS policies are applied (check `supabase/migrations/`)
- [ ] You have test users: one regular user, one admin
- [ ] You can manually update event status in Supabase Dashboard (events are created as draft)

## Test Setup

### 1. Verify Database Schema

**IMPORTANT:** First apply the file_size migration:

```sql
-- Run this in Supabase SQL Editor if not already applied
alter table event_assets 
add column if not exists file_size integer;

comment on column event_assets.file_size is 'File size in bytes';
```

Then verify schema:

```sql
-- Check event_assets table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_assets'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- event_id (uuid)
-- uploaded_by (uuid)
-- file_path (text)
-- file_name (text)
-- mime_type (text)
-- created_at (timestamp with time zone)
-- file_size (integer) ← Should appear after running migration
```

### 2. Verify Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Confirm `event-assets` bucket exists
3. Click Settings (gear icon)
4. Verify **"Public bucket"** is ENABLED
5. Check Policies tab - should have INSERT policy for authenticated users

### 3. Create Test Event

1. Login as a regular user
2. Navigate to `/create-event.html`
3. Create a new event - **it will be created as 'draft' status** (security policy requirement)
4. Note the event ID from the URL after creation (e.g., `/event-details.html?id=XXXXXXXX`)
5. **IMPORTANT:** Before testing uploads, you need to publish the event:
   - Go to Supabase Dashboard → Table Editor → `events`
   - Find your event by ID
   - Change `status` from `'draft'` to `'published'`
   - Save changes
   
**Note:** Events must be published to be visible on the main events page. The RLS policy requires events to be created as draft for security reasons.

---

## Test Case 1: Upload Image as Event Owner

### Steps:

1. **Login as Event Owner**
   - Use the same user who created the test event
   - Verify you're logged in (check navbar shows account dropdown)

2. **Navigate to Event Details**
   ```
   http://localhost:5173/event-details.html?id=YOUR_EVENT_ID
   ```

3. **Open Browser DevTools**
   - Press F12
   - Go to Console tab
   - Clear console (click trash icon)

4. **Verify Upload Form Appears**
   - Scroll to "Assets" section
   - Should see "Upload Asset" form with:
     - File input
     - "Max 5MB" text
     - "Upload" button

5. **Select Test Image**
   - Click file input
   - Select a small image (< 5MB): JPEG, PNG, or GIF
   - Note the filename

6. **Monitor Console Before Upload**
   - Console should show global state:
   ```javascript
   // Optional: Check state manually
   console.log('User:', currentUser);
   console.log('Event:', currentEvent);
   console.log('Can Manage:', await canManageAssets(currentUser, currentEvent));
   ```

7. **Click Upload Button**
   - Button text should change to "Uploading..." with spinner
   - Wait for completion

### Expected Results:

✅ **Success Indicators:**
- Green alert appears: "File uploaded successfully!"
- File input clears
- Debug widget appears in bottom-right (if localhost or ?debug=true)
- Assets section reloads and shows uploaded image
- Image appears as thumbnail in grid
- Delete button (trash icon) appears on image

✅ **Console Output:**
```
🔍 [DEBUG] Asset URL Verification
File Path: events/xxx-xxx-xxx/1234567890-image.jpg
File Name: image.jpg
Public URL: https://xxx.supabase.co/storage/v1/object/public/event-assets/events/...
Click to test: [URL]
✅ [DEBUG] Asset URL is publicly accessible
```

✅ **Network Tab:**
- POST to `/storage/v1/object/event-assets/events/...` returns 200
- POST to `/rest/v1/event_assets` returns 201

❌ **Failure Scenarios:**

**Error: 403 on storage upload**
```
StorageApiError: The resource you are trying to access does not exist or you do not have permission
```
→ See storage-troubleshooting.md → Section 1

**Error: 403 on database insert**
```
PostgrestError: new row violates row-level security policy for table "event_assets"
```
→ See storage-troubleshooting.md → Section 2

**Error: File won't display as image**
```
Image thumbnail shows broken image icon
```
→ See storage-troubleshooting.md → Section 3

---

## Test Case 2: Verify event_assets Row Inserted

### Steps:

1. **Open Supabase Dashboard**
2. Navigate to **Table Editor** → `event_assets`
3. Look for the newly inserted row

### Expected Results:

✅ Row exists with:
- `id`: UUID (auto-generated)
- `event_id`: Matches your test event ID
- `uploaded_by`: Matches your user ID
- `file_path`: `events/<event-id>/<timestamp>-<filename>`
- `file_name`: Original filename (e.g., `image.jpg`)
- `mime_type`: Correct type (e.g., `image/jpeg`)
- `file_size`: File size in bytes
- `created_at`: Recent timestamp

### Verification Query:

```sql
SELECT 
  id,
  event_id,
  file_name,
  mime_type,
  file_size,
  file_path,
  uploaded_by,
  created_at
FROM event_assets
WHERE event_id = 'YOUR_EVENT_ID'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Test Case 3: Verify Public URL Opens

### Steps:

1. **Get Public URL** (3 methods):

   **Method A: From Debug Widget**
   - Click the URL in the debug widget
   - Opens in new tab

   **Method B: From Console**
   ```javascript
   // In browser console
   const { data: url } = await getAssetUrl('events/xxx/1234567890-image.jpg');
   console.log(url);
   window.open(url, '_blank');
   ```

   **Method C: From Assets Grid**
   - Click the image thumbnail in the Assets section
   - Opens in new tab

2. **Open URL in Incognito/Private Window**
   - Copy the URL
   - Open incognito mode (Ctrl+Shift+N in Chrome)
   - Paste URL and press Enter
   - **DO NOT login** - this tests public access

### Expected Results:

✅ **Success:**
- Image displays correctly in the browser
- No authentication required
- Status code 200 in Network tab
- Content-Type header matches file type (e.g., `image/jpeg`)

✅ **URL Format:**
```
https://[project-id].supabase.co/storage/v1/object/public/event-assets/events/[event-id]/[timestamp]-[filename]
```

❌ **Failure Scenarios:**

**403 Forbidden Error**
```xml
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
</Error>
```
→ Bucket is not public. Go to Storage → Settings → Enable "Public bucket"

**Download Instead of Display**
- File downloads as `download` instead of displaying
- Content-Type is `application/octet-stream`
→ Missing `contentType` in upload. See storage-troubleshooting.md → Section 3

---

## Test Case 4: Verify Asset Appears on Event Details Page

### Steps:

1. **Refresh Event Details Page**
   - Press F5 or reload page
   - Scroll to Assets section

2. **Check Image Display**
   - Image should appear in grid
   - Thumbnail size: 120px height
   - Hover shows cursor: pointer
   - Click opens in new tab

3. **Check Asset Metadata**
   - Filename displays below thumbnail
   - Text is truncated with ellipsis if too long

### Expected Results:

✅ **Visual Verification:**
- Image thumbnail renders correctly
- No broken image icon
- Delete button visible (if you're the owner/admin)
- Clicking image opens full-size in new tab

✅ **Grid Layout:**
- Responsive: 2 columns on mobile, 3 on desktop
- Images have rounded corners (Bootstrap thumbnail)
- Proper spacing between items

❌ **Failure Scenarios:**

**Image Not Appearing**
- Check browser console for errors
- Verify `loadAssets()` was called
- Check Network tab for failed `getEventAssets` request

**Broken Image Icon**
- URL is wrong or file was deleted
- Check Storage bucket to verify file exists

**No Delete Button**
- Check `canManageAssets()` returns true
- Verify you're logged in as owner or admin

---

## Test Case 5: Delete Asset

### Steps:

1. **Locate Delete Button**
   - Find the trash icon on the uploaded image
   - Button should be red, positioned top-right on thumbnail

2. **Click Delete Button**
   - A confirmation dialog should appear
   - Message: "Are you sure you want to delete this asset?"

3. **Confirm Deletion**
   - Click "OK" in dialog
   - Image should fade out (opacity 0.5)
   - Pointer events disabled during deletion

4. **Wait for Completion**
   - Assets section should reload
   - Image should disappear from grid

### Expected Results:

✅ **UI Behavior:**
- Confirmation dialog appears
- Visual feedback during deletion
- Asset removed from display after success
- No error alerts

✅ **Console Output:**
```
(No errors - successful silent deletion)
```

✅ **Network Tab:**
- DELETE to `/storage/v1/object/event-assets/events/...` returns 200
- DELETE to `/rest/v1/event_assets?id=eq.XXX` returns 204

---

## Test Case 6: Verify Storage Object Removed

### Steps:

1. **Check Supabase Storage**
   - Go to Supabase Dashboard → Storage
   - Navigate to `event-assets` → `events` → `[event-id]`
   - Verify file is gone

2. **Try Accessing URL Directly**
   - Copy the public URL from before deletion
   - Open in new incognito tab

### Expected Results:

✅ **Storage Bucket:**
- File no longer appears in folder
- Folder may be empty now

✅ **Direct URL Access:**
```xml
<Error>
  <Code>NoSuchKey</Code>
  <Message>The specified key does not exist.</Message>
</Error>
```
- Status code: 404 Not Found

---

## Test Case 7: Verify Database Row Removed

### Steps:

1. **Query event_assets Table**
```sql
SELECT * FROM event_assets
WHERE file_path = 'events/[event-id]/[timestamp]-[filename]';
```

2. **Check Row Count**
```sql
SELECT COUNT(*) FROM event_assets
WHERE event_id = 'YOUR_EVENT_ID';
```

### Expected Results:

✅ **Query Results:**
- No rows returned for the deleted asset
- Count decreased by 1

❌ **Failure Scenarios:**

**Row Still Exists**
- Check console for deletion error
- Verify RLS policies allow DELETE for owner/admin
- Check Network tab for failed DELETE request

**Storage File Still Exists**
- Indicates partial failure
- Storage deleted but database delete failed (or vice versa)
- Check error logs in Supabase Dashboard

---

## Additional Tests

### Test Case 8: Upload as Non-Owner

1. Logout
2. Login as different user
3. Navigate to same event details page
4. Upload form should NOT appear
5. No delete buttons on assets

### Test Case 9: Upload as Admin

1. Logout
2. Login as admin user (set role='admin' in profiles table)
3. Navigate to any event details page
4. Upload form SHOULD appear
5. Should be able to delete any asset

### Test Case 10: File Type Validation

Try uploading:
- ✅ JPEG image - should succeed
- ✅ PNG image - should succeed
- ✅ PDF file - should succeed
- ❌ TXT file - should fail with error
- ❌ 10MB image - should fail with size error

### Test Case 11: Multiple Assets

1. Upload 3-5 images
2. Verify all appear in grid
3. Delete one from the middle
4. Verify others remain
5. Delete all
6. Verify empty state appears

---

## Reporting Issues

If any test fails, capture:

### 1. Browser Console Output
```javascript
// Run before reporting
console.log({
  user: currentUser,
  event: currentEvent,
  eventId: currentEventId,
  timestamp: new Date().toISOString()
});
```

### 2. Network Tab
- Screenshot of failed request
- Request headers
- Response body

### 3. Supabase Logs
- Dashboard → Logs → Postgres Logs
- Filter by error level
- Include timestamp

### 4. Error Messages
- Exact error text from alerts
- Full error object from console
- Stack trace if available

### 5. Environment Info
- Browser and version
- Node.js version
- Supabase project ID (first 6 chars only)
- Migration files applied

---

## Success Criteria

All tests pass if:

- ✅ Images upload successfully
- ✅ event_assets rows created
- ✅ Public URLs work in incognito mode
- ✅ Assets display on page
- ✅ Delete removes both storage and DB
- ✅ Permissions work correctly (owner/admin vs non-owner)
- ✅ File validation works
- ✅ No console errors
- ✅ No 403/500 errors in Network tab
- ✅ Debug helper confirms accessibility

---

## Next Steps After Testing

Once all tests pass:

1. Remove or disable debug helper for production
2. Add error tracking (Sentry, etc.)
3. Add analytics for upload success/failure rates
4. Consider adding image optimization/thumbnails
5. Add progress bar for large file uploads
6. Implement drag-and-drop upload
7. Add asset preview modal
8. Add bulk delete functionality
