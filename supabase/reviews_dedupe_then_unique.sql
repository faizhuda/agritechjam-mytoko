-- Deduplicate reviews, then (re)create unique index per (user_id, product_id)
-- Run this in the Supabase SQL editor. Safe to re-run.

-- 1) Remove duplicates keeping the most recent review per (user_id, product_id)
with ranked as (
  select
    ctid, user_id, product_id, created_at,
    row_number() over (
      partition by user_id, product_id
      order by created_at desc nulls last, ctid desc
    ) as rn
  from public.reviews
), to_delete as (
  select ctid from ranked where rn > 1
)
delete from public.reviews r using to_delete d where r.ctid = d.ctid;

-- 2) Create the unique index (no-op if already created)
create unique index if not exists reviews_user_product_unique_idx
  on public.reviews(user_id, product_id);
