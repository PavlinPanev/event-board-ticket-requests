# Supabase Setup Guide - Event Board + Ticket Requests

Complete step-by-step guide to configure Supabase backend for the Event Board application.

---

## 📋 Prerequisites

- ✅ Node.js installed (v18+)
- ✅ npm installed
- ✅ Git repository cloned
- ✅ Dependencies installed (`npm install`)
- ✅ Supabase account (free tier works fine)

---

## 🚀 Step 1: Create Supabase Project

### 1.1 Sign Up / Log In

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign in with GitHub, Google, or email

### 1.2 Create New Project

1. Click **"New Project"**
2. Fill in project details:
   - **Name**: `event-board-ticket-requests` (or your choice)
   - **Database Password**: Choose a **strong password** (save this!)
   - **Region**: Choose closest to your users (e.g., `Europe (Frankfurt)`)
   - **Pricing Plan**: `Free` (sufficient for development)
3. Click **"Create new project"**
4. ⏳ Wait 2-3 minutes for project to provision

### 1.3 Get API Credentials

Once project is ready:

1. Go to **Settings** (⚙️ icon in sidebar) → **API**
2. Click on **"Publishable and secret API keys"** tab (or **"Legacy API Keys"** tab if you don't see the new keys)
3. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Publishable API Key**: Starts with `sb_publishable_...` (new format) OR `eyJhbGc...` (legacy JWT format)
   
**Note:** 
- If you see **"Create new API Keys"** button, click it to generate the new format keys (`sb_publishable_...`)
- The new format is recommended but the legacy JWT-based `anon` key still works
- Use the **Publishable key** for client-side code (safe to expose in browser)
- The **Secret key** (`sb_secret_...` or `service_role`) should only be used in server-side code and never committed to git

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Create `.env` File

In the **root** of your project, create a file named `.env`:

```bash
# Navigate to project root
cd c:\Git_Repos\PPanevGitHub\SoftUni-Project-Pavlin\event-board-ticket-requests

# Create .env file (PowerShell)
New-Item -Path .env -ItemType File -Force
```

### 2.2 Add Supabase Credentials

Open `.env` and paste:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
# New format (recommended):
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR legacy format (still works):
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace** with your actual values from Step 1.3.

**⚠️ Important:** 
- Use the **Publishable API Key** (starts with `sb_publishable_` or legacy JWT `eyJ...`)
- **Never** use the Secret key (`sb_secret_...`) or `service_role` key in client-side code
- The Publishable key is safe for client-side use in the browser

### 2.3 Verify `.gitignore`

Ensure `.env` is NOT committed to git:

```bash
cat .gitignore
```

Should contain:
```
.env
.env.local
```

✅ If `.env` is listed, you're safe. **Never commit real credentials.**

---

### ⚠️ Important: Publishable vs Secret Keys

**Supabase now provides two types of API keys:**

| Key Type | Format | Usage | Safe for Client? | Notes |
|----------|--------|-------|------------------|-------|
| **Publishable** | `sb_publishable_xxx` (new)<br>OR `eyJ...` JWT (legacy `anon`) | Client-side (browser) | ✅ **YES** | This is what we use in `.env` |
| **Secret** | `sb_secret_xxx` (new)<br>OR `eyJ...` JWT (legacy `service_role`) | Server-side only | ❌ **NO** | Never expose in client code or git |

**Key Format Transition:**
- **New format** (`sb_publishable_`, `sb_secret_`): Recommended, easier to rotate, better security
- **Legacy format** (JWT `anon`, `service_role`): Still supported during transition period
- Both formats work, but migrate to new format when possible

**In this project:**
- We use the **Publishable API key** in `VITE_SUPABASE_ANON_KEY` (works with both formats)
- This is safe to use in browser because Row Level Security (RLS) protects your data
- The Publishable key only allows operations permitted by your RLS policies
- **Never** use the Secret key in client-side code - it bypasses RLS!

---

## 🗄️ Step 3: Run Database Migrations

Migrations must be run **in order** to set up database schema, RLS policies, seed data, and security fixes.

### 3.1 Open Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **"New query"**

### 3.2 Run Migration 001 - Schema

1. Open file: `supabase/migrations/001_schema.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Click **"Run"** (or press `Ctrl+Enter`)
5. ✅ Verify: "Success. No rows returned"

**What this does:**
- Creates 5 tables: `profiles`, `venues`, `events`, `ticket_requests`, `event_assets`
- Adds constraints, indexes, and relationships
- Enables UUID extension

### 3.3 Run Migration 002 - RLS Policies

1. Open file: `supabase/migrations/002_policies.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Click **"Run"**
5. ✅ Verify: "Success. No rows returned"

**What this does:**
- Enables Row Level Security (RLS) on all tables
- Creates 3 helper functions: `is_admin()`, `is_event_owner()`, `is_event_published()`
- Creates 27 RLS policies for select/insert/update/delete operations

### 3.4 Run Migration 003 - Seed Data

1. Open file: `supabase/migrations/003_seed.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Click **"Run"**
5. ✅ Verify: "Success. 5 rows affected" (or similar)

**What this does:**
- Inserts 5 sample venues (NDK Sofia, Varna Theatre, etc.)
- Prepares system for testing

### 3.5 Run Migration 004 - Security Fixes 🔒

1. Open file: `supabase/migrations/004_security_fixes.sql`
2. Copy **entire contents**
3. Paste into SQL Editor
4. Click **"Run"**
5. ✅ Verify: "Success. No rows returned"

**What this does:**
- Adds `search_path` protection to security definer functions (prevents SQL injection)
- Revokes anonymous access to helper functions
- Forces events to be created as `draft` only
- Removes user update policy on ticket requests (prevents race conditions)
- Restricts profile access to authenticated users only

**See:** [docs/security-fixes.md](docs/security-fixes.md) for detailed explanations.

### 3.6 Verify Tables Created

Go to **Table Editor** (left sidebar) and confirm you see:

- ✅ `profiles`
- ✅ `venues`
- ✅ `events`
- ✅ `ticket_requests`
- ✅ `event_assets`

---

## 📦 Step 4: Create Storage Bucket

Storage is used for event images and assets.

### 4.1 Navigate to Storage

1. Go to Supabase Dashboard → **Storage** (left sidebar)
2. Click **"New bucket"**

### 4.2 Create Public Bucket

1. **Name**: `event-assets`
2. **Public bucket**: ✅ **Enabled** (allows public read access)
3. Click **"Create bucket"**

### 4.3 Configure Bucket Policies (Optional)

For finer control, add policies:

1. Click on `event-assets` bucket
2. Go to **Policies** tab
3. Add policies:

**Allow authenticated users to upload:**
```sql
create policy "authenticated_can_upload"
on storage.objects for insert
with check (
  bucket_id = 'event-assets'
  and auth.role() = 'authenticated'
);
```

**Allow anyone to view:**
```sql
create policy "anyone_can_view"
on storage.objects for select
using (
  bucket_id = 'event-assets'
);
```

**Allow owners to delete:**
```sql
create policy "owner_can_delete"
on storage.objects for delete
using (
  bucket_id = 'event-assets'
  and auth.uid() = owner
);
```

---

## ✅ Step 5: Smoke Tests

Verify everything works by testing as different user types.

### 5.1 Start Development Server

```bash
npm run dev
```

Open `http://localhost:5173/`

---

## 🧪 Test Scenario 1: Guest User

**User Type:** Not logged in

### Expected Behavior:

| Action | Expected Result |
|--------|----------------|
| Visit `/index.html` | ✅ See published events list |
| Visit `/event-details.html?id={uuid}` | ✅ See event details (if published) |
| Visit `/create-event.html` | ❌ Redirected to `/login.html` |
| Visit `/my-requests.html` | ❌ Redirected to `/login.html` |
| Visit `/admin.html` | ❌ Redirected to `/login.html` |
| Navbar shows | ✅ "Login", "Register" |

### Test Steps:

1. Open browser in **Incognito/Private mode**
2. Go to `http://localhost:5173/`
3. Check navbar: Should show "Login" and "Register" links
4. Try to access `/create-event.html`: Should redirect to login
5. Open DevTools Console: Should NOT see RLS errors (403)

---

## 🧪 Test Scenario 2: Regular User

**User Type:** Logged in, role = `user`

### Expected Behavior:

| Action | Expected Result |
|--------|----------------|
| Visit `/index.html` | ✅ See all published events |
| Visit `/create-event.html` | ✅ See event creation form |
| Create event with status `draft` | ✅ Success |
| Create event with status `published` | ❌ RLS error (must be draft) |
| Update own event to `published` | ✅ Success (owner can publish) |
| Delete own event | ✅ Success |
| Delete other user's event | ❌ RLS error |
| Visit `/my-requests.html` | ✅ See own ticket requests |
| Visit `/admin.html` | ❌ Redirected to `/index.html` |
| Navbar shows | ✅ "Events", "Create", "My Requests", "Logout" |

### Test Steps:

1. Go to `/register.html`
2. Create account:
   - Display Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
3. ✅ Should auto-redirect to `/index.html` after registration
4. Check navbar: Should show "Events", "Create Event", "My Requests", "Logout"
5. Go to `/create-event.html`:
   - Fill in form with status = `draft`
   - Submit → ✅ Should succeed
6. Try to create event with status = `published`:
   - Fill in form
   - Change status dropdown to "Published"
   - Submit → ❌ Should fail with RLS policy violation
7. Go to `/my-requests.html`: Should see empty list (no requests yet)
8. Try to access `/admin.html`: Should redirect to `/index.html`

---

## 🧪 Test Scenario 3: Admin User

**User Type:** Logged in, role = `admin`

### Expected Behavior:

| Action | Expected Result |
|--------|----------------|
| Visit `/admin.html` | ✅ See admin dashboard |
| View all ticket requests | ✅ See all users' requests |
| Approve/reject ticket requests | ✅ Can update status |
| Delete any event | ✅ Success |
| Update any event | ✅ Success |
| Navbar shows | ✅ "Events", "Create", "My Requests", "Admin", "Logout" |

### Test Steps:

1. **Manually promote user to admin:**
   - Go to Supabase Dashboard → **Table Editor**
   - Open `profiles` table
   - Find your test user row
   - Change `role` from `user` to `admin`
   - Save
2. Refresh app in browser
3. Check navbar: Should now show "Admin" link
4. Go to `/admin.html`: Should see admin panel (not redirect)
5. Check console: No RLS errors

---

## 🐛 Troubleshooting

### Issue 1: RLS Policy Violation (403 Forbidden)

**Error:**
```
FetchError: FetchError: permission denied for table profiles
```

**Cause:** Row Level Security policy blocking the operation.

**Solutions:**

1. **Check if user is authenticated:**
   ```javascript
   import { supabase } from './services/supabaseClient.js';
   
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user);  // Should NOT be null
   ```

2. **Check RLS policies:**
   - Go to Supabase Dashboard → **Authentication** → **Policies**
   - Find table with error (e.g., `profiles`)
   - Verify policies exist and are enabled

3. **Check user role:**
   ```javascript
   const { data: profile } = await supabase
     .from('profiles')
     .select('role')
     .eq('id', user.id)
     .single();
   console.log('Role:', profile.role);  // Should be 'user' or 'admin'
   ```

4. **Re-run migration 002 and 004:**
   - May need to drop existing policies first
   - Or manually adjust policies in Table Editor

---

### Issue 2: Cannot Create Event (Always Draft)

**Error:**
```
RLS policy violation: events_insert_authenticated
```

**Cause:** Migration 004 restricts event creation to `status = 'draft'` only.

**Solution:**

1. **Create event as draft:**
   ```javascript
   await supabase.from('events').insert({
     title: 'My Event',
     status: 'draft'  // ✅ Required
   });
   ```

2. **Then update to published (if owner/admin):**
   ```javascript
   await supabase.from('events').update({
     status: 'published'
   }).eq('id', eventId);
   ```

**Why:** Prevents spam and enforces moderation workflow.

---

### Issue 3: Anonymous User Can't View Profiles

**Error:**
```
FetchError: permission denied for table profiles
```

**Cause:** Migration 004 restricts profile access to authenticated users.

**Solution:**

This is **intentional** for privacy. To view profiles, user must be logged in.

If you need public profiles, modify policy:

```sql
drop policy if exists "profiles_select_authenticated" on profiles;

create policy "profiles_select_all"
  on profiles for select
  using (true);  -- Allow anyone
```

**⚠️ Warning:** This exposes user data publicly. Only do this if needed.

---

### Issue 4: `auth.uid()` Returns NULL

**Symptoms:**
- RLS policies always block access
- `is_admin()` always returns false
- Can't create/update own records

**Cause:** User is not authenticated, or session expired.

**Solutions:**

1. **Check if logged in:**
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) {
     console.error('Not logged in!');
     window.location.href = '/login.html';
   }
   ```

2. **Refresh session:**
   ```javascript
   const { data: { session }, error } = await supabase.auth.refreshSession();
   if (error) console.error('Session refresh failed:', error);
   ```

3. **Check localStorage:**
   - Open DevTools → **Application** → **Local Storage**
   - Look for key starting with `sb-` (Supabase auth)
   - If missing, user needs to log in again

---

### Issue 5: Helper Functions Not Found

**Error:**
```
ERROR: function is_admin() does not exist
```

**Cause:** Migration 002 not run, or functions dropped.

**Solution:**

1. **Re-run migration 002:**
   - Go to SQL Editor
   - Paste contents of `002_policies.sql`
   - Run

2. **Then re-run migration 004:**
   - Paste contents of `004_security_fixes.sql`
   - Run (replaces functions with security fixes)

---

### Issue 6: Storage Upload Fails

**Error:**
```
FetchError: new row violates row-level security policy for table "objects"
```

**Cause:** No storage policies, or user not authenticated.

**Solutions:**

1. **Check bucket policies:**
   - Go to **Storage** → `event-assets` → **Policies**
   - Ensure policies exist (see Step 4.3)

2. **Check authentication:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) console.error('Must be logged in to upload');
   ```

3. **Check bucket name:**
   ```javascript
   const { data, error } = await supabase.storage
     .from('event-assets')  // ✅ Correct bucket name
     .upload('path/file.jpg', file);
   ```

---

### Issue 7: `.env` Not Loaded

**Symptoms:**
- `import.meta.env.VITE_SUPABASE_URL` is `undefined`
- Supabase client fails to initialize

**Cause:** Missing `VITE_` prefix, or dev server not restarted.

**Solutions:**

1. **Check `.env` has `VITE_` prefix:**
   ```env
   VITE_SUPABASE_URL=https://...      ✅
   SUPABASE_URL=https://...           ❌ Missing VITE_
   ```

2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Check Vite docs:**
   - Only `VITE_*` variables are exposed to client
   - Other env vars are NOT accessible in browser

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Storage Guide:** https://supabase.com/docs/guides/storage
- **Auth Guide:** https://supabase.com/docs/guides/auth
- **JavaScript Client:** https://supabase.com/docs/reference/javascript
- **SQL Reference:** https://www.postgresql.org/docs/

---

## 🎯 Next Steps

After completing Supabase setup:

1. ✅ **Implement Events Service** (`src/services/eventsService.js`)
   - `getPublishedEvents(filters)`
   - `getEventById(id)`
   - `createEvent(data)`
   - `updateEvent(id, data)`
   - `deleteEvent(id)`

2. ✅ **Implement Events List Page** (`src/pages/index.js`)
   - Fetch published events
   - Render event cards
   - Add search/filter
   - Add pagination

3. ✅ **Implement Event Details Page** (`src/pages/event-details.js`)
   - Fetch event by ID
   - Display event info
   - Show ticket request form
   - Display event assets

4. ✅ **Implement Ticket Requests Service** (`src/services/ticketRequestsService.js`)
   - `createRequest(eventId, quantity, notes)`
   - `getMyRequests()`
   - `updateRequestStatus(id, status)`

5. ✅ **Implement My Requests Page** (`src/pages/my-requests.js`)
   - Fetch user's requests
   - Display status badges
   - Add filter by status

6. ✅ **Implement Create Event Page** (`src/pages/create-event.js`)
   - Event creation form
   - Venue dropdown
   - Date/time picker
   - Image upload

7. ✅ **Implement Admin Panel** (`src/pages/admin.js`)
   - Dashboard with stats
   - Ticket requests management
   - Event moderation

---

## ✅ Verification Checklist

Before moving to implementation, verify:

- [ ] Supabase project created
- [ ] `.env` file configured with correct credentials
- [ ] All 4 migrations run in order (001 → 002 → 003 → 004)
- [ ] 5 tables visible in Table Editor
- [ ] Storage bucket `event-assets` created
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Guest user smoke test passed
- [ ] Regular user smoke test passed
- [ ] Admin user smoke test passed
- [ ] No RLS 403 errors in console
- [ ] `auth.uid()` returns valid UUID when logged in

**When all checked, you're ready to implement features! 🚀**
