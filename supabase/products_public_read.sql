-- Run this in Supabase SQL Editor
-- Purpose: Make product prices visible to the app (anon) so Home, Catalog, and Product Detail
-- can read from the database instead of falling back to local samples.

-- Enable RLS (safe default) then allow public read-only SELECT
alter table if exists public.products enable row level security;

-- Idempotent policy creation
drop policy if exists "Public read products" on public.products;
create policy "Public read products" on public.products
  for select
  using (true);

-- Optional: if you render ratings or reviews publicly, allow reads as well
-- alter table if exists public.reviews enable row level security;
-- drop policy if exists "Public read reviews" on public.reviews;
-- create policy "Public read reviews" on public.reviews for select using (true);
