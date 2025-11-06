-- Drop old order_reviews related objects if we want to switch completely
-- (OPTIONAL - uncomment if you want to remove old system)
-- DROP TRIGGER IF EXISTS trigger_update_product_rating ON public.order_reviews;
-- DROP FUNCTION IF EXISTS update_product_rating();
-- DROP TABLE IF EXISTS public.order_reviews CASCADE;

-- Create new simple product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One review per user per product
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read reviews
CREATE POLICY "Anyone can view product reviews"
  ON public.product_reviews
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own reviews
CREATE POLICY "Users can create their own reviews"
  ON public.product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.product_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);

-- Function to update product rating (simplified)
CREATE OR REPLACE FUNCTION update_product_rating_simple()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  -- Get the product_id
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
    FROM public.product_reviews
    WHERE product_id = v_product_id;

    -- Update the products table
    UPDATE public.products
    SET 
      rating = v_avg_rating,
      reviews = v_review_count
    WHERE id = v_product_id;

    RAISE NOTICE 'Updated product % - Rating: %, Reviews: %', v_product_id, v_avg_rating, v_review_count;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_product_rating_simple ON public.product_reviews;
CREATE TRIGGER trigger_update_product_rating_simple
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating_simple();

-- Migrate existing order_reviews data to product_reviews (one review per user per product)
-- This takes the LATEST review if a user reviewed the same product multiple times
INSERT INTO public.product_reviews (user_id, product_id, rating, comment, created_at)
SELECT DISTINCT ON (user_id, product_id)
  user_id,
  product_id,
  rating,
  comment,
  created_at
FROM public.order_reviews
ORDER BY user_id, product_id, created_at DESC
ON CONFLICT (user_id, product_id) DO NOTHING;

-- Backfill product ratings from new table
DO $$
DECLARE
  product_record RECORD;
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  FOR product_record IN SELECT DISTINCT product_id FROM public.product_reviews
  LOOP
    SELECT 
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
      COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM public.product_reviews
    WHERE product_id = product_record.product_id;

    UPDATE public.products
    SET 
      rating = v_avg_rating,
      reviews = v_review_count
    WHERE id = product_record.product_id;

    RAISE NOTICE 'Backfilled product % - Rating: %, Reviews: %', product_record.product_id, v_avg_rating, v_review_count;
  END LOOP;
END $$;

-- Verify results
SELECT 
  p.id,
  p.name,
  p.rating as stored_rating,
  p.reviews as stored_count,
  COUNT(r.id) as actual_reviews,
  ROUND(AVG(r.rating)::numeric, 2) as actual_avg_rating
FROM public.products p
LEFT JOIN public.product_reviews r ON r.product_id = p.id
GROUP BY p.id, p.name, p.rating, p.reviews
ORDER BY p.id;
