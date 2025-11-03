-- Enforce at most ONE review per user per product
-- Run in Supabase SQL editor. Idempotent.

-- A unique index is sufficient to enforce uniqueness (constraint not required)
create unique index if not exists reviews_user_product_unique_idx
  on public.reviews(user_id, product_id);
