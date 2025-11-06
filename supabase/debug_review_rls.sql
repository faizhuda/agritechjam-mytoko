-- Debug RLS issue for order_reviews
-- Based on console error: order ef2b093e-afab-45a3-bf36-2ac9856da150, product 3

-- Step 1: Check if order exists and its status
SELECT 
  id,
  order_number,
  user_id,
  status,
  LOWER(status) as status_lower,
  LOWER(status) = 'delivered' as is_delivered,
  created_at
FROM public.orders
WHERE id = 'ef2b093e-afab-45a3-bf36-2ac9856da150';

-- Step 2: Check order_items for this order
SELECT 
  id,
  order_id,
  product_id,
  quantity,
  price,
  products.name as product_name
FROM public.order_items
LEFT JOIN public.products ON products.id = order_items.product_id
WHERE order_id = 'ef2b093e-afab-45a3-bf36-2ac9856da150';

-- Step 3: Check if product_id 3 exists in order_items for this order
SELECT 
  EXISTS (
    SELECT 1 
    FROM public.order_items
    WHERE order_id = 'ef2b093e-afab-45a3-bf36-2ac9856da150'
      AND product_id = 3
  ) as product_3_in_order;

-- Step 4: Simulate the RLS policy check (what the policy actually checks)
SELECT 
  'ef2b093e-afab-45a3-bf36-2ac9856da150'::uuid as order_id,
  3 as product_id,
  'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'::uuid as user_id,
  EXISTS (
    SELECT 1 
    FROM public.orders o
    WHERE o.id = 'ef2b093e-afab-45a3-bf36-2ac9856da150'
      AND o.user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'
      AND LOWER(o.status) = 'delivered'
      AND EXISTS (
        SELECT 1 
        FROM public.order_items oi
        WHERE oi.order_id = o.id
          AND oi.product_id = 3
      )
  ) as rls_check_passes;

-- Step 5: Check ALL orders with product_id 3 for this user
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.created_at,
  oi.product_id,
  oi.quantity,
  p.name as product_name
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
JOIN public.products p ON p.id = oi.product_id
WHERE o.user_id = 'c5422f4d-fd14-47a1-8e26-b3fff4e83adf'
  AND oi.product_id = 3
ORDER BY o.created_at DESC;
--           FROM public.order_items oi
--           WHERE oi.order_id = o.id
--             AND oi.product_id = 123  -- Replace with actual product_id
--         )
--     ) THEN 'ALLOWED'
--     ELSE 'DENIED'
--   END as insert_permission;

-- 5. Check for duplicate reviews (that would violate unique constraint)
SELECT 
  order_id,
  product_id,
  user_id,
  COUNT(*) as review_count
FROM public.order_reviews
GROUP BY order_id, product_id, user_id
HAVING COUNT(*) > 1;
