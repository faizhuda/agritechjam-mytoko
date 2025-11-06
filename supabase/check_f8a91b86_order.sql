-- Check the problematic order in detail
-- Order ID: f8a91b86-02f1-4f98-bfbe-38b8fd3318a7

-- 1. Does this order exist?
SELECT 
  'Order exists?' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM public.orders WHERE id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3118a7'::uuid)
    THEN '✅ Yes' ELSE '❌ No' END as result;

-- 2. Order details
SELECT 
  id,
  order_number,
  user_id,
  status,
  created_at
FROM public.orders
WHERE id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3118a7'::uuid;

-- 3. Order items for this order
SELECT 
  oi.order_id,
  oi.product_id,
  p.name as product_name
FROM public.order_items oi
LEFT JOIN public.products p ON p.id = oi.product_id
WHERE oi.order_id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3118a7'::uuid;

-- 4. Test RLS for this specific order
SELECT 
  'Can insert review for order f8a91b86?' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3118a7'::uuid
        AND o.user_id = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'::uuid
        AND LOWER(o.status) = 'delivered'
        AND EXISTS (
          SELECT 1
          FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND oi.product_id = 3
        )
    ) THEN '✅ RLS WILL ALLOW'
    ELSE '❌ RLS WILL REJECT - WHY?'
  END as result;

-- 5. Step-by-step check for this order
SELECT 
  o.id,
  o.user_id,
  o.user_id = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'::uuid as user_match,
  o.status,
  LOWER(o.status) as status_lower,
  LOWER(o.status) = 'delivered' as status_match,
  EXISTS (
    SELECT 1 FROM public.order_items oi 
    WHERE oi.order_id = o.id AND oi.product_id = 3
  ) as has_product_3
FROM public.orders o
WHERE o.id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3118a7'::uuid;
