-- Cleanup script for corrupted order UUID: f0a91b86-82f1-4f98-bfbe-38b8fd3318a7
-- Run this script in Supabase SQL Editor to clean up the corrupted data

-- Step 1: VERIFY what data will be deleted (RUN THIS FIRST!)
-- Check the corrupted order
SELECT 
  'orders' as table_name,
  id, 
  user_id, 
  order_number, 
  status, 
  created_at
FROM public.orders
WHERE id::text LIKE '%f0a91b86%';

-- Check related order_items
SELECT 
  'order_items' as table_name,
  id,
  order_id,
  product_id,
  quantity,
  price
FROM public.order_items
WHERE order_id::text LIKE '%f0a91b86%';

-- Check related order_reviews
SELECT 
  'order_reviews' as table_name,
  id,
  order_id,
  user_id,
  product_id,
  rating,
  comment
FROM public.order_reviews
WHERE order_id::text LIKE '%f0a91b86%';

-- ============================================================================
-- Step 2: DELETE the corrupted data (ONLY RUN AFTER VERIFYING STEP 1!)
-- ============================================================================

-- UNCOMMENT THE LINES BELOW TO ACTUALLY DELETE THE DATA:

-- -- Delete order_reviews first (foreign key dependency)
-- DELETE FROM public.order_reviews
-- WHERE order_id::text LIKE '%f0a91b86%';

-- -- Delete order_items (foreign key dependency)
-- DELETE FROM public.order_items
-- WHERE order_id::text LIKE '%f0a91b86%';

-- -- Finally, delete the corrupted order
-- DELETE FROM public.orders
-- WHERE id::text LIKE '%f0a91b86%';

-- ============================================================================
-- Step 3: VERIFY ALL in one query (Better view!)
-- ============================================================================

SELECT 
  'orders' as table_name,
  count(*) as count
FROM public.orders
WHERE id::text LIKE '%f0a91b86%'

UNION ALL

SELECT 
  'order_items' as table_name,
  count(*) as count
FROM public.order_items
WHERE order_id::text LIKE '%f0a91b86%'

UNION ALL

SELECT 
  'order_reviews' as table_name,
  count(*) as count
FROM public.order_reviews
WHERE order_id::text LIKE '%f0a91b86%';

-- ============================================================================
-- ALTERNATIVE: More precise deletion using exact UUID
-- ============================================================================
-- If you know the EXACT corrupted UUID, use this instead (more precise):

-- DELETE FROM public.order_reviews
-- WHERE order_id = 'f0a91b86-82f1-4f98-bfbe-38b8fd3318a7';

-- DELETE FROM public.order_items
-- WHERE order_id = 'f0a91b86-82f1-4f98-bfbe-38b8fd3318a7';

-- DELETE FROM public.orders
-- WHERE id = 'f0a91b86-82f1-4f98-bfbe-38b8fd3318a7';
