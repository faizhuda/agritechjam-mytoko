-- Deep dive RLS policy debugging
-- Run these queries while logged in as the user who wants to review

-- 1. Who am I?
SELECT auth.uid() as my_user_id;

-- 2. Do I own this order?
SELECT 
  o.id,
  o.user_id,
  o.status,
  LOWER(o.status) as status_lower,
  auth.uid() as my_id,
  o.user_id = auth.uid() as i_own_it
FROM public.orders o
WHERE o.id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3318a7'::uuid;

-- 3. Does this order have the product?
SELECT 
  oi.order_id,
  oi.product_id,
  p.name
FROM public.order_items oi
JOIN public.products p ON p.id = oi.product_id
WHERE oi.order_id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3118a7'::uuid
  AND oi.product_id = 3;

-- 4. Step by step RLS condition check
SELECT 
  'Step 1: auth.uid() = user_id' as check_name,
  CASE WHEN auth.uid() = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'::uuid 
    THEN '✅ Pass' ELSE '❌ Fail: ' || COALESCE(auth.uid()::text, 'NULL') END as result
UNION ALL
SELECT 
  'Step 2: Order exists',
  CASE WHEN EXISTS (SELECT 1 FROM public.orders WHERE id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3318a7'::uuid)
    THEN '✅ Pass' ELSE '❌ Fail' END
UNION ALL
SELECT 
  'Step 3: User owns order',
  CASE WHEN EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3318a7'::uuid 
      AND user_id = auth.uid()
  ) THEN '✅ Pass' ELSE '❌ Fail' END
UNION ALL
SELECT 
  'Step 4: Status is delivered',
  CASE WHEN EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3318a7'::uuid 
      AND LOWER(status) = 'delivered'
  ) THEN '✅ Pass' ELSE '❌ Fail' END
UNION ALL
SELECT 
  'Step 5: Product in order_items',
  CASE WHEN EXISTS (
    SELECT 1 FROM public.order_items 
    WHERE order_id = 'f8a91b86-02f1-4f98-bfbe-38b8fd3318a7'::uuid 
      AND product_id = 3
  ) THEN '✅ Pass' ELSE '❌ Fail' END;

-- 5. Try to actually insert (this will use RLS)
-- Uncomment to test actual insert
-- INSERT INTO public.order_reviews (user_id, order_id, product_id, rating, comment)
-- VALUES (
--   auth.uid(),
--   'f8a91b86-02f1-4f98-bfbe-38b8fd3318a7'::uuid,
--   3,
--   5,
--   'Test review from SQL'
-- );
