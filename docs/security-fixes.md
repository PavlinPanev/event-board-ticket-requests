# Security Hardening - Why These Fixes Are Critical

**Migration:** `supabase/migrations/004_security_fixes.sql`  
**Date:** January 24, 2026  
**Priority:** 🔴 HIGH - Run before production deployment

---

## 🚨 Security Issues Found & Fixed

### 1. SQL Injection via `search_path` Manipulation ⚠️

**Issue:** Helper functions (`is_admin()`, `is_event_owner()`, `is_event_published()`) were marked as `security definer` but **did NOT set `search_path`**.

**Attack Vector:**
```sql
-- Attacker can create malicious tables/functions
SET search_path = malicious_schema, public;

-- When RLS policy calls is_admin(), it executes in malicious_schema
-- Attacker's fake is_admin() function returns TRUE
-- Attacker gains admin privileges
```

**Fix:**
```sql
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public  -- ⚠️ CRITICAL FIX
stable
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;
```

**Impact:** Without this fix, attackers could bypass admin checks and gain unauthorized access.

---

### 2. Anonymous Users Can Call Auth Functions 🔓

**Issue:** Helper functions were granted to `anon` role, allowing unauthenticated users to call admin/owner checks.

**Problem:**
- Anonymous users don't have `auth.uid()`, so functions always return `false`
- But allowing `anon` access creates attack surface
- Functions should only be callable by authenticated users

**Fix:**
```sql
-- Remove anonymous access
revoke execute on function is_admin() from anon;
revoke execute on function is_event_owner(uuid) from anon;
revoke execute on function is_event_published(uuid) from anon;

-- Grant only to authenticated
grant execute on function is_admin() to authenticated;
grant execute on function is_event_owner(uuid) to authenticated;
grant execute on function is_event_published(uuid) to authenticated;
```

**Impact:** Reduces attack surface, follows principle of least privilege.

---

### 3. Users Can Directly Publish Events 📢

**Issue:** Event insert policy allowed users to create events with ANY status, including `published`.

**Problem:**
```javascript
// User can bypass moderation workflow
await supabase.from('events').insert({
  title: 'Spam Event',
  status: 'published'  // ❌ Should not be allowed
});
```

**Fix:**
```sql
drop policy if exists "events_insert_authenticated" on events;

create policy "events_insert_authenticated"
  on events for insert
  with check (
    auth.uid() = created_by
    and status = 'draft'  -- ⚠️ Force draft on creation
  );
```

**Workflow:**
1. User creates event as `draft` ✅
2. User manually publishes via update (requires owner/admin permission) ✅
3. Admin can moderate before publish ✅

**Impact:** Prevents spam, enables moderation workflow.

---

### 4. Users Can Edit Own Ticket Requests (Race Conditions) 🏁

**Issue:** Policy `ticket_requests_update_own_pending` allowed users to update their own pending requests.

**Problem:**
- **Race condition:** User changes quantity while admin approves → inconsistent state
- **Complexity:** Which version is correct? User's edit or admin's approval?
- **Audit trail:** Edits complicate tracking

**Example Race Condition:**
```
Time 0: User requests 5 tickets (status: pending)
Time 1: Admin reviews, decides to approve 5 tickets
Time 2: User edits request to 10 tickets
Time 3: Admin clicks approve
Result: What quantity is approved? 5 or 10?
```

**Fix:**
```sql
-- Remove user update policy
drop policy if exists "ticket_requests_update_own_pending" on ticket_requests;

-- Keep only:
-- 1. User can DELETE (cancel) pending requests ✅
-- 2. Admin/owner can UPDATE (approve/reject) ✅
```

**New Workflow:**
- User submits request → Status: `pending`
- If user wants to change quantity → **Delete old request, create new one**
- Admin/owner approves/rejects → Status: `approved` or `rejected`
- No race conditions, clear audit trail

**Impact:** Eliminates race conditions, simplifies state management.

---

### 5. Public Access to Profiles Table 📋

**Issue:** Policy `profiles_select_all` allowed **anyone** (even non-logged-in) to query profiles table.

**Problem:**
```sql
-- Anonymous user can scrape all profiles
SELECT * FROM profiles;  -- ❌ Returns ALL user data
```

**Risk:**
- Data scraping/harvesting
- Privacy concerns (display names, roles, created_at timestamps)
- GDPR/privacy compliance issues

**Fix:**
```sql
drop policy if exists "profiles_select_all" on profiles;

create policy "profiles_select_authenticated"
  on profiles for select
  using (
    auth.role() = 'authenticated'  -- Must be logged in
    or is_admin()                  -- Or admin
  );
```

**Impact:** Protects user data, requires authentication to view profiles.

---

## 📊 Security Impact Summary

| Fix | Severity | Risk Without Fix | Fixed By |
|-----|----------|------------------|----------|
| `search_path` hijacking | 🔴 CRITICAL | SQL injection, privilege escalation | `set search_path = public` |
| Anonymous function access | 🟡 MEDIUM | Attack surface expansion | Revoke from `anon` |
| Direct event publish | 🟡 MEDIUM | Spam, bypass moderation | Force `status = 'draft'` on insert |
| User edit requests | 🟡 MEDIUM | Race conditions, data inconsistency | Remove user update policy |
| Public profile access | 🟠 MEDIUM | Data scraping, privacy breach | Require authentication |

---

## 🎯 Migration Order

**MUST run in order:**
1. `001_schema.sql` - Tables
2. `002_policies.sql` - RLS policies (original)
3. `003_seed.sql` - Sample data
4. **`004_security_fixes.sql`** ← **RUN THIS NOW**

---

## ✅ How to Apply

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `004_security_fixes.sql`
3. Paste and click "Run"
4. Verify "Success" message

### Option 2: Supabase CLI
```bash
supabase db push
```

---

## 🧪 Verification

After running migration, test these scenarios:

### Test 1: Search Path Protection
```sql
-- Should fail or return false (not bypass admin check)
SET search_path = malicious_schema, public;
SELECT is_admin();
```

### Test 2: Anonymous Access
```sql
-- Should fail with permission denied
SET ROLE anon;
SELECT is_admin();
```

### Test 3: Event Creation
```javascript
// Should fail with RLS policy violation
await supabase.from('events').insert({
  title: 'Test',
  status: 'published'  // ❌ Not allowed
});

// Should succeed
await supabase.from('events').insert({
  title: 'Test',
  status: 'draft'  // ✅ Allowed
});
```

### Test 4: Profile Access
```sql
-- Should fail if not authenticated
SET ROLE anon;
SELECT * FROM profiles;  -- ❌ Permission denied
```

---

## 📚 References

- **Supabase Security Best Practices:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **PostgreSQL search_path Security:** https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH
- **OWASP SQL Injection:** https://owasp.org/www-community/attacks/SQL_Injection

---

## 🔄 Rollback (If Needed)

If migration causes issues:

```sql
-- Rollback to previous state
BEGIN;

-- Restore original functions (without search_path)
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Restore grants to anon
grant execute on function is_admin() to anon;

-- Restore original policies
-- (copy from 002_policies.sql)

ROLLBACK;  -- Or COMMIT if you want to keep rollback
```

**But:** DO NOT rollback in production - these fixes are critical for security.

---

## 💡 Key Takeaways

1. **Always set `search_path`** in `security definer` functions
2. **Grant minimum permissions** (principle of least privilege)
3. **Force safe defaults** (draft status, not published)
4. **Simplify workflows** (no user edits on pending requests)
5. **Protect user data** (require authentication for profiles)

**Bottom line:** This migration hardens your app against common security vulnerabilities. **Run it before any public deployment.** 🔒
