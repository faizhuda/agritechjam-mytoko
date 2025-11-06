-- RPC function to cancel an order and restore stock
-- Only the order owner can cancel their own order
-- Only pending or paid orders can be cancelled (not shipped/delivered)

CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_order_user_id uuid;
  v_order_status text;
  v_item record;
  v_result json;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get order details
  SELECT user_id, status INTO v_order_user_id, v_order_status
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check ownership
  IF v_order_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to cancel this order';
  END IF;

  -- Only allow cancelling pending or paid orders
  -- Shipped and delivered orders cannot be cancelled (should use return flow instead)
  IF LOWER(v_order_status) NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'Only pending or paid orders can be cancelled. Current status: %', v_order_status;
  END IF;
  
  -- Already cancelled
  IF LOWER(v_order_status) = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  -- Restore stock for each item in the order
  FOR v_item IN
    SELECT product_id, quantity
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    -- Increment product stock
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Update order status to cancelled
  UPDATE orders
  SET status = 'cancelled'
  WHERE id = p_order_id;

  -- Return success response
  v_result := json_build_object(
    'success', true,
    'message', 'Order cancelled and stock restored',
    'order_id', p_order_id
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(uuid) TO authenticated;

COMMENT ON FUNCTION cancel_order_and_restore_stock IS 'Cancel a pending order and restore product stock. Only order owner can cancel.';
