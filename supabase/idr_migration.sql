-- Run this in Supabase SQL Editor to migrate prices to IDR and tune checkout amounts
-- This assumes your products table currently stores prices roughly in USD.
-- It multiplies prices to approximate IDR and rounds to whole rupiah (no cents).
--
-- Safe and (re)runnable:
-- 1) It first widens price/original_price to NUMERIC(14,0) if needed to prevent overflow.
-- 2) It multiplies only rows that still look like USD (price < 100,000) to avoid double conversion.
--    Adjust the threshold if your dataset differs.

begin;

-- 0) Widen numeric precision to avoid overflow (do only if precision/scale is too small)
do $$
declare
    p_prec int; p_scale int;
    op_prec int; op_scale int;
begin
    select numeric_precision, numeric_scale into p_prec, p_scale
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price';

    if p_prec is not null and (p_prec < 14 or p_scale <> 0) then
        execute 'alter table public.products alter column price type numeric(14,0) using round(price::numeric)';
    end if;

    select numeric_precision, numeric_scale into op_prec, op_scale
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'original_price';

    if op_prec is not null and (op_prec < 14 or op_scale <> 0) then
        execute 'alter table public.products alter column original_price type numeric(14,0) using round(original_price::numeric)';
    end if;
end $$;

-- 1) Convert existing product prices to IDR (approximate 1 USD = 15,000 IDR)
-- Guard: only convert rows that appear to still be USD (price below a reasonable IDR threshold)
update public.products
set price = round(price * 15000)
where price < 100000; -- heuristic guard; adjust if needed

update public.products
set original_price = round(original_price * 15000)
where original_price is not null and original_price < 100000; -- heuristic guard

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
