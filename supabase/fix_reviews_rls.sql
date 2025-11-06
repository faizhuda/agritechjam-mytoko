-- Fix Reviews RLS Policies
-- Allow anyone to read reviews (public access)
DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews;
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own reviews
DROP POLICY IF EXISTS "Users can insert own reviews" ON reviews;
CREATE POLICY "Users can insert own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Grant public read access to reviews table
GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reviews TO authenticated;
