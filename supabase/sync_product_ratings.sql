-- Function to update product rating and review count
-- This will be triggered whenever order_reviews changes

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  -- Get the product_id from either NEW or OLD record
  -- NEW is available for INSERT and UPDATE
  -- OLD is available for UPDATE and DELETE
  DECLARE
    v_product_id INTEGER;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_product_id := OLD.product_id;
    ELSE
      v_product_id := NEW.product_id;
    END IF;

    -- Calculate average rating and count for this product
    SELECT 
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
      COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM public.order_reviews
    WHERE product_id = v_product_id;

    -- Update the products table
    UPDATE public.products
    SET 
      rating = v_avg_rating,
      reviews = v_review_count
    WHERE id = v_product_id;

    RAISE NOTICE 'Updated product % - Rating: %, Reviews: %', v_product_id, v_avg_rating, v_review_count;
  END;

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_product_rating ON public.order_reviews;

-- Create trigger that fires after INSERT, UPDATE, or DELETE on order_reviews
CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.order_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Backfill existing ratings (run this once to sync existing data)
DO $$
DECLARE
  product_record RECORD;
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  FOR product_record IN SELECT DISTINCT product_id FROM public.order_reviews
  LOOP
    SELECT 
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
      COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM public.order_reviews
    WHERE product_id = product_record.product_id;

    UPDATE public.products
    SET 
      rating = v_avg_rating,
      reviews = v_review_count
    WHERE id = product_record.product_id;

    RAISE NOTICE 'Backfilled product % - Rating: %, Reviews: %', product_record.product_id, v_avg_rating, v_review_count;
  END LOOP;
END $$;

-- Verify the results
SELECT 
  p.id,
  p.name,
  p.rating,
  p.reviews,
  COUNT(r.id) as actual_reviews,
  ROUND(AVG(r.rating)::numeric, 2) as actual_avg_rating
FROM public.products p
LEFT JOIN public.order_reviews r ON r.product_id = p.id
GROUP BY p.id, p.name, p.rating, p.reviews
ORDER BY p.id;
