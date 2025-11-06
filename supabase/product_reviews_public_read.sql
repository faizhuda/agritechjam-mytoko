-- Run this in Supabase SQL Editor
-- Purpose: Fix RLS policies for product_reviews to allow public read access
-- This will allow all users (logged in or not) to see reviews

-- Enable RLS on product_reviews table
ALTER TABLE IF EXISTS public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Public read product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Anyone can read product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Anyone can view product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Public can read reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can view product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Allow public read product_reviews" ON public.product_reviews;

-- Create ONE clear public read policy without role restriction
-- USING (true) means allow everyone including anonymous
CREATE POLICY "Enable read access for all users"
  ON public.product_reviews
  FOR SELECT
  USING (true);

-- Also ensure profiles table allows public read (needed for the join)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Verify the policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'product_reviews' AND cmd = 'SELECT';

-- Check if there are any reviews in the table
SELECT 
  pr.id,
  pr.product_id,
  pr.user_id,
  pr.rating,
  pr.comment,
  pr.created_at,
  p.name as product_name,
  prof.full_name as reviewer_name
FROM public.product_reviews pr
LEFT JOIN public.products p ON p.id = pr.product_id
LEFT JOIN public.profiles prof ON prof.id = pr.user_id
ORDER BY pr.created_at DESC
LIMIT 10;
