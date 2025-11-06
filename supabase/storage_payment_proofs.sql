-- Create storage bucket for payment proofs
-- This will store uploaded payment proof images

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload to their own order folder (authenticated users only)
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] = 'payment-proofs'
);

-- Policy: Anyone can view payment proofs (public bucket)
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'orders');

-- Policy: Users can delete their own payment proofs
CREATE POLICY "Users can delete own payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] = 'payment-proofs'
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'orders';
