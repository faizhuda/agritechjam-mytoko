-- ALTERNATIVE: Check if reviews are in the OLD table (order_reviews)
-- If reviews are here, we need to migrate them to product_reviews

-- 1. Check if order_reviews table exists and has data
SELECT 
  'order_reviews' as table_name,
  COUNT(*) as total_reviews
FROM public.order_reviews
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'order_reviews'
);

-- 2. If there are reviews in order_reviews, show them
SELECT 
  or_rev.id,
  or_rev.order_id,
  o.user_id,
  or_rev.product_id,
  p.name as product_name,
  or_rev.rating,
  or_rev.comment,
  or_rev.created_at,
  prof.full_name as reviewer_name
FROM public.order_reviews or_rev
LEFT JOIN public.orders o ON o.id = or_rev.order_id
LEFT JOIN public.products p ON p.id = or_rev.product_id
LEFT JOIN public.profiles prof ON prof.id = o.user_id
ORDER BY or_rev.created_at DESC;

-- 3. MIGRATION: Copy reviews from order_reviews to product_reviews
-- ONLY RUN THIS if you see reviews in order_reviews but not in product_reviews

INSERT INTO public.product_reviews (user_id, product_id, rating, comment, helpful, created_at, updated_at)
SELECT 
  o.user_id,
  or_rev.product_id,
  or_rev.rating,
  or_rev.comment,
  0 as helpful,  -- Default helpful to 0 since old table doesn't have this column
  or_rev.created_at,
  or_rev.created_at as updated_at
FROM public.order_reviews or_rev
INNER JOIN public.orders o ON o.id = or_rev.order_id
WHERE o.user_id IS NOT NULL 
  AND or_rev.product_id IS NOT NULL
ON CONFLICT (user_id, product_id) DO NOTHING;

-- 4. Verify migration worked
SELECT 
  'product_reviews' as table_name,
  COUNT(*) as total_reviews,
  COUNT(DISTINCT product_id) as products_with_reviews
FROM public.product_reviews;

-- 5. Manually sync ratings to products table
-- (Trigger should have auto-run during INSERT, but let's force update to be sure)
DO $$
DECLARE
  v_product_id INTEGER;
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  FOR v_product_id IN SELECT DISTINCT product_id FROM public.product_reviews
  LOOP
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
  END LOOP;
END $$;

-- 6. Verify ratings were synced to products table
SELECT 
  p.id,
  p.name,
  p.rating,
  p.reviews,
  COUNT(pr.id) as actual_review_count,
  ROUND(AVG(pr.rating)::numeric, 2) as actual_avg_rating
FROM public.products p
LEFT JOIN public.product_reviews pr ON pr.product_id = p.id
WHERE p.id IN (SELECT DISTINCT product_id FROM public.product_reviews)
GROUP BY p.id, p.name, p.rating, p.reviews
ORDER BY p.id;
