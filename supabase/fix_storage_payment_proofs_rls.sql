-- Make payment-proofs bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';

-- Check current policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname ILIKE '%payment%';

-- Policy sudah ada, bucket sudah public. Ready to use!
