-- Create RPC function to increment product stock
-- This is used when cancelling orders to return stock

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id bigint,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_product_stock(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(bigint, integer) TO anon;

-- Comment
COMMENT ON FUNCTION public.increment_product_stock IS 'Increment product stock when order is cancelled';
