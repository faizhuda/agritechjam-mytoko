-- START CLEAN: Delete all orders and reviews for user
-- User ID: c5422f4d-fd14-47a1-8e26-b3fff4e83adf (Faiz Huda)

-- ============================================================================
-- Step 1: BACKUP - View all data before deletion (IMPORTANT!)
-- ============================================================================

-- View all orders for this user
SELECT 
  id,
  order_number,
  status,
  total,
  created_at,
  'orders' as table_name
FROM public.orders
WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'
ORDER BY created_at DESC;

-- View all order_items for this user's orders
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.quantity,
  oi.price,
  p.name as product_name,
  'order_items' as table_name
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
LEFT JOIN public.products p ON p.id = oi.product_id
WHERE o.user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf';

-- View all reviews for this user
SELECT 
  id,
  order_id,
  product_id,
  rating,
  comment,
  created_at,
  'order_reviews' as table_name
FROM public.order_reviews
WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf';

-- ============================================================================
-- Step 2: COUNT - How many records will be deleted
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM public.orders WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf') as orders_count,
  (SELECT COUNT(*) FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE o.user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf') as order_items_count,
  (SELECT COUNT(*) FROM public.order_reviews WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf') as reviews_count;

-- ============================================================================
-- Step 3: DELETE - Start clean (UNCOMMENT to execute)
-- ============================================================================

-- Delete order_reviews first (foreign key dependency)
-- DELETE FROM public.order_reviews
-- WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf';

-- Delete order_items (will be auto-deleted by CASCADE, but explicit is safer)
-- DELETE FROM public.order_items
-- WHERE order_id IN (
--   SELECT id FROM public.orders WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'
-- );

-- Delete orders (will cascade to order_items if ON DELETE CASCADE is set)
-- DELETE FROM public.orders
-- WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf';

-- ============================================================================
-- Step 4: VERIFY - Confirm deletion (run after Step 3)
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM public.orders WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf') as remaining_orders,
  (SELECT COUNT(*) FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE o.user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf') as remaining_order_items,
  (SELECT COUNT(*) FROM public.order_reviews WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf') as remaining_reviews;

-- Should return all zeros after deletion

-- ============================================================================
-- ALTERNATIVE: Delete only DELIVERED orders (keep pending/shipped)
-- ============================================================================
-- If you only want to clean delivered orders:

-- DELETE FROM public.order_reviews
-- WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'
--   AND order_id IN (
--     SELECT id FROM public.orders 
--     WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf' 
--     AND LOWER(status) = 'delivered'
--   );

-- DELETE FROM public.orders
-- WHERE user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'
--   AND LOWER(status) = 'delivered';
