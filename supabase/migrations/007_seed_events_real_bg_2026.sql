-- supabase/migrations/005_seed_events_real_bg_2026.sql
-- Seed: Real events in Bulgaria (Mar–Sep 2026) + key venues
-- Compatible with schema:
--   venues(id, name, address, capacity, created_at)
--   events(id, title, description, starts_at, venue_id, created_by, status, created_at)
--
-- Idempotent:
--  - venues inserted if missing by name
--  - events inserted if missing by (title, starts_at, venue_id)

begin;

do $$
declare
  v_creator uuid;
begin
  -- Prefer admin; fallback to first profile
  select coalesce(
    (select id from public.profiles where role = 'admin' order by created_at asc limit 1),
    (select id from public.profiles order by created_at asc limit 1)
  ) into v_creator;

  if v_creator is null then
    raise exception 'Seed requires at least 1 user in public.profiles. Register a user in the app first, then rerun.';
  end if;

  -- --------------------------------------------------------------------------
  -- VENUES (insert only if missing)
  -- --------------------------------------------------------------------------
  insert into public.venues (name, address, capacity)
  select 'Зала 1, НДК', 'гр. София, пл. „България“ 1', 4000
  where not exists (select 1 from public.venues where name = 'Зала 1, НДК');

  insert into public.venues (name, address, capacity)
  select 'Зала 3, НДК', 'гр. София, пл. „България“ 1', 1000
  where not exists (select 1 from public.venues where name = 'Зала 3, НДК');

  insert into public.venues (name, address, capacity)
  select 'Арена 8888 София', 'гр. София, бул. „Асен Йорданов“ № 1', 12000
  where not exists (select 1 from public.venues where name = 'Арена 8888 София');

  insert into public.venues (name, address, capacity)
  select 'Joy Station', 'гр. София, Студентски град', 1200
  where not exists (select 1 from public.venues where name = 'Joy Station');

  insert into public.venues (name, address, capacity)
  select 'Vidas Art Arena (Борисова градина)', 'гр. София, Борисова градина (колодрум / Velodrome)', 6000
  where not exists (select 1 from public.venues where name = 'Vidas Art Arena (Борисова градина)');

  insert into public.venues (name, address, capacity)
  select 'FOMO the club', 'гр. София', 800
  where not exists (select 1 from public.venues where name = 'FOMO the club');

  insert into public.venues (name, address, capacity)
  select 'Национален стадион „Васил Левски“', 'гр. София, бул. „Евлоги и Христо Георгиеви“ 38', 43000
  where not exists (select 1 from public.venues where name = 'Национален стадион „Васил Левски“');

  insert into public.venues (name, address, capacity)
  select 'Античен театър (Пловдив)', 'гр. Пловдив, Стария град', 4000
  where not exists (select 1 from public.venues where name = 'Античен театър (Пловдив)');

  insert into public.venues (name, address, capacity)
  select 'Летен театър (Варна)', 'гр. Варна, Морска градина', 3500
  where not exists (select 1 from public.venues where name = 'Летен театър (Варна)');

  insert into public.venues (name, address, capacity)
  select 'Летен театър (Бургас)', 'гр. Бургас, Морска градина', 2500
  where not exists (select 1 from public.venues where name = 'Летен театър (Бургас)');

  insert into public.venues (name, address, capacity)
  select 'Hills of Rock (Пловдив, Гребна база)', 'гр. Пловдив, район Гребна база', 20000
  where not exists (select 1 from public.venues where name = 'Hills of Rock (Пловдив, Гребна база)');

  -- --------------------------------------------------------------------------
  -- EVENTS (30 items, Mar–Sep 2026) - published
  -- Insert only if missing by (title, starts_at, venue_id)
  -- --------------------------------------------------------------------------
  with e(title, description, starts_at, venue_name) as (
    values
      -- March 2026
      ('Incognito (Live in Sofia)', 'Jazz-funk-soul legends Incognito live in Sofia.', '2026-03-10 20:00:00+02', 'Зала 1, НДК'),
      ('Gipsy Kings feat. Diego Baliardo', 'Gipsy Kings featuring Diego Baliardo live in Sofia.', '2026-03-11 20:00:00+02', 'Зала 1, НДК'),
      ('Dire Straits Legacy', 'Dire Straits Legacy live in Sofia.', '2026-03-23 20:00:00+02', 'Зала 1, НДК'),

      -- April 2026
      ('Lord of the Dance', '30 Years anniversary show in Sofia.', '2026-04-05 20:00:00+03', 'Арена 8888 София'),
      ('HYPOCRISY - Mass Hallucination Tour', 'HYPOCRISY live in Sofia.', '2026-04-14 19:00:00+03', 'Joy Station'),
      ('Despina Vandi Live', 'Despina Vandi live in Sofia.', '2026-04-23 19:30:00+03', 'Арена 8888 София'),
      ('Eros Ramazzotti', 'Eros Ramazzotti live in Sofia.', '2026-04-24 19:00:00+03', 'Арена 8888 София'),

      -- May 2026
      ('Sean Paul - Rise Jamaica', 'Sean Paul at Vidas Art Arena (Borisova Garden).', '2026-05-13 19:00:00+03', 'Vidas Art Arena (Борисова градина)'),
      ('Tinariwen - The Hoggar Tour', 'Tinariwen live at NDK Hall 3.', '2026-05-15 19:00:00+03', 'Зала 3, НДК'),
      ('Clutch (Live in Bulgaria)', 'Clutch live at NDK Hall 3.', '2026-05-20 19:00:00+03', 'Зала 3, НДК'),
      ('Iron Maiden - Run For Your Lives World Tour', 'Iron Maiden live at National Stadium Vasil Levski.', '2026-05-26 17:00:00+03', 'Национален стадион „Васил Левски“'),
      ('Garbage (Live in Sofia)', 'Garbage at Vidas Art Arena (Borisova Garden).', '2026-05-28 19:00:00+03', 'Vidas Art Arena (Борисова градина)'),

      -- June 2026
      ('Tricky @ FOMO', 'Tricky club show at FOMO (Sofia).', '2026-06-12 20:00:00+03', 'FOMO the club'),
      ('Carmina Burana (Opera Open 2026)', 'Carl Orff - Carmina Burana at Ancient Theatre (Plovdiv).', '2026-06-25 21:00:00+03', 'Античен театър (Пловдив)'),
      ('MURMURATION Level 2', 'Sadeck Berrabah - Murmuration Level 2 at Ancient Theatre (Plovdiv).', '2026-06-28 21:00:00+03', 'Античен театър (Пловдив)'),
      ('Breaking Benjamin', 'Breaking Benjamin live in Sofia.', '2026-06-29 20:00:00+03', 'Арена 8888 София'),
      ('Foreigner', 'Foreigner live in Sofia.', '2026-06-30 20:00:00+03', 'Арена 8888 София'),

      -- July 2026
      ('Nabucco (Opera Open 2026)', 'Verdi - Nabucco at Ancient Theatre (Plovdiv).', '2026-07-04 21:00:00+03', 'Античен театър (Пловдив)'),
      ('Robert Plant (with Saving Grace)', 'Robert Plant live at Ancient Theatre (Plovdiv).', '2026-07-06 19:00:00+03', 'Античен театър (Пловдив)'),
      ('BEAT @ NDK', 'BEAT live in Sofia (NDK).', '2026-07-09 19:00:00+03', 'Зала 1, НДК'),
      ('The Wailers', 'The Wailers live in Sofia.', '2026-07-15 19:00:00+03', 'Vidas Art Arena (Борисова градина)'),
      ('Hills of Rock 2026 - Day 1', 'Hills of Rock 2026 festival - Day 1.', '2026-07-24 16:00:00+03', 'Hills of Rock (Пловдив, Гребна база)'),
      ('Hills of Rock 2026 - Day 2', 'Hills of Rock 2026 festival - Day 2.', '2026-07-25 16:00:00+03', 'Hills of Rock (Пловдив, Гребна база)'),

      -- August 2026
      ('Tash Sultana', 'Tash Sultana live in Sofia.', '2026-08-11 19:00:00+03', 'Vidas Art Arena (Борисова градина)'),
      ('Spanish Magic (Varna Opera)', 'Multimedia concert at Varna Summer Theatre.', '2026-08-13 21:00:00+03', 'Летен театър (Варна)'),
      ('Toni Dimitrova - Tour 2026 (Plovdiv)', 'Toni Dimitrova at Ancient Theatre (Plovdiv).', '2026-08-16 21:00:00+03', 'Античен театър (Пловдив)'),
      ('Rusalka (Varna Opera)', 'Dvorak - Rusalka at Varna Summer Theatre.', '2026-08-18 21:00:00+03', 'Летен театър (Варна)'),
      ('Toni Dimitrova - Tour 2026 (Burgas)', 'Toni Dimitrova at Burgas Summer Theatre.', '2026-08-21 21:00:00+03', 'Летен театър (Бургас)'),

      -- September 2026
      ('Professor Brian Cox - Emergence', 'Professor Brian Cox live in Sofia - Emergence.', '2026-09-13 20:00:00+03', 'Зала 1, НДК'),
      ('Deep Purple Live', 'Deep Purple live in Sofia.', '2026-09-29 20:00:00+03', 'Арена 8888 София')
  ),
  mapped as (
    select
      e.title,
      e.description,
      e.starts_at::timestamptz as starts_at,
      v.id as venue_id
    from e
    join public.venues v on v.name = e.venue_name
  )
  insert into public.events (title, description, starts_at, venue_id, created_by, status)
  select
    m.title,
    m.description,
    m.starts_at,
    m.venue_id,
    v_creator,
    'published'
  from mapped m
  where not exists (
    select 1
    from public.events ex
    where ex.title = m.title
      and ex.starts_at = m.starts_at
      and ex.venue_id = m.venue_id
  );

end $$;

commit;
