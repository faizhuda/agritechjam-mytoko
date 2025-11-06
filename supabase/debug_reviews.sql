-- Debug: Check current state and insert test review

-- 1. Check if table exists and has data
SELECT 'product_reviews table' as info, COUNT(*) as count FROM public.product_reviews;

-- 2. Check current product ratings
SELECT id, name, rating, reviews FROM public.products ORDER BY id;

-- 3. Get your user ID (replace with your actual user email)
-- Run this first to get your user_id:
SELECT id, email FROM auth.users WHERE email = 'faizhuda@apps.ipb.ac.id';

-- 4. Insert a test review for Headphone (product_id = 1)
-- REPLACE 'YOUR_USER_ID_HERE' with the UUID from query #3 above
INSERT INTO public.product_reviews (user_id, product_id, rating, comment)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace this with your actual UUID
  1,  -- Headphone
  5,
  'Amazing sound quality! The noise cancellation is superb.'
)
ON CONFLICT (user_id, product_id) DO UPDATE
SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW();

-- 5. Verify the review was inserted
SELECT * FROM public.product_reviews WHERE product_id = 1;

-- 6. Check if trigger updated the product rating
SELECT id, name, rating, reviews FROM public.products WHERE id = 1;

-- 7. If rating still 0, manually trigger the update
DO $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_review_count INTEGER;
BEGIN
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.product_reviews
  WHERE product_id = 1;

  UPDATE public.products
  SET rating = v_avg_rating, reviews = v_review_count
  WHERE id = 1;
  
  RAISE NOTICE 'Updated Headphone - Rating: %, Reviews: %', v_avg_rating, v_review_count;
END $$;

-- 8. Final check
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
