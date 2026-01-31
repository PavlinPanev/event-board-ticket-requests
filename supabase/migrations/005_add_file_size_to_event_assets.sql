-- migrations/005_add_file_size_to_event_assets.sql
-- Add file_size column to event_assets table
-- Created: 2026-01-31

-- Add file_size column (integer type, stores size in bytes)
alter table event_assets 
add column if not exists file_size integer;

-- Add comment for documentation
comment on column event_assets.file_size is 'File size in bytes';

-- Backfill existing records if any (set to NULL for now)
-- In a real scenario, you'd query storage to get actual sizes
-- For now, existing records will have NULL file_size
