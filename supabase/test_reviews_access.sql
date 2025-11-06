-- QUICK TEST: Check if reviews can be read by anonymous users
-- This simulates exactly what the frontend does

-- 1. First, check if there are ANY reviews at all (as superuser/admin)
SELECT 
  COUNT(*) as total_reviews,
  array_agg(DISTINCT product_id) as product_ids_with_reviews
FROM public.product_reviews;

-- 2. Check RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('product_reviews', 'profiles');

-- 3. Check SELECT policies exist
SELECT 
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('product_reviews', 'profiles')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- 4. Test as anonymous user (this is what frontend sees!)
SET ROLE anon;

-- Try to read reviews for product 1
SELECT 
  pr.id,
  pr.product_id,
  pr.rating,
  pr.comment,
  pr.created_at
FROM public.product_reviews pr
WHERE pr.product_id = 1;

-- Try with profiles join (this is what the app query does)
SELECT 
  pr.id,
  pr.product_id,
  pr.user_id,
  pr.rating,
  pr.comment,
  pr.created_at,
  pr.helpful,
  prof.full_name
FROM public.product_reviews pr
LEFT JOIN public.profiles prof ON prof.id = pr.user_id
WHERE pr.product_id = 1;

RESET ROLE;

-- 5. If the queries above return 0 rows but step #1 showed reviews exist,
-- then RLS is blocking access. Run this fix:

-- DISABLE RLS temporarily to test (ONLY FOR DEBUGGING)
-- ALTER TABLE public.product_reviews DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Better: Fix the policies properly
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_reviews;
CREATE POLICY "Enable read access for all users"
  ON public.product_reviews
  FOR SELECT
  USING (true);  -- Remove role restriction, allow everyone

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);  -- Remove role restriction, allow everyone
