-- migrations/004_security_fixes.sql
-- Event Board + Ticket Requests - Security Hardening
-- Created: 2026-01-24
-- Purpose: Fix SQL injection vulnerabilities, tighten grants, and improve RLS policies

-- ============================================================================
-- FIX 1: ADD search_path TO HELPER FUNCTIONS
-- ============================================================================
-- Reason: Prevent SQL injection attacks by explicitly setting search_path
-- Without this, functions inherit caller's search_path which can be manipulated

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public  -- ⚠️ CRITICAL: Prevents search_path hijacking
stable
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function is_event_owner(event_id uuid)
returns boolean
language sql
security definer
set search_path = public  -- ⚠️ CRITICAL: Prevents search_path hijacking
stable
as $$
  select exists (
    select 1
    from events
    where id = event_id
      and created_by = auth.uid()
  );
$$;

create or replace function is_event_published(event_id uuid)
returns boolean
language sql
security definer
set search_path = public  -- ⚠️ CRITICAL: Prevents search_path hijacking
stable
as $$
  select exists (
    select 1
    from events
    where id = event_id
      and status = 'published'
  );
$$;

-- ============================================================================
-- FIX 2: TIGHTEN FUNCTION GRANTS
-- ============================================================================
-- Reason: Anonymous users (not logged in) should NOT call admin/owner checks
-- These functions require auth context, so only authenticated users need access

-- Revoke from anonymous users
revoke execute on function is_admin() from anon;
revoke execute on function is_event_owner(uuid) from anon;
revoke execute on function is_event_published(uuid) from anon;

-- Grant only to authenticated users
grant execute on function is_admin() to authenticated;
grant execute on function is_event_owner(uuid) to authenticated;
grant execute on function is_event_published(uuid) to authenticated;

comment on function is_admin() is 'Check if current authenticated user is admin (search_path protected)';
comment on function is_event_owner(uuid) is 'Check if current authenticated user owns event (search_path protected)';
comment on function is_event_published(uuid) is 'Check if event is published (search_path protected)';

-- ============================================================================
-- FIX 3: RESTRICT EVENT INSERT TO DRAFT ONLY
-- ============================================================================
-- Reason: Users should NOT be able to directly publish events on creation
-- They must create as draft, then manually change status to published
-- This prevents abuse and allows for moderation workflow

drop policy if exists "events_insert_authenticated" on events;

create policy "events_insert_authenticated"
  on events for insert
  with check (
    auth.uid() = created_by
    and status = 'draft'  -- ⚠️ CRITICAL: Force draft on creation
  );

comment on policy "events_insert_authenticated" on events is 
  'Users can only create events as draft (must be published separately)';

-- ============================================================================
-- FIX 4: REMOVE USER UPDATE ON TICKET_REQUESTS
-- ============================================================================
-- Reason: Users editing their own requests can cause race conditions
-- and complexity. Cleaner approach:
--   - Users can only DELETE (cancel) pending requests
--   - Only admin/event_owner can UPDATE (approve/reject)

drop policy if exists "ticket_requests_update_own_pending" on ticket_requests;

comment on policy "ticket_requests_update_admin" on ticket_requests is 
  'Only admins can approve/reject requests (users can only cancel via delete)';
comment on policy "ticket_requests_update_event_owner" on ticket_requests is 
  'Event owners can approve/reject requests for their events';

-- ============================================================================
-- FIX 5: RESTRICT PROFILES SELECT (OPTIONAL - RECOMMENDED)
-- ============================================================================
-- Reason: Public access to profiles table can leak user information
-- Better approach: Only authenticated users can view profiles
-- Admins always have access for user management

drop policy if exists "profiles_select_all" on profiles;

create policy "profiles_select_authenticated"
  on profiles for select
  using (
    auth.role() = 'authenticated'  -- Any logged-in user
    or is_admin()                  -- Or admin (even if somehow anon)
  );

comment on policy "profiles_select_authenticated" on profiles is 
  'Only authenticated users can view profiles (prevents public data scraping)';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to confirm fixes)
-- ============================================================================

-- Check function definitions include search_path
-- select proname, prosrc 
-- from pg_proc 
-- where proname in ('is_admin', 'is_event_owner', 'is_event_published');

-- Check function grants (should only show authenticated)
-- select proname, proacl 
-- from pg_proc 
-- where proname in ('is_admin', 'is_event_owner', 'is_event_published');

-- Check RLS policies are active
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where tablename in ('events', 'ticket_requests', 'profiles')
-- order by tablename, policyname;
