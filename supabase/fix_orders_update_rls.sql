-- Fix Orders RLS - Allow users to UPDATE their own orders

-- Drop existing update policy if any
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

-- Create new policy allowing users to update their own orders
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify the policy exists
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'orders' AND cmd = 'UPDATE';
