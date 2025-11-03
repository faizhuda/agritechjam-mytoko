-- Adds an order_number column to orders to store a human-friendly reference like MTK-YYYYMMDD-XXXXXXXX
-- Safe to run multiple times

alter table if exists public.orders
  add column if not exists order_number text;

-- Optional: ensure uniqueness to avoid duplicates
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'orders_order_number_key'
  ) then
    execute 'create unique index orders_order_number_key on public.orders (order_number)';
  end if;
end$$;
