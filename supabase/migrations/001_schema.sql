-- migrations/001_schema.sql
-- Event Board + Ticket Requests - Initial Schema
-- Created: 2026-01-24

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Extends auth.users with application-specific fields
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Index for role-based queries
create index idx_profiles_role on profiles(role);

comment on table profiles is 'User profiles extending Supabase auth.users';
comment on column profiles.role is 'User role: user (default) or admin';

-- ============================================================================
-- VENUES TABLE
-- ============================================================================
-- Physical locations where events take place
create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  capacity int check (capacity > 0),
  created_at timestamptz not null default now()
);

-- Index for name searches
create index idx_venues_name on venues(name);

comment on table venues is 'Event venues and locations';
comment on column venues.capacity is 'Maximum attendee capacity (optional)';

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
-- Main events/shows that users can request tickets for
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  venue_id uuid references venues(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_events_status on events(status);
create index idx_events_starts_at on events(starts_at);
create index idx_events_created_by on events(created_by);
create index idx_events_venue_id on events(venue_id);

comment on table events is 'Events/shows for which users can request tickets';
comment on column events.status is 'Event status: draft (not visible), published (public), archived (past event)';

-- ============================================================================
-- TICKET_REQUESTS TABLE
-- ============================================================================
-- User requests for event tickets
create table if not exists ticket_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  quantity int not null check (quantity > 0),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_ticket_requests_event_id on ticket_requests(event_id);
create index idx_ticket_requests_requester_id on ticket_requests(requester_id);
create index idx_ticket_requests_status on ticket_requests(status);

comment on table ticket_requests is 'User ticket requests for events';
comment on column ticket_requests.quantity is 'Number of tickets requested (must be > 0)';
comment on column ticket_requests.status is 'Request status: pending, approved, rejected';

-- ============================================================================
-- EVENT_ASSETS TABLE
-- ============================================================================
-- Files uploaded for events (posters, images, PDFs)
create table if not exists event_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_event_assets_event_id on event_assets(event_id);
create index idx_event_assets_uploaded_by on event_assets(uploaded_by);

comment on table event_assets is 'Files/images uploaded for events (stored in Supabase Storage)';
comment on column event_assets.file_path is 'Storage path in event-assets bucket';
comment on column event_assets.mime_type is 'File MIME type (image/jpeg, application/pdf, etc.)';

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================
-- Insert a default venue for testing
insert into venues (name, address, capacity) values
  ('Central Hall', '123 Main Street, Sofia', 500),
  ('Open Air Theatre', '456 Park Avenue, Plovdiv', 1000)
on conflict do nothing;
