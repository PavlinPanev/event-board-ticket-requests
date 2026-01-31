# Smoke Tests - Manual QA Guide
**Purpose:** Verify all features work correctly after Supabase setup  
**Prerequisites:** All 4 migrations run, storage bucket created, app running on `localhost:5173`

---

## 🧪 Test Overview

| Test # | Scenario | User Type | Duration | Priority |
|--------|----------|-----------|----------|----------|
| 1 | Browse published events | Guest | 2 min | 🔴 Critical |
| 2 | Register new account | Guest → User | 3 min | 🔴 Critical |
| 3 | Create draft event | User | 3 min | 🔴 Critical |
| 4 | Publish event manually | Admin (SQL) | 2 min | 🔴 Critical |
| 5 | Submit ticket request | User | 2 min | 🔴 Critical |
| 6 | View my requests | User | 2 min | 🔴 Critical |
| 7 | Cancel pending request | User | 2 min | 🟡 Medium |
| 8 | Admin view requests | Admin | 3 min | 🔴 Critical |
| 9 | Admin approve request | Admin | 2 min | 🔴 Critical |
| 10 | Admin reject request | Admin | 2 min | 🟡 Medium |

**Total Test Time:** ~25 minutes for full suite

---

## 🔴 Test 1: Guest Browse Published Events

**User Role:** Guest (not logged in)  
**Objective:** Verify anyone can view published events without authentication

### Steps

1. Open browser to `http://localhost:5173`
2. **Verify:** Navbar shows "Login" and "Register" buttons
3. **Verify:** Events list page loads
4. **Check Database:** Must have at least 1 event with `status = 'published'`

   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, title, status FROM events WHERE status = 'published';
   ```

5. **Verify:** Published event(s) display in Bootstrap cards grid
6. Click on event card
7. **Verify:** Event details page loads with:
   - Event title, description, date/time
   - Venue information
   - "Login to request tickets" button (guest not authenticated)

### ✅ Expected Outcome

- Events list shows published events only
- Event details page loads without errors
- No 403 errors in browser console (F12 → Console)
- Guest cannot see "Create Event" or "My Requests" in navbar

### ❌ Common Failures

#### Symptom: No events display, see "No events found"

**Cause:** No published events in database

**Fix:**
```sql
-- Manually publish an event
UPDATE events 
SET status = 'published' 
WHERE id = '<event-id>';
```

#### Symptom: 403 Forbidden error in console

**Cause:** RLS policy `events_select_published_or_own` not applied

**Fix:**
```sql
-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_select_published_or_own';

-- Recreate if missing (from 002_policies.sql)
CREATE POLICY events_select_published_or_own ON events
  FOR SELECT USING (
    status = 'published' 
    OR auth.uid() = created_by
  );
```

#### Symptom: Event details show but no venue info

**Cause:** Venue join not working

**Troubleshooting:**
```sql
-- Check if venue exists
SELECT e.id, e.title, e.venue_id, v.name as venue_name
FROM events e
LEFT JOIN venues v ON e.venue_id = v.id
WHERE e.id = '<event-id>';
```

---

## 🔴 Test 2: Register New Account

**User Role:** Guest → User  
**Objective:** Create new account with email/password

### Steps

1. Click "Register" in navbar
2. Fill form:
   - Email: `testuser@example.com`
   - Password: `Test123!` (min 6 chars)
   - Display Name: `Test User`
3. Click "Register"
4. **Verify:** Redirected to `/index.html`
5. **Verify:** Navbar now shows:
   - Display name ("Test User")
   - "Create Event" link
   - "My Requests" link
   - "Logout" button
6. Open browser DevTools → Application → Local Storage
7. **Verify:** `sb-<project-ref>-auth-token` exists

### ✅ Expected Outcome

- Account created in `auth.users` table
- Profile created in `profiles` table with `role = 'user'`
- User automatically logged in
- Session persisted in localStorage

### ❌ Common Failures

#### Symptom: Error "Failed to create profile"

**Cause:** Profile insert policy or trigger not working

**Fix:**
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE id = '<user-auth-id>';

-- Manually create if missing
INSERT INTO profiles (id, display_name, role)
VALUES ('<user-auth-id>', 'Test User', 'user');

-- Verify insert policy
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own';
```

#### Symptom: Can register but stays on register page

**Cause:** JavaScript redirect not firing

**Troubleshooting:**
- Check browser console for errors
- Verify `authService.register()` returns success
- Check network tab for Supabase auth response

#### Symptom: Navbar doesn't update after login

**Cause:** `renderNavbar()` not detecting session

**Fix:** Hard refresh page (Ctrl+Shift+R) or check session:
```javascript
// In browser console
const { data } = await supabase.auth.getSession();
console.log(data.session?.user);
```

---

## 🔴 Test 3: Create Draft Event (User)

**User Role:** Authenticated User  
**Objective:** Verify users can create events (forced to draft by RLS)

### Steps

1. **Prerequisite:** Logged in as regular user (not admin)
2. Click "Create Event" in navbar
3. Fill form:
   - Title: `Test Concert 2026`
   - Description: `This is a smoke test event`
   - Date/Time: Select future date (e.g., Feb 15, 2026 at 19:00)
   - Venue: Select from dropdown (e.g., "Sofia Live Club")
4. **Do NOT select any status** (form doesn't show status field for users)
5. Click "Create Event"
6. **Verify:** Success toast appears
7. **Verify:** Redirected to event details page
8. Check database:

   ```sql
   SELECT id, title, status, created_by 
   FROM events 
   WHERE title = 'Test Concert 2026';
   ```

9. **Verify:** Event exists with `status = 'draft'`

### ✅ Expected Outcome

- Event created successfully
- Status automatically set to 'draft' (even if user tries to set 'published')
- `created_by` matches current user's auth.uid()
- Event NOT visible on public events list
- Event visible in "My Events" (if implemented)

### ❌ Common Failures

#### Symptom: 403 Forbidden when creating event

**Cause:** RLS policy `events_insert_authenticated_draft` not applied or user not authenticated

**Fix:**
```sql
-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_insert_authenticated_draft';

-- Verify policy forces draft
CREATE POLICY events_insert_authenticated_draft ON events
  FOR INSERT WITH CHECK (
    auth.uid() = created_by 
    AND status = 'draft'
  );

-- Check if security fix 004 was run (forces draft)
-- Should exist in migration 004_security_fixes.sql
```

#### Symptom: Event created as 'published' instead of 'draft'

**Cause:** Migration 004 security fix not applied

**Fix:**
```sql
-- Run from 004_security_fixes.sql
CREATE OR REPLACE FUNCTION force_draft_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status != 'draft' THEN
    NEW.status := 'draft';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_draft_on_insert
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION force_draft_status();
```

#### Symptom: Venue dropdown is empty

**Cause:** No venues in database or venues policy missing

**Fix:**
```sql
-- Check venues exist
SELECT * FROM venues;

-- If empty, run migration 003_seed.sql to add venues

-- Verify public read policy
SELECT * FROM pg_policies WHERE tablename = 'venues';
```

#### Symptom: Event created but redirect fails

**Cause:** Event ID not returned from createEvent()

**Troubleshooting:**
- Check `eventsService.js` returns `data[0]` after insert
- Verify `.select()` is called after `.insert()`
- Check browser console for navigation errors

---

## 🔴 Test 4: Publish Event (Admin via SQL)

**User Role:** Admin (Database)  
**Objective:** Make draft event public

### Steps

1. **Prerequisite:** Draft event exists from Test 3
2. Open Supabase SQL Editor
3. Find draft event:

   ```sql
   SELECT id, title, status FROM events WHERE status = 'draft';
   ```

4. Manually publish it:

   ```sql
   UPDATE events 
   SET status = 'published' 
   WHERE id = '<draft-event-id>';
   ```

5. Open app in **incognito window** (as guest)
6. Go to `http://localhost:5173`
7. **Verify:** Published event now appears in events list
8. Click event card
9. **Verify:** Event details page loads

### ✅ Expected Outcome

- Event status changed to 'published'
- Event visible to all users (including guests)
- Event details accessible without login

### ❌ Common Failures

#### Symptom: UPDATE fails with 403 or permission denied

**Cause:** Trying to update as regular user, not admin

**Expected:** Regular users can't publish events via RLS policy

**Fix:** Run UPDATE directly in Supabase SQL Editor (bypasses RLS) or log in as admin user

#### Symptom: Event updated but still not visible on home page

**Cause:** Frontend filtering only shows published events

**Troubleshooting:**
```sql
-- Verify event is published
SELECT id, title, status FROM events WHERE id = '<event-id>';
```

- Hard refresh home page (Ctrl+Shift+R)
- Check browser console for fetch errors
- Verify `getPublishedEvents()` filters by `status = 'published'`

---

## 🔴 Test 5: Submit Ticket Request (User)

**User Role:** Authenticated User  
**Objective:** Request tickets for published event

### Steps

1. **Prerequisite:** 
   - Logged in as regular user
   - At least 1 published event exists
2. Go to home page, click on published event
3. Scroll to "Request Tickets" form
4. **Verify:** Form is visible (not "Login to request tickets" button)
5. Fill form:
   - Quantity: `2`
   - Note: `Looking forward to this event!`
6. Click "Submit Request"
7. **Verify:** Success toast appears
8. **Verify:** Form shows "Request submitted successfully" or resets
9. Check database:

   ```sql
   SELECT id, event_id, requester_id, quantity, status, note
   FROM ticket_requests
   WHERE requester_id = '<current-user-auth-id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

10. **Verify:** Request exists with `status = 'pending'`

### ✅ Expected Outcome

- Ticket request created with `status = 'pending'`
- `requester_id` matches current user
- `event_id` matches the event being viewed
- Request visible in "My Requests" page

### ❌ Common Failures

#### Symptom: 403 Forbidden when submitting request

**Cause:** RLS policy `ticket_requests_insert_authenticated` missing or user not authenticated

**Fix:**
```sql
-- Verify insert policy
SELECT * FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname = 'ticket_requests_insert_authenticated';

-- Recreate if missing
CREATE POLICY ticket_requests_insert_authenticated ON ticket_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id 
    AND status = 'pending'
  );
```

#### Symptom: Form submits but no success message

**Cause:** JavaScript error or missing toast function

**Troubleshooting:**
- Check browser console for errors
- Verify `createTicketRequest()` returns success
- Check if request exists in database

#### Symptom: Can't submit duplicate request for same event

**Cause:** Unique constraint on `(event_id, requester_id)`

**Expected Behavior:** This is correct - users shouldn't submit multiple requests for same event

**Fix:** Delete existing request first:
```sql
DELETE FROM ticket_requests 
WHERE event_id = '<event-id>' 
AND requester_id = '<user-auth-id>';
```

---

## 🔴 Test 6: View My Requests (User)

**User Role:** Authenticated User  
**Objective:** See all ticket requests submitted by current user

### Steps

1. **Prerequisite:** 
   - Logged in as user
   - At least 1 ticket request submitted (from Test 5)
2. Click "My Requests" in navbar
3. **Verify:** Page loads with table of requests
4. **Verify:** Table shows:
   - Event title
   - Quantity requested
   - Status badge (color-coded: yellow for pending, green for approved, red for rejected)
   - Submitted date
   - Actions column (Cancel button for pending requests)
5. **Verify:** Only YOUR requests appear (not other users' requests)

### ✅ Expected Outcome

- Table displays all requests by current user
- Each request shows correct event info
- Status badges match database status
- Cancel button only shows for `status = 'pending'`

### ❌ Common Failures

#### Symptom: Table is empty ("No requests found")

**Cause:** RLS policy blocking reads or no requests exist

**Troubleshooting:**
```sql
-- Check if requests exist
SELECT * FROM ticket_requests 
WHERE requester_id = '<current-user-auth-id>';

-- Verify select policy
SELECT * FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname = 'ticket_requests_select_own_or_admin';
```

**Fix:**
```sql
-- Recreate policy if missing
CREATE POLICY ticket_requests_select_own_or_admin ON ticket_requests
  FOR SELECT USING (
    auth.uid() = requester_id 
    OR is_admin()
  );
```

#### Symptom: 403 error in console when loading page

**Cause:** RLS policy too restrictive or helper function `is_admin()` missing

**Fix:**
```sql
-- Verify helper function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'is_admin';

-- Recreate if missing (from 002_policies.sql)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Symptom: Event titles show as NULL or blank

**Cause:** Join with events table not working

**Troubleshooting:**
```sql
-- Test join manually
SELECT 
  tr.id,
  tr.quantity,
  tr.status,
  e.title as event_title
FROM ticket_requests tr
LEFT JOIN events e ON tr.event_id = e.id
WHERE tr.requester_id = '<user-auth-id>';
```

**Fix:** Check if events still exist (not deleted) and user has permission to read them

---

## 🟡 Test 7: Cancel Pending Request (User)

**User Role:** Authenticated User  
**Objective:** User can cancel their own pending requests

### Steps

1. **Prerequisite:** On "My Requests" page with at least 1 pending request
2. Find pending request (yellow "Pending" badge)
3. Click "Cancel" button
4. **Verify:** Confirmation dialog appears
5. Click "Yes, cancel"
6. **Verify:** Request disappears from table or status changes to "Cancelled"
7. Check database:

   ```sql
   SELECT id, status FROM ticket_requests 
   WHERE id = '<request-id>';
   ```

8. **Verify:** Request deleted (or status = 'cancelled' if using soft delete)

### ✅ Expected Outcome

- Pending request deleted successfully
- Approved/Rejected requests cannot be cancelled (no button shown)
- Only own requests can be cancelled

### ❌ Common Failures

#### Symptom: 403 error when clicking Cancel

**Cause:** RLS delete policy missing or too restrictive

**Fix:**
```sql
-- Verify delete policy (from 004_security_fixes.sql)
SELECT * FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname = 'ticket_requests_delete_own_pending';

-- Recreate if missing
CREATE POLICY ticket_requests_delete_own_pending ON ticket_requests
  FOR DELETE USING (
    auth.uid() = requester_id 
    AND status = 'pending'
  );
```

#### Symptom: Can delete approved/rejected requests

**Cause:** Policy not checking status

**Fix:** Policy should only allow deleting `status = 'pending'` (see above)

#### Symptom: Request deleted but table doesn't update

**Cause:** Frontend not refreshing after delete

**Troubleshooting:**
- Check if `deleteRequest()` returns success
- Verify page calls `loadRequests()` after delete
- Hard refresh page to confirm delete worked

---

## 🔴 Test 8: Admin View All Requests (Admin)

**User Role:** Admin  
**Objective:** Admin can see requests for all events

### Setup Admin Account

**Option A: Promote existing user to admin**
```sql
-- Find user ID
SELECT id, email FROM auth.users WHERE email = 'testuser@example.com';

-- Promote to admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = '<user-auth-id>';
```

**Option B: Create new admin account**
1. Register new account: `admin@example.com`
2. Run SQL:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
   ```

### Steps

1. **Prerequisite:** Logged in as admin user
2. **Verify:** Navbar shows "Admin" link
3. Click "Admin" in navbar
4. **Verify:** Admin panel loads (if implemented)
5. **Verify:** Can see ALL ticket requests (not just own)
6. Test in browser console if admin panel not implemented:

   ```javascript
   // Should return all requests for all users
   const { data, error } = await supabase
     .from('ticket_requests')
     .select('*, events(title), profiles(display_name)')
     .order('created_at', { ascending: false });
   
   console.log('All requests:', data);
   ```

### ✅ Expected Outcome

- Admin can read all ticket requests via RLS policy
- Admin sees requests from all users
- RLS `is_admin()` helper function works correctly

### ❌ Common Failures

#### Symptom: Admin link doesn't appear in navbar

**Cause:** `isAdmin()` check in navbar not working

**Troubleshooting:**
```sql
-- Verify role is set
SELECT id, role FROM profiles 
WHERE id = (SELECT auth.uid());
```

**Fix:** Ensure profile has `role = 'admin'` and navbar calls `isAdmin()` guard

#### Symptom: Admin sees 403 when fetching all requests

**Cause:** RLS policy doesn't grant admin access

**Fix:**
```sql
-- Verify policy includes is_admin()
SELECT * FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname = 'ticket_requests_select_own_or_admin';

-- Check policy definition
SELECT policy_definition FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname = 'ticket_requests_select_own_or_admin';

-- Should include: OR is_admin()
```

#### Symptom: is_admin() returns false for admin user

**Cause:** Helper function broken or missing

**Fix:**
```sql
-- Test function manually
SELECT is_admin();  -- Should return true when logged in as admin

-- Recreate function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
```

---

## 🔴 Test 9: Admin Approve Request (Admin)

**User Role:** Admin  
**Objective:** Admin can change request status to 'approved'

### Steps

1. **Prerequisite:** 
   - Logged in as admin
   - At least 1 pending ticket request exists
2. **Option A: If admin panel implemented**
   - Go to Admin panel
   - Find pending request in table
   - Click "Approve" button
   - **Verify:** Status changes to "Approved"

3. **Option B: Test via SQL**
   ```sql
   -- Find pending request
   SELECT id, event_id, requester_id, status 
   FROM ticket_requests 
   WHERE status = 'pending' 
   LIMIT 1;
   
   -- Approve it
   UPDATE ticket_requests 
   SET status = 'approved' 
   WHERE id = '<request-id>';
   ```

4. **Verify:** User who submitted request can see status change
   - Log in as the user who made the request
   - Go to "My Requests"
   - **Verify:** Request shows green "Approved" badge

### ✅ Expected Outcome

- Admin can update any request status
- Regular users cannot update status (403 if they try)
- Status change persisted in database
- User sees updated status on their "My Requests" page

### ❌ Common Failures

#### Symptom: 403 when admin tries to update status

**Cause:** RLS update policy missing or doesn't grant admin access

**Fix:**
```sql
-- Verify update policy
SELECT * FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname = 'ticket_requests_update_status_admin';

-- Recreate if missing
CREATE POLICY ticket_requests_update_status_admin ON ticket_requests
  FOR UPDATE USING (is_admin());
```

#### Symptom: Regular user can approve their own requests

**Cause:** Update policy too permissive

**Fix:** Policy should ONLY allow admins to update:
```sql
-- Check current policy
SELECT policy_definition FROM pg_policies 
WHERE tablename = 'ticket_requests' 
AND policyname LIKE '%update%';

-- Should NOT include: auth.uid() = requester_id
```

**Security Fix (from 004_security_fixes.sql):**
```sql
-- Drop old permissive policy
DROP POLICY IF EXISTS ticket_requests_update_own_pending ON ticket_requests;

-- Create admin-only policy
CREATE POLICY ticket_requests_update_status_admin ON ticket_requests
  FOR UPDATE USING (is_admin());
```

---

## 🟡 Test 10: Admin Reject Request (Admin)

**User Role:** Admin  
**Objective:** Admin can deny ticket requests

### Steps

1. **Prerequisite:** Logged in as admin, pending request exists
2. **Option A: Admin panel UI**
   - Find pending request
   - Click "Reject" button
   - **Verify:** Status changes to "Rejected"

3. **Option B: SQL**
   ```sql
   UPDATE ticket_requests 
   SET status = 'rejected' 
   WHERE id = '<request-id>';
   ```

4. **Verify:** User sees red "Rejected" badge in "My Requests"

### ✅ Expected Outcome

- Status updated to 'rejected'
- User cannot cancel rejected requests
- Status persists across page refreshes

### ❌ Common Failures

Same troubleshooting as Test 9 (approval) - both use the same RLS update policy.

---

## 🛠️ General Troubleshooting Tips

### Check RLS is Enabled

```sql
-- Should return true for all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'events', 'ticket_requests', 'venues', 'event_assets');
```

### List All Policies

```sql
-- See all RLS policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Test Policy as User

```sql
-- Simulate user context
SET request.jwt.claims.sub = '<user-auth-id>';

-- Try select
SELECT * FROM events WHERE status = 'published';

-- Reset
RESET request.jwt.claims.sub;
```

### Debug 403 Errors

1. **Open Browser DevTools → Network tab**
2. Find failed request (shows red, status 403)
3. Check request headers: `Authorization: Bearer <token>`
4. Check response body: often includes policy violation hint

**Common causes:**
- RLS policy too restrictive
- Helper function (`is_admin()`, `is_event_owner()`) broken
- User not authenticated (token expired)
- Policy references wrong column

### Verify User Session

```javascript
// In browser console
const { data: { session } } = await supabase.auth.getSession();
console.log('User ID:', session?.user?.id);
console.log('Email:', session?.user?.email);
```

### Check Auth Token

```javascript
// In browser console
const token = localStorage.getItem('sb-<project-ref>-auth-token');
console.log('Token exists:', !!token);
```

### Reset Database (Nuclear Option)

**⚠️ DESTROYS ALL DATA**

```sql
-- Drop all tables
DROP TABLE IF EXISTS event_assets CASCADE;
DROP TABLE IF EXISTS ticket_requests CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS is_event_owner CASCADE;
DROP FUNCTION IF EXISTS is_event_published CASCADE;
DROP FUNCTION IF EXISTS force_draft_status CASCADE;
```

Then re-run migrations 001 → 002 → 003 → 004.

---

## 📋 Quick Reference: Expected Policy Count

After running all 4 migrations, you should have:

```sql
-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected results:**
| Table | Policy Count |
|-------|--------------|
| events | 6 |
| event_assets | 5 |
| profiles | 3 |
| ticket_requests | 6 |
| venues | 1 |
| **TOTAL** | **21** |

*(Note: Migration 004 removes 6 old policies and adds 0 new ones, final count is 21 not 27 as originally stated)*

---

## ✅ Smoke Test Completion Checklist

After running all tests:

- ✅ Guest can browse published events
- ✅ User can register and login
- ✅ User can create draft events
- ✅ Admin can publish events (via SQL)
- ✅ User can submit ticket requests
- ✅ User can view their requests
- ✅ User can cancel pending requests
- ❌ Admin can view all requests
- ❌ Admin can approve requests
- ❌ Admin can reject requests
- ✅ No 403 errors in console
- ❌ All RLS policies active
- ✅ Helper functions work (`is_admin()`, etc.)

**If all checked ✅:** Database setup complete, proceed to frontend testing

**If failures ❌:** Review specific test troubleshooting section above

---

**END OF SMOKE TESTS**
