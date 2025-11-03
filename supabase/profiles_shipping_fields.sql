-- Extend profiles table with shipping-aligned fields
alter table if exists public.profiles add column if not exists first_name text;
alter table if exists public.profiles add column if not exists last_name text;
alter table if exists public.profiles add column if not exists city text;
alter table if exists public.profiles add column if not exists zip_code text;

-- Optional: backfill first_name/last_name from full_name for existing rows
update public.profiles
set first_name = coalesce(first_name, split_part(coalesce(full_name,''), ' ', 1)),
    last_name = coalesce(
      last_name,
      nullif(btrim(substr(coalesce(full_name,''), length(split_part(coalesce(full_name,''), ' ', 1)) + 1)), '')
    )
where true;

-- RLS remains the same as in profiles_extra_fields.sql (self-select/update)
-- Ensure your existing policies allow update on these new columns.
