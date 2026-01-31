# Debug Admin Access Issue

## ⚡ Quick Method: Toggle Role via UI (For Testing/Evaluation)

**NEW:** The application now includes a built-in role toggle feature for easy testing!

1. **Login to the application**
2. **Click "Account" dropdown** in the top-right navbar
3. **View current role** - Displays as "user" or "admin" (color-coded)
4. **Click "Toggle Role"** button
5. **Confirm the change** - Alert shows new role
6. **Page reloads** - Changes take effect immediately

**How it works:**
- Toggles between `'user'` and `'admin'` roles
- Updates the `profiles.role` column in the database
- No SQL commands needed
- Perfect for examiners testing different permission levels

**Location:** [src/components/navbar.js](../src/components/navbar.js)

---

## Manual Method: SQL Commands

If you prefer or need to use direct database access:

## Step 1: Check Your User's Role in Database

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Check your current user's profile
SELECT 
    p.id,
    p.display_name,
    p.role,
    u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- Replace with your email
```

**Expected Result:**
- `role` column should show `'admin'`

If `role` is `'user'`, update it:

```sql
-- Update your user to admin (replace the email)
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);
```

## Step 2: Verify Profile Exists

```sql
-- Check if profile exists for all auth users
SELECT 
    u.id,
    u.email,
    p.role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
```

If your user doesn't have a profile entry, create one:

```sql
-- Create admin profile (replace the email)
INSERT INTO profiles (id, display_name, role)
SELECT 
    id, 
    SPLIT_PART(email, '@', 1), 
    'admin'
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## Step 3: Browser Console Debug

Open browser DevTools (F12) → Console tab and run:

```javascript
// Check current session
const { data: session } = await supabase.auth.getSession();
console.log('User ID:', session.session?.user?.id);
console.log('User Email:', session.session?.user?.email);

// Check profile
const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.session?.user?.id)
    .single();
console.log('Profile:', profile);

// Check isAdmin function
const { data: isAdminResult } = await supabase.rpc('is_admin');
console.log('Is Admin:', isAdminResult);
```

## Step 4: Check RLS Policies

Verify the `is_admin()` function exists:

```sql
-- Check if function exists
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'is_admin'
AND n.nspname = 'public';
```

Should return the function definition with search_path protection.

## Step 5: Test isAdmin() Function Directly

```sql
-- Test as current user (run this while logged in)
SELECT is_admin();
```

Should return `true` if you're admin.

## Common Issues:

### Issue 1: No Profile Entry
**Symptom:** User exists in auth.users but not in profiles table  
**Fix:** Run Step 2 SQL to create profile

### Issue 2: Wrong Role Value
**Symptom:** Profile exists but role is 'user' not 'admin'  
**Fix:** Run Step 1 SQL to update role

### Issue 3: Function Not Found
**Symptom:** Console shows error about is_admin() function  
**Fix:** Re-run migrations, especially 002_policies.sql and 004_security_fixes.sql

### Issue 4: Cache Issue
**Symptom:** Everything looks correct but still denied  
**Fix:** 
1. Clear browser cache and cookies
2. Logout and login again
3. Check in incognito window

## Quick Fix Commands:

```sql
-- All-in-one: Make current user admin
-- (Run this in Supabase SQL Editor while logged in)
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get current authenticated user
    SELECT auth.uid() INTO current_user_id;
    
    -- Create or update profile to admin
    INSERT INTO profiles (id, display_name, role)
    VALUES (
        current_user_id,
        (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE id = current_user_id),
        'admin'
    )
    ON CONFLICT (id) 
    DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'User % is now admin', current_user_id;
END $$;
```

After running this, **logout and login again** for changes to take effect.
