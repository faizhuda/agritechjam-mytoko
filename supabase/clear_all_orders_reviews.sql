-- ⚠️ DANGER ZONE ⚠️
-- This will DELETE ALL orders, reviews, and review helpfuls
-- Use this ONLY for development/testing purposes
-- DO NOT run this on production database!

-- Confirm before running by uncommenting the lines below

-- Step 1: Delete all review helpfuls (likes on reviews)
-- TRUNCATE TABLE public.review_helpfuls CASCADE;
DELETE FROM public.review_helpfuls;

-- Step 2: Delete all product reviews
-- TRUNCATE TABLE public.product_reviews CASCADE;
DELETE FROM public.product_reviews;

-- Step 3: Delete all order reviews (if using old table)
-- TRUNCATE TABLE public.order_reviews CASCADE;
DELETE FROM public.order_reviews WHERE TRUE;

-- Step 4: Delete all orders
-- TRUNCATE TABLE public.orders CASCADE;
DELETE FROM public.orders;

-- Step 5: Reset product ratings to 0
UPDATE public.products
SET rating = 0, reviews = 0
WHERE TRUE;

-- Verify everything is cleared
SELECT 'review_helpfuls' as table_name, COUNT(*) as count FROM public.review_helpfuls
UNION ALL
SELECT 'product_reviews', COUNT(*) FROM public.product_reviews
UNION ALL
SELECT 'order_reviews', COUNT(*) FROM public.order_reviews
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'products with reviews', COUNT(*) FROM public.products WHERE reviews > 0;

-- Expected result: All counts should be 0
