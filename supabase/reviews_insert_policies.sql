-- Allow authenticated users to insert reviews and associate with their user_id
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
  with check (user_id = auth.uid());

-- Optionally, let users read their own reviews explicitly (public read already allowed)
-- drop policy if exists "Users read own reviews" on public.reviews;
-- create policy "Users read own reviews" on public.reviews for select using (true);
