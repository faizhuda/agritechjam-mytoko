-- Run this in Supabase SQL Editor
-- Purpose: Ensure profiles has extra fields and RLS policies so users can manage their own profile.

alter table if exists public.profiles
  add column if not exists phone text,
  add column if not exists address text;

-- Enable RLS (safe default)
alter table if exists public.profiles enable row level security;

-- Idempotent policies for self-access
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using ( auth.uid() = id );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using ( auth.uid() = id ) with check ( auth.uid() = id );
