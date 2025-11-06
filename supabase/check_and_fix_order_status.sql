-- Check and fix order status issues
-- RLS policy checks for LOWER(o.status) = 'delivered', but status might have issues

-- 1. Check what statuses exist in orders table
SELECT 
  status,
  COUNT(*) as count,
  LENGTH(status) as length,
  CASE 
    WHEN LOWER(TRIM(status)) = 'delivered' THEN '✅ Will work'
    ELSE '❌ Won''t match RLS'
  END as rls_match
FROM public.orders
WHERE status IS NOT NULL
GROUP BY status
ORDER BY count DESC;

-- 2. Check specific user's orders (replace with your user_id)
-- SELECT 
--   id,
--   order_number,
--   status,
--   LOWER(status) as status_lower,
--   user_id,
--   created_at
-- FROM public.orders
-- WHERE user_id = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'  -- Replace with actual user_id
-- ORDER BY created_at DESC;

-- 3. Fix any status issues (normalize to lowercase 'delivered')
-- CAREFUL: Only run this if you confirm the statuses need fixing
-- UPDATE public.orders
-- SET status = 'delivered'
-- WHERE LOWER(TRIM(status)) = 'delivered'
--   AND status != 'delivered';

-- 4. Check order_items for those delivered orders
SELECT 
  o.id as order_id,
  o.order_number,
  o.status,
  o.user_id,
  oi.product_id,
  p.name as product_name,
  CASE 
    WHEN LOWER(o.status) = 'delivered' THEN '✅ Can review'
    ELSE '❌ Cannot review: status is "' || o.status || '"'
  END as review_status
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
JOIN public.products p ON p.id = oi.product_id
WHERE o.user_id = (SELECT auth.uid())  -- Current logged in user
ORDER BY o.created_at DESC
LIMIT 10;

-- 5. Test the exact RLS policy condition for a specific order
-- Replace the UUIDs with actual values from console log
-- SELECT 
--   CASE 
--     WHEN EXISTS (
--       SELECT 1
--       FROM public.orders o
--       WHERE o.id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid  -- order_id from console
--         AND o.user_id = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'::uuid  -- user_id from console
--         AND LOWER(o.status) = 'delivered'
--         AND EXISTS (
--           SELECT 1
--           FROM public.order_items oi
--           WHERE oi.order_id = o.id
--             AND oi.product_id = 3  -- product_id from console
--         )
--     ) THEN '✅ RLS WILL ALLOW'
--     ELSE '❌ RLS WILL REJECT - Check why:'
--   END as rls_check;

-- 6. Detailed breakdown - why RLS might fail
-- SELECT 
--   'Order exists?' as check_name,
--   CASE WHEN EXISTS (SELECT 1 FROM public.orders WHERE id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid) 
--     THEN '✅ Yes' ELSE '❌ No' END as result
-- UNION ALL
-- SELECT 
--   'User owns order?',
--   CASE WHEN EXISTS (
--     SELECT 1 FROM public.orders 
--     WHERE id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid 
--       AND user_id = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'::uuid
--   ) THEN '✅ Yes' ELSE '❌ No' END
-- UNION ALL
-- SELECT 
--   'Status is delivered?',
--   CASE WHEN EXISTS (
--     SELECT 1 FROM public.orders 
--     WHERE id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid 
--       AND LOWER(status) = 'delivered'
--   ) THEN '✅ Yes (status: ' || (SELECT status FROM public.orders WHERE id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid) || ')' 
--       ELSE '❌ No (status: ' || (SELECT status FROM public.orders WHERE id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid) || ')' END
-- UNION ALL
-- SELECT 
--   'Product in order_items?',
--   CASE WHEN EXISTS (
--     SELECT 1 FROM public.order_items 
--     WHERE order_id = '70a91b8b-02f1-4796-bfbe-3808fd3118a7'::uuid 
--       AND product_id = 3
--   ) THEN '✅ Yes' ELSE '❌ No' END;
