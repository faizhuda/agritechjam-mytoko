-- Admin RLS for managing products (insert/update/delete)
-- Run this in Supabase SQL editor. Idempotent.

alter table if exists public.products enable row level security;

-- Allow admins to insert products
drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products"
  on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Allow admins to update products
drop policy if exists "Admins update products" on public.products;
create policy "Admins update products"
  on public.products
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Allow admins to delete products
drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products"
  on public.products
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
