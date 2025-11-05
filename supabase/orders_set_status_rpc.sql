-- Admin-only function to update order status safely
-- Usage: select public.set_order_status(p_order_id := '<uuid>', p_status := 'paid');

create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Require admin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Forbidden';
  end if;

  -- Validate status
  if lower(coalesce(p_status, '')) not in ('pending','paid','shipped','delivered','cancelled') then
    raise exception 'Invalid status';
  end if;

  update public.orders
  set status = lower(p_status)
  where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

grant execute on function public.set_order_status(uuid, text) to authenticated;
