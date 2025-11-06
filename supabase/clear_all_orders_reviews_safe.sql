-- SAFE VERSION: Clear all orders and reviews with confirmation
-- This version shows what will be deleted before actually deleting

-- ═══════════════════════════════════════════════════════════
-- STEP 1: PREVIEW - See what will be deleted
-- ═══════════════════════════════════════════════════════════

SELECT 'Summary of data to be deleted:' as info;

SELECT 
  'Orders' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as oldest_date,
  MAX(created_at) as newest_date
FROM public.orders;

SELECT 
  'Product Reviews' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT product_id) as unique_products,
  MIN(created_at) as oldest_date,
  MAX(created_at) as newest_date
FROM public.product_reviews;

SELECT 
  'Review Helpfuls (Likes)' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM public.review_helpfuls;

-- Show products that will have ratings reset
SELECT 
  id,
  name,
  rating,
  reviews as review_count
FROM public.products
WHERE reviews > 0 OR rating > 0
ORDER BY reviews DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════
-- STEP 2: DELETE - Uncomment the DO block below to execute
-- ═══════════════════════════════════════════════════════════

/*
DO $$
DECLARE
  v_orders_deleted INT;
  v_reviews_deleted INT;
  v_helpfuls_deleted INT;
  v_products_reset INT;
BEGIN
  -- Delete review helpfuls
  DELETE FROM public.review_helpfuls;
  GET DIAGNOSTICS v_helpfuls_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % review helpfuls', v_helpfuls_deleted;

  -- Delete product reviews
  DELETE FROM public.product_reviews;
  GET DIAGNOSTICS v_reviews_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % product reviews', v_reviews_deleted;

  -- Delete order reviews (old table)
  DELETE FROM public.order_reviews WHERE TRUE;
  
  -- Delete orders
  DELETE FROM public.orders;
  GET DIAGNOSTICS v_orders_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % orders', v_orders_deleted;

  -- Reset product ratings
  UPDATE public.products
  SET rating = 0, reviews = 0
  WHERE rating > 0 OR reviews > 0;
  GET DIAGNOSTICS v_products_reset = ROW_COUNT;
  RAISE NOTICE 'Reset ratings for % products', v_products_reset;

  RAISE NOTICE '✅ All data cleared successfully!';
END $$;
*/

-- ═══════════════════════════════════════════════════════════
-- STEP 3: VERIFY - Check that everything is cleared
-- ═══════════════════════════════════════════════════════════

/*
SELECT 
  'After deletion:' as status,
  (SELECT COUNT(*) FROM public.orders) as orders,
  (SELECT COUNT(*) FROM public.product_reviews) as reviews,
  (SELECT COUNT(*) FROM public.review_helpfuls) as helpfuls,
  (SELECT COUNT(*) FROM public.products WHERE reviews > 0) as products_with_reviews;
*/
