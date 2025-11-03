-- Allow admins to read ALL orders and order items across users
-- Run this in the Supabase SQL editor.

-- Ensure RLS is enabled (no-op if already enabled)
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;

-- Admins can read all orders
drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders"
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Admins can read all order items
drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Notes:
-- - Existing user-specific policies remain; policies are OR-ed.
-- - Requires public.profiles(id=is_admin) populated for admin accounts.
-- - If you later add admin UPDATE/DELETE flows, prefer SECURITY DEFINER RPCs.
