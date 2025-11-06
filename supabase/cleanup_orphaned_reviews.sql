-- Cleanup orphaned order_reviews (reviews where the order no longer exists)
-- This happens when an order is deleted but its reviews remain

-- Step 1: VERIFY orphaned reviews (RUN THIS FIRST!)
SELECT 
  r.id as review_id,
  r.order_id,
  r.product_id,
  r.user_id,
  r.rating,
  r.comment,
  r.created_at
FROM public.order_reviews r
LEFT JOIN public.orders o ON o.id = r.order_id
WHERE o.id IS NULL;

-- If the query above returns any rows, those are orphaned reviews.

-- ============================================================================
-- Step 2: DELETE orphaned reviews (UNCOMMENT to run)
-- ============================================================================

-- DELETE FROM public.order_reviews r
-- USING (
--   SELECT r.id
--   FROM public.order_reviews r
--   LEFT JOIN public.orders o ON o.id = r.order_id
--   WHERE o.id IS NULL
-- ) orphans
-- WHERE r.id = orphans.id;

-- ============================================================================
-- Step 3: VERIFY cleanup
-- ============================================================================

-- Re-run Step 1 query to confirm all orphaned reviews are gone
-- It should return 0 rows after cleanup

SELECT count(*) as orphaned_reviews_count
FROM public.order_reviews r
LEFT JOIN public.orders o ON o.id = r.order_id
WHERE o.id IS NULL;
