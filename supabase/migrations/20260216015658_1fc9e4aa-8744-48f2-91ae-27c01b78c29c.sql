-- Make whatsapp-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';

-- Drop public read policy if it exists
DROP POLICY IF EXISTS "Public can read whatsapp media" ON storage.objects;

-- Ensure authenticated users can still read whatsapp media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can read whatsapp media'
  ) THEN
    CREATE POLICY "Authenticated users can read whatsapp media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'whatsapp-media' AND auth.uid() IS NOT NULL);
  END IF;
END $$;