-- Allow authenticated users to insert reviews for products they've purchased
alter table if exists public.reviews enable row level security;

-- Add user_id column if missing and index for fast lookups
alter table if exists public.reviews
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_reviews_user_product on public.reviews(user_id, product_id);

drop policy if exists "Authenticated insert reviews" on public.reviews;
create policy "Authenticated insert reviews"
  on public.reviews
  for insert
  to authenticated
  with check (
    -- Must be the current user
    user_id = auth.uid()
    -- And must have purchased the product in any qualifying order
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = auth.uid()
        and oi.product_id = reviews.product_id
        and lower(coalesce(o.status, '')) in ('paid','shipped','delivered','completed')
    )
  );

-- Optionally, let users read their own reviews explicitly (public read already allowed)
-- drop policy if exists "Users read own reviews" on public.reviews;
-- create policy "Users read own reviews" on public.reviews for select using (true);
