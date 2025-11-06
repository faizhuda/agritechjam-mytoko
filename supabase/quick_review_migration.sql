-- Quick migration: Create product_reviews table and sync ratings
-- Run this in Supabase SQL Editor

-- 1. Create new product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 2. Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.product_reviews;

-- 4. Create RLS policies
CREATE POLICY "Anyone can view product reviews"
  ON public.product_reviews FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.product_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);

-- 6. Create trigger function
CREATE OR REPLACE FUNCTION update_product_rating_simple()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
  v_product_id INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.product_reviews
  WHERE product_id = v_product_id;

  UPDATE public.products
  SET rating = v_avg_rating, reviews = v_review_count
  WHERE id = v_product_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger
DROP TRIGGER IF EXISTS trigger_update_product_rating_simple ON public.product_reviews;
CREATE TRIGGER trigger_update_product_rating_simple
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating_simple();

-- 8. Migrate data from order_reviews (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_reviews') THEN
    INSERT INTO public.product_reviews (user_id, product_id, rating, comment, created_at)
    SELECT DISTINCT ON (user_id, product_id)
      user_id, product_id, rating, comment, created_at
    FROM public.order_reviews
    ORDER BY user_id, product_id, created_at DESC
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;
END $$;

-- 9. Sync all product ratings
DO $$
DECLARE
  product_record RECORD;
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  FOR product_record IN SELECT id FROM public.products
  LOOP
    SELECT 
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
      COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM public.product_reviews
    WHERE product_id = product_record.id;

    UPDATE public.products
    SET rating = v_avg_rating, reviews = v_review_count
    WHERE id = product_record.id;
  END LOOP;
END $$;

-- 10. Verify
SELECT 
  p.id,
  p.name,
  p.rating,
  p.reviews,
  COUNT(r.id) as actual_review_count
FROM public.products p
LEFT JOIN public.product_reviews r ON r.product_id = p.id
GROUP BY p.id, p.name, p.rating, p.reviews
ORDER BY p.id;
