-- Run this in Supabase SQL Editor
-- Wishlist table + RLS and admin RPC to set order status

-- WISHLIST
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table public.wishlist enable row level security;

drop policy if exists "Users manage own wishlist" on public.wishlist;
create policy "Users manage own wishlist" on public.wishlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ADMIN FLAG
alter table if exists public.profiles
  add column if not exists is_admin boolean default false;

-- RPC: admin set order status (security definer)
-- Only users with profiles.is_admin = true can update order status

drop function if exists public.set_order_status(uuid, text);
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_admin, false) into v_is_admin from public.profiles where id = v_uid;
  if not v_is_admin then
    raise exception 'Forbidden';
  end if;

  if p_status not in ('pending','paid','shipped','delivered','cancelled') then
    raise exception 'Invalid status';
  end if;

  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

grant execute on function public.set_order_status(uuid, text) to authenticated;

-- =====================================================
-- PROFILES: auto-provision rows for new auth.users
-- =====================================================

-- Trigger function: create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill existing auth users into profiles (run once)
insert into public.profiles (id, full_name, avatar_url)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.email) as full_name,
       coalesce(u.raw_user_meta_data->>'avatar_url', '') as avatar_url
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
