-- Run this in Supabase SQL Editor to debug reviews issue
-- This will help us understand why reviews are not showing

-- 1. Check if product_reviews table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'product_reviews'
) as table_exists;

-- 2. Check if there are any reviews in the table
SELECT 
  COUNT(*) as total_reviews,
  COUNT(DISTINCT product_id) as products_with_reviews,
  COUNT(DISTINCT user_id) as unique_reviewers
FROM public.product_reviews;

-- 3. List all reviews with product and user info
SELECT 
  pr.id,
  pr.product_id,
  p.name as product_name,
  pr.user_id,
  prof.full_name as reviewer_name,
  pr.rating,
  pr.comment,
  pr.helpful,
  pr.created_at
FROM public.product_reviews pr
LEFT JOIN public.products p ON p.id = pr.product_id
LEFT JOIN public.profiles prof ON prof.id = pr.user_id
ORDER BY pr.created_at DESC;

-- 4. Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'product_reviews';

-- 5. List ALL policies on product_reviews
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_reviews'
ORDER BY cmd, policyname;

-- 6. Check if profiles table is accessible (for the join)
SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';

-- 7. Test query as it would be called from the app (without auth)
-- This simulates what the frontend sees
SET ROLE anon;
SELECT 
  pr.id,
  pr.product_id,
  pr.user_id,
  pr.rating,
  pr.comment,
  pr.created_at,
  pr.helpful
FROM public.product_reviews pr
WHERE pr.product_id = 1
ORDER BY pr.created_at DESC;
RESET ROLE;
