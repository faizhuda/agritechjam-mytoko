-- Run this in Supabase SQL Editor
-- Purpose: Allow public (anon) read-only access to product reviews so the app
-- can show real review counts and averages without falling back to samples.

alter table if exists public.reviews enable row level security;

-- Idempotent policy creation
DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews
  FOR SELECT
  USING (true);
