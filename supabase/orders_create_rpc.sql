-- Create order and decrement stock in a single secure function
-- Accepts JSON array: [{"product_id": <int>, "quantity": <int>}, ...]
-- Returns the created order id (uuid)

create or replace function public.create_order_and_decrement_stock(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_total numeric := 0;
  v_now timestamptz := now();
  v_items jsonb;
  v_prod_id bigint;
  v_qty int;
  v_price numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_shipping numeric := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid items payload';
  end if;

  -- Check stock and compute total
  for v_items in select * from jsonb_array_elements(p_items) loop
    v_prod_id := (v_items->>'product_id')::bigint;
    v_qty := coalesce((v_items->>'quantity')::int, 0);
    if v_prod_id is null or v_qty <= 0 then
      raise exception 'Invalid item entry';
    end if;
    select price into v_price from public.products where id = v_prod_id;
    if v_price is null then
      raise exception 'Product % not found', v_prod_id;
    end if;
    -- Ensure enough stock
    perform 1 from public.products where id = v_prod_id and coalesce(stock,0) >= v_qty;
    if not found then
      raise exception 'Insufficient stock for product %', v_prod_id;
    end if;
    v_total := v_total + (v_price * v_qty);
  end loop;

  -- Compute tax and shipping fee and set grand total
  v_subtotal := v_total;
  v_tax := round(v_subtotal * 0.10, 0);
  v_shipping := case when v_subtotal > 0 then 10000 else 0 end;
  v_total := v_subtotal + v_tax + v_shipping;

  -- Pre-generate order id and human-friendly order number MTK-YYYYMMDD-XXXXXXXX
  v_order_id := gen_random_uuid();
  -- Build order_number using order id and current date, e.g., MTK-20250131-1A2B3C4D
  -- Insert order with id and order_number
  insert into public.orders (id, user_id, status, total, created_at, order_number)
  values (
    v_order_id,
    v_uid,
    'pending',
    v_total,
    v_now,
    'MTK-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8))
  );

  -- Insert items and decrement stock
  for v_items in select * from jsonb_array_elements(p_items) loop
    v_prod_id := (v_items->>'product_id')::bigint;
    v_qty := (v_items->>'quantity')::int;
    select price into v_price from public.products where id = v_prod_id;
    insert into public.order_items (order_id, product_id, quantity, price)
    values (v_order_id, v_prod_id, v_qty, v_price);
    update public.products set stock = coalesce(stock,0) - v_qty where id = v_prod_id;
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.create_order_and_decrement_stock(jsonb) to authenticated;
