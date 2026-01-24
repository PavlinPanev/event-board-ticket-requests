-- migrations/002_policies.sql
-- Event Board + Ticket Requests - Row Level Security Policies
-- Created: 2026-01-24

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if current user is admin
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Check if current user owns an event
create or replace function is_event_owner(event_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from events
    where id = event_id
    and created_by = auth.uid()
  );
$$;

-- Check if an event is published
create or replace function is_event_published(event_id uuid)
returns boolean
language sql
security definer
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
-- PROFILES TABLE POLICIES
-- ============================================================================
alter table profiles enable row level security;

-- Anyone can view profiles (for display names)
create policy "profiles_select_all"
  on profiles for select
  using (true);

-- Users can insert their own profile (triggered on signup)
create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update any profile
create policy "profiles_update_admin"
  on profiles for update
  using (is_admin())
  with check (is_admin());

-- Users cannot delete profiles (cascade from auth.users)
-- No delete policy needed

comment on policy "profiles_select_all" on profiles is 'Anyone can view profiles for display names';
comment on policy "profiles_insert_own" on profiles is 'Users can create their own profile';
comment on policy "profiles_update_own" on profiles is 'Users can update their own profile';
comment on policy "profiles_update_admin" on profiles is 'Admins can update any profile';

-- ============================================================================
-- VENUES TABLE POLICIES
-- ============================================================================
alter table venues enable row level security;

-- Anyone can view venues
create policy "venues_select_all"
  on venues for select
  using (true);

-- Only admins can insert venues
create policy "venues_insert_admin"
  on venues for insert
  with check (is_admin());

-- Only admins can update venues
create policy "venues_update_admin"
  on venues for update
  using (is_admin())
  with check (is_admin());

-- Only admins can delete venues
create policy "venues_delete_admin"
  on venues for delete
  using (is_admin());

comment on policy "venues_select_all" on venues is 'Anyone can view venues';
comment on policy "venues_insert_admin" on venues is 'Only admins can create venues';
comment on policy "venues_update_admin" on venues is 'Only admins can update venues';
comment on policy "venues_delete_admin" on venues is 'Only admins can delete venues';

-- ============================================================================
-- EVENTS TABLE POLICIES
-- ============================================================================
alter table events enable row level security;

-- Anyone can view published events
create policy "events_select_published"
  on events for select
  using (status = 'published');

-- Authenticated users can view their own events (any status)
create policy "events_select_own"
  on events for select
  using (auth.uid() = created_by);

-- Admins can view all events
create policy "events_select_admin"
  on events for select
  using (is_admin());

-- Authenticated users can create events
create policy "events_insert_authenticated"
  on events for insert
  with check (auth.uid() = created_by);

-- Users can update their own events
create policy "events_update_own"
  on events for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Admins can update any event
create policy "events_update_admin"
  on events for update
  using (is_admin())
  with check (is_admin());

-- Users can delete their own events
create policy "events_delete_own"
  on events for delete
  using (auth.uid() = created_by);

-- Admins can delete any event
create policy "events_delete_admin"
  on events for delete
  using (is_admin());

comment on policy "events_select_published" on events is 'Anyone can view published events';
comment on policy "events_select_own" on events is 'Users can view their own events (any status)';
comment on policy "events_select_admin" on events is 'Admins can view all events';
comment on policy "events_insert_authenticated" on events is 'Authenticated users can create events';
comment on policy "events_update_own" on events is 'Users can update their own events';
comment on policy "events_update_admin" on events is 'Admins can update any event';
comment on policy "events_delete_own" on events is 'Users can delete their own events';
comment on policy "events_delete_admin" on events is 'Admins can delete any event';

-- ============================================================================
-- TICKET_REQUESTS TABLE POLICIES
-- ============================================================================
alter table ticket_requests enable row level security;

-- Users can view their own ticket requests
create policy "ticket_requests_select_own"
  on ticket_requests for select
  using (auth.uid() = requester_id);

-- Event owners can view requests for their events
create policy "ticket_requests_select_event_owner"
  on ticket_requests for select
  using (
    exists (
      select 1 from events
      where events.id = ticket_requests.event_id
      and events.created_by = auth.uid()
    )
  );

-- Admins can view all ticket requests
create policy "ticket_requests_select_admin"
  on ticket_requests for select
  using (is_admin());

-- Authenticated users can create ticket requests for published events
create policy "ticket_requests_insert_authenticated"
  on ticket_requests for insert
  with check (
    auth.uid() = requester_id
    and is_event_published(event_id)
  );

-- Users can update their own pending requests (e.g., cancel, change quantity)
create policy "ticket_requests_update_own_pending"
  on ticket_requests for update
  using (
    auth.uid() = requester_id
    and status = 'pending'
  )
  with check (
    auth.uid() = requester_id
    and status = 'pending'
  );

-- Admins can update any ticket request (approve/reject)
create policy "ticket_requests_update_admin"
  on ticket_requests for update
  using (is_admin())
  with check (is_admin());

-- Event owners can update requests for their events (approve/reject)
create policy "ticket_requests_update_event_owner"
  on ticket_requests for update
  using (
    exists (
      select 1 from events
      where events.id = ticket_requests.event_id
      and events.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from events
      where events.id = ticket_requests.event_id
      and events.created_by = auth.uid()
    )
  );

-- Users can delete their own pending requests
create policy "ticket_requests_delete_own_pending"
  on ticket_requests for delete
  using (
    auth.uid() = requester_id
    and status = 'pending'
  );

-- Admins can delete any ticket request
create policy "ticket_requests_delete_admin"
  on ticket_requests for delete
  using (is_admin());

comment on policy "ticket_requests_select_own" on ticket_requests is 'Users can view their own requests';
comment on policy "ticket_requests_select_event_owner" on ticket_requests is 'Event owners can view requests for their events';
comment on policy "ticket_requests_select_admin" on ticket_requests is 'Admins can view all requests';
comment on policy "ticket_requests_insert_authenticated" on ticket_requests is 'Users can request tickets for published events';
comment on policy "ticket_requests_update_own_pending" on ticket_requests is 'Users can update their own pending requests';
comment on policy "ticket_requests_update_admin" on ticket_requests is 'Admins can approve/reject any request';
comment on policy "ticket_requests_update_event_owner" on ticket_requests is 'Event owners can approve/reject requests for their events';
comment on policy "ticket_requests_delete_own_pending" on ticket_requests is 'Users can delete their own pending requests';
comment on policy "ticket_requests_delete_admin" on ticket_requests is 'Admins can delete any request';

-- ============================================================================
-- EVENT_ASSETS TABLE POLICIES
-- ============================================================================
alter table event_assets enable row level security;

-- Anyone can view assets for published events
create policy "event_assets_select_published"
  on event_assets for select
  using (
    exists (
      select 1 from events
      where events.id = event_assets.event_id
      and events.status = 'published'
    )
  );

-- Event owners can view assets for their own events (any status)
create policy "event_assets_select_own_event"
  on event_assets for select
  using (
    exists (
      select 1 from events
      where events.id = event_assets.event_id
      and events.created_by = auth.uid()
    )
  );

-- Admins can view all assets
create policy "event_assets_select_admin"
  on event_assets for select
  using (is_admin());

-- Event owners can upload assets for their events
create policy "event_assets_insert_event_owner"
  on event_assets for insert
  with check (
    auth.uid() = uploaded_by
    and is_event_owner(event_id)
  );

-- Admins can upload assets for any event
create policy "event_assets_insert_admin"
  on event_assets for insert
  with check (
    auth.uid() = uploaded_by
    and is_admin()
  );

-- Users can delete their own uploaded assets
create policy "event_assets_delete_own"
  on event_assets for delete
  using (auth.uid() = uploaded_by);

-- Event owners can delete assets from their events
create policy "event_assets_delete_event_owner"
  on event_assets for delete
  using (is_event_owner(event_id));

-- Admins can delete any asset
create policy "event_assets_delete_admin"
  on event_assets for delete
  using (is_admin());

comment on policy "event_assets_select_published" on event_assets is 'Anyone can view assets for published events';
comment on policy "event_assets_select_own_event" on event_assets is 'Event owners can view assets for their events';
comment on policy "event_assets_select_admin" on event_assets is 'Admins can view all assets';
comment on policy "event_assets_insert_event_owner" on event_assets is 'Event owners can upload assets for their events';
comment on policy "event_assets_insert_admin" on event_assets is 'Admins can upload assets for any event';
comment on policy "event_assets_delete_own" on event_assets is 'Users can delete their own uploads';
comment on policy "event_assets_delete_event_owner" on event_assets is 'Event owners can delete assets from their events';
comment on policy "event_assets_delete_admin" on event_assets is 'Admins can delete any asset';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant execute permission on helper functions
grant execute on function is_admin() to authenticated;
grant execute on function is_event_owner(uuid) to authenticated;
grant execute on function is_event_published(uuid) to authenticated;
grant execute on function is_admin() to anon;
grant execute on function is_event_owner(uuid) to anon;
grant execute on function is_event_published(uuid) to anon;
