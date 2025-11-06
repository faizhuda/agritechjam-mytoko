-- RESET ALL ORDERS: Delete ALL orders from ALL users
-- ⚠️ WARNING: This will delete ALL order history in the database!
-- ⚠️ Use this only for development/testing purposes!

-- ============================================================================
-- Step 1: BACKUP - View counts before deletion (IMPORTANT!)
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM public.orders) as total_orders,
  (SELECT COUNT(*) FROM public.order_items) as total_order_items,
  (SELECT COUNT(*) FROM public.order_reviews) as total_reviews,
  (SELECT COUNT(DISTINCT user_id) FROM public.orders) as affected_users;

-- ============================================================================
-- Step 2: View sample data (first 5 orders)
-- ============================================================================

SELECT 
  o.id,
  o.order_number,
  o.user_id,
  p.full_name as user_name,
  o.status,
  o.total,
  o.created_at
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
ORDER BY o.created_at DESC
LIMIT 5;

-- ============================================================================
-- Step 3: DELETE ALL (UNCOMMENT to execute)
-- ⚠️ THIS WILL DELETE EVERYTHING! ⚠️
-- ============================================================================

-- Delete all order_reviews first (foreign key dependency)
-- DELETE FROM public.order_reviews;

-- Delete all order_items (will be auto-deleted by CASCADE)
-- DELETE FROM public.order_items;

-- Delete all orders
-- DELETE FROM public.orders;

-- ============================================================================
-- Step 4: VERIFY - Confirm deletion (run after Step 3)
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM public.orders) as remaining_orders,
  (SELECT COUNT(*) FROM public.order_items) as remaining_order_items,
  (SELECT COUNT(*) FROM public.order_reviews) as remaining_reviews;

-- Should return all zeros (0, 0, 0) after deletion

-- ============================================================================
-- Step 5: Reset sequence (optional - reset order numbers)
-- ============================================================================
-- If you want order numbers to start from 1 again:

-- ALTER SEQUENCE IF EXISTS orders_order_number_seq RESTART WITH 1;
