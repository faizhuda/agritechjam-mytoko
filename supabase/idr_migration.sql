-- Run this in Supabase SQL Editor to migrate prices to IDR and tune checkout amounts
-- This assumes your products table currently stores prices roughly in USD.
-- It multiplies prices to approximate IDR and rounds to whole rupiah (no cents).

begin;

-- 1) Convert existing product prices to IDR (approximate 1 USD = 15,000 IDR)
update public.products
set price = round(price * 15000),
    original_price = case when original_price is not null then round(original_price * 15000) else null end;

-- 2) (Optional) If your checkout RPC uses flat shipping in the same unit,
--    consider updating shipping to a more realistic IDR value in the function.
--    Example for a function named create_order_and_decrement_stock(p_items jsonb):
--
-- create or replace function public.create_order_and_decrement_stock(p_items jsonb)
-- returns uuid
-- language plpgsql
-- security definer
-- set search_path = public, extensions
-- as $$
-- declare
--   v_user uuid := auth.uid();
--   v_order_id uuid;
--   v_subtotal numeric := 0;
--   v_tax numeric := 0;
--   v_shipping numeric := 20000; -- Flat shipping in IDR
-- begin
--   if v_user is null then
--     raise exception 'Not authenticated';
--   end if;
--   -- Compute subtotal from DB product prices (now in IDR)
--   -- ... your existing logic ...
--   v_tax := round(v_subtotal * 0.10); -- keep 10% tax unless you prefer 11% PPN
--   -- Insert order and items using v_shipping and v_tax
--   -- ... your existing logic ...
--   return v_order_id;
-- end;
-- $$;

commit;
