-- migrations/003_seed.sql
-- Event Board + Ticket Requests - Seed Data
-- Created: 2026-01-24

-- ============================================================================
-- SEED VENUES
-- ============================================================================
-- Insert sample venues for development/testing
insert into venues (name, address, capacity) values
  ('National Palace of Culture (NDK)', '1 Bulgaria Square, Sofia', 3000),
  ('Summer Theatre Varna', 'Sea Garden, Varna', 2500),
  ('Ancient Theatre Plovdiv', 'Old Town, Plovdiv', 6000),
  ('Arena Armeec', '106 Tsarigradsko Shose Blvd, Sofia', 12000),
  ('City Garden Theatre', 'Central Park, Burgas', 800)
on conflict do nothing;

-- ============================================================================
-- SEED EVENTS
-- ============================================================================
-- Note: Events require a valid created_by user ID from auth.users
-- To run this seed:
-- 1. Register a user via the app (or Supabase Dashboard → Authentication)
-- 2. Copy the user's UUID
-- 3. Replace 'YOUR_USER_UUID_HERE' below with the actual UUID
-- 4. Run this migration

-- Example published event (replace YOUR_USER_UUID_HERE with real user ID):
/*
insert into events (title, description, starts_at, venue_id, created_by, status)
select
  'Summer Music Festival 2026',
  'Join us for an unforgettable evening of live music featuring local and international artists. Experience a blend of rock, jazz, and electronic music under the stars.',
  '2026-07-15 19:00:00+03'::timestamptz,
  (select id from venues where name = 'Summer Theatre Varna' limit 1),
  'YOUR_USER_UUID_HERE'::uuid,
  'published'
where exists (select 1 from auth.users where id = 'YOUR_USER_UUID_HERE'::uuid);

insert into events (title, description, starts_at, venue_id, created_by, status)
select
  'Classical Concert Series - Opening Night',
  'Experience the Sofia Philharmonic Orchestra performing masterpieces by Mozart, Beethoven, and Tchaikovsky. A perfect evening for classical music lovers.',
  '2026-06-20 20:00:00+03'::timestamptz,
  (select id from venues where name = 'National Palace of Culture (NDK)' limit 1),
  'YOUR_USER_UUID_HERE'::uuid,
  'published'
where exists (select 1 from auth.users where id = 'YOUR_USER_UUID_HERE'::uuid);
*/

-- ============================================================================
-- ALTERNATIVE: Create events after user registration
-- ============================================================================
-- If you want to create events programmatically after first user registers,
-- use this SQL template in your application code:

-- insert into events (title, description, starts_at, venue_id, created_by, status)
-- values (
--   'Event Title',
--   'Event description here',
--   '2026-06-20 20:00:00+03',
--   (select id from venues where name = 'Venue Name' limit 1),
--   auth.uid(), -- Current authenticated user
--   'published'
-- );
