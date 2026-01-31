# Storage Troubleshooting Guide

This document covers common file upload failures and how to debug them using browser console logs and Supabase Dashboard.

---

## Common Upload Failures

### 1. 403 Error on Storage Upload

**Symptom:**
```
StorageApiError: 403 Forbidden
new StorageError: The resource you are trying to access does not exist or you do not have permission to access it
```

**Causes:**

#### A. Bucket is Private
The `event-assets` bucket is not configured as public.

**How to Check:**
1. Open Supabase Dashboard → Storage
2. Click on `event-assets` bucket
3. Click "Settings" (gear icon)
4. Check if "Public bucket" toggle is OFF

**Fix:**
1. In Supabase Dashboard → Storage → `event-assets` → Settings
2. Toggle **"Public bucket"** to ON
3. Save changes
4. Retry upload

#### B. Missing Storage Policies
No RLS policies allow authenticated users to upload files.

**How to Check:**
1. Supabase Dashboard → Storage → Policies
2. Look for policies on `event-assets` bucket
3. Should have an INSERT policy allowing authenticated users

**Required Policy:**
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload event assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-assets' AND
  (storage.foldername(name))[1] = 'events'
);
```

**Fix:**
1. Go to SQL Editor in Supabase Dashboard
2. Run the above SQL to create the policy
3. Verify in Storage → Policies tab
4. Retry upload

---

### 2. 403 Error on event_assets Insert

**Symptom:**
```
File uploaded successfully to storage, but:
PostgrestError: 403 Forbidden
new row violates row-level security policy for table "event_assets"
```

**Cause:**
The RLS policy on the `event_assets` table has a `WITH CHECK` condition that rejects the insert.

**Common Issues:**

#### A. Event Ownership Mismatch
Policy checks `event.created_by = auth.uid()` but user is not the event owner.

**Debug Steps:**
```javascript
// In browser console on event-details page
console.log('Current User ID:', currentUser?.id);
console.log('Event Owner ID:', currentEvent?.created_by);
console.log('Match:', currentUser?.id === currentEvent?.created_by);
```

**Expected Policy:**
```sql
-- Allow event owners to add assets
CREATE POLICY "Event owners can insert assets"
ON event_assets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_assets.event_id
    AND events.created_by = auth.uid()
  )
);
```

**Fix:**
- Ensure you're logged in as the event owner
- OR add an admin bypass policy:
```sql
CREATE POLICY "Admins can insert assets"
ON event_assets
FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

#### B. Missing Required Columns
Policy checks columns that aren't being inserted.

**Debug Steps:**
```javascript
// Check what data is being inserted
const insertData = {
  event_id: eventId,
  uploaded_by: user.id,
  file_path: uploadData.path,
  file_name: file.name,
  mime_type: file.type,
  file_size: file.size
};
console.log('Insert Data:', insertData);
```

**Fix:**
- Ensure all required columns are included
- Check policy doesn't reference columns with NULL values
- Verify `uploaded_by` matches `auth.uid()`

---

### 3. Wrong contentType (File Won't Display)

**Symptom:**
- Upload succeeds
- File URL works but displays incorrectly
- Images download instead of displaying
- Browser shows "Content-Type: application/octet-stream"

**Cause:**
The `contentType` parameter was not passed during upload, or is incorrect.

**Debug Steps:**

1. **Check Upload Code:**
```javascript
// WRONG:
await supabase.storage
  .from('event-assets')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
    // Missing contentType!
  });

// CORRECT:
await supabase.storage
  .from('event-assets')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type  // ✅ Include this
  });
```

2. **Verify File MIME Type:**
```javascript
// In browser console before upload
const fileInput = document.getElementById('asset-file');
const file = fileInput.files[0];
console.log('File name:', file.name);
console.log('File type:', file.type);
console.log('File size:', file.size);
```

**Expected MIME Types:**
- JPEG: `image/jpeg`
- PNG: `image/png`
- GIF: `image/gif`
- WebP: `image/webp`
- SVG: `image/svg+xml`
- PDF: `application/pdf`

3. **Check Stored File Headers:**
```javascript
// Test the uploaded file URL
const url = 'https://xxx.supabase.co/storage/v1/object/public/event-assets/events/123/file.jpg';
const response = await fetch(url, { method: 'HEAD' });
console.log('Content-Type:', response.headers.get('content-type'));
```

**Fix Options:**

**Option 1: Fix Upload Code (Recommended)**
Update `uploadEventAsset()` to always pass `contentType`:
```javascript
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('event-assets')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type  // ✅ Always include
  });
```

**Option 2: Re-upload Files**
- Delete incorrectly uploaded files
- Re-upload with correct `contentType`

**Option 3: Manual Fix in Supabase (Not Recommended)**
- Not easily done through UI
- Would require direct database update of storage metadata

---

## General Debugging Workflow

### Step 1: Enable Detailed Console Logging

Add to your page initialization:
```javascript
// At top of event-details.js
console.log('🔧 Debug Mode: ON');
window.onerror = (msg, url, line, col, error) => {
  console.error('Global Error:', { msg, url, line, col, error });
};
```

### Step 2: Check Browser Console

Open DevTools (F12) → Console tab before attempting upload.

**Look for:**
- Red error messages
- Network errors (403, 500, etc.)
- Detailed error objects with `message` and `details`

### Step 3: Check Network Tab

1. Open DevTools (F12) → Network tab
2. Clear network log
3. Attempt upload
4. Look for failed requests (red status codes)
5. Click failed request → Preview/Response tabs to see error details

**Common Endpoints:**
- `POST /storage/v1/object/event-assets/...` - Storage upload
- `POST /rest/v1/event_assets` - Database insert

### Step 4: Check Supabase Dashboard

1. **Authentication:**
   - Dashboard → Authentication → Users
   - Verify user exists and is authenticated
   - Check user ID matches console logs

2. **Storage:**
   - Dashboard → Storage → `event-assets`
   - Check if files appear after upload
   - Verify bucket is public
   - Check Storage Policies

3. **Database:**
   - Dashboard → Table Editor → `event_assets`
   - Check if rows are inserted
   - Verify RLS policies on table

4. **Logs (Most Important):**
   - Dashboard → Logs → Postgres Logs
   - Filter by "error" or "security"
   - Look for RLS policy violations
   - Check timestamps match your upload attempt

### Step 5: Test with Debug Helper

Use the built-in debug helper:
```javascript
// In browser console after upload
await debugAssetUrl('events/123/456-test.jpg', 'test.jpg');
```

This will:
- Log the public URL
- Show a debug widget with clickable link
- Attempt to fetch the URL
- Report accessibility (200 OK vs 403 Forbidden)

---

## Quick Checklist

Before reporting an issue, verify:

- [ ] User is authenticated (check `currentUser` in console)
- [ ] Event exists and user has permission (owner or admin)
- [ ] `event-assets` bucket exists and is PUBLIC
- [ ] Storage policies allow INSERT for authenticated users
- [ ] RLS policies on `event_assets` table allow INSERT
- [ ] File size is under 5MB
- [ ] File type is allowed (images or PDF)
- [ ] `contentType` is passed in upload options
- [ ] File path follows pattern: `events/<uuid>/<timestamp>-<filename>`
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows no failed requests before the error

---

## Getting Help

If issues persist after following this guide:

1. **Capture Console Output:**
   ```javascript
   // Run in console before upload
   console.log({
     user: currentUser,
     event: currentEvent,
     eventId: currentEventId
   });
   ```
   Copy the output.

2. **Capture Network Errors:**
   - Screenshot of failed request in Network tab
   - Include Response body

3. **Check Supabase Logs:**
   - Dashboard → Logs → Filter by timestamp
   - Screenshot any errors

4. **Provide Context:**
   - What were you doing when error occurred?
   - What user role? (admin vs regular user)
   - Is this a new event or existing event?
   - First upload or subsequent upload?

5. **Check Migration Files:**
   - Review `supabase/migrations/*.sql`
   - Verify policies match documentation
   - Ensure migrations were applied in Supabase Dashboard

---

## Prevention Tips

- Always test uploads in incognito mode to verify public access
- Use the debug helper after every upload during development
- Set up proper error tracking (Sentry, LogRocket, etc.)
- Test with different user roles (owner, non-owner, admin)
- Validate file types before upload in frontend
- Add file size checks in frontend before attempting upload
- Include detailed error messages in user alerts
- Log all errors to console with full context
