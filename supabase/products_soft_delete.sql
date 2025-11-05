-- Add soft-delete support for products to avoid FK conflicts with historical order_items

alter table if exists public.products
  add column if not exists archived boolean not null default false;

-- Optional: ensure public listing excludes archived in server-side APIs or through policies if desired.
-- Example policy to hide archived products from public reads (uncomment to enforce at DB level):
--
-- drop policy if exists "Public read products" on public.products;
-- create policy "Public read products" on public.products
--   for select
--   using (coalesce(archived, false) = false);
--
-- Note: If you change the policy, make sure your app/admin queries handle archived accordingly.
