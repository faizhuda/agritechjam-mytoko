-- QUICK CLEAR: One command to delete everything
-- ⚠️ USE WITH CAUTION ⚠️

-- Execute this single command to clear all:
DO $$
BEGIN
  -- 1. Clear review helpfuls (must be first due to FK)
  TRUNCATE TABLE public.review_helpfuls CASCADE;
  RAISE NOTICE '✓ Cleared review_helpfuls';

  -- 2. Clear product reviews
  TRUNCATE TABLE public.product_reviews CASCADE;
  RAISE NOTICE '✓ Cleared product_reviews';

  -- 3. Clear order reviews (old table, if exists)
  BEGIN
    TRUNCATE TABLE public.order_reviews CASCADE;
    RAISE NOTICE '✓ Cleared order_reviews';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '⊘ order_reviews table does not exist (skipped)';
  END;

  -- 4. Clear orders
  TRUNCATE TABLE public.orders CASCADE;
  RAISE NOTICE '✓ Cleared orders';

  -- 5. Reset product ratings
  UPDATE public.products SET rating = 0, reviews = 0;
  RAISE NOTICE '✓ Reset all product ratings to 0';

  RAISE NOTICE '════════════════════════════════════';
  RAISE NOTICE '✅ ALL DATA CLEARED SUCCESSFULLY!';
  RAISE NOTICE '════════════════════════════════════';
END $$;

-- Verify everything is empty
SELECT 
  'After clear:' as status,
  (SELECT COUNT(*) FROM public.orders) as orders,
  (SELECT COUNT(*) FROM public.product_reviews) as reviews,
  (SELECT COUNT(*) FROM public.review_helpfuls) as helpfuls,
  (SELECT COUNT(*) FROM public.products WHERE reviews > 0) as products_with_reviews;
