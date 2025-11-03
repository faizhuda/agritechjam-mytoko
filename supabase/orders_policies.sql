-- Orders and Order Items RLS policies
-- Ensure only the authenticated user can read/insert their own orders and related items.

-- Enable RLS (no-op if already enabled)
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;

-- Orders: users can select only their own rows
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

-- Orders: users can insert orders for themselves
drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
  on public.orders
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Order Items: users can select items for their own orders
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Order Items: users can insert items for their own orders
drop policy if exists "Users can insert own order items" on public.order_items;
create policy "Users can insert own order items"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Note:
-- 1) We intentionally do not grant UPDATE/DELETE here.
--    Admins should use an RPC (e.g. set_order_status) marked SECURITY DEFINER to update order status.
-- 2) If your table/column names differ, adjust user_id/order_id accordingly.
