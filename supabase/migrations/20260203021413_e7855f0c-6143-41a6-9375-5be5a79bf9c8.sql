-- Fix storage bucket policies - restrict to entity owners/involved users
-- Note: Storage RLS policies use the storage.objects table

-- Drop existing overly permissive policies for deal-files
DROP POLICY IF EXISTS "Authenticated users can view deal files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload deal files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own deal files" ON storage.objects;

-- Drop existing overly permissive policies for organization-files
DROP POLICY IF EXISTS "Authenticated users can view organization files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload organization files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete organization files" ON storage.objects;

-- Drop existing overly permissive policies for people-files
DROP POLICY IF EXISTS "Authenticated users can view people files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload people files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete people files" ON storage.objects;

-- Create restrictive policies for deal-files bucket
-- SELECT: Only users who own or created the deal can view files
CREATE POLICY "Users can view files from their deals" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'deal-files' AND
  EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id::text = (storage.foldername(name))[1]
    AND (d.owner_id = auth.uid() OR d.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- INSERT: Only authenticated users can upload to deals they own/created
CREATE POLICY "Users can upload to their deals" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deal-files' AND
  EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id::text = (storage.foldername(name))[1]
    AND (d.owner_id = auth.uid() OR d.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- DELETE: Only deal owners/creators or admins can delete
CREATE POLICY "Users can delete files from their deals" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'deal-files' AND
  EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id::text = (storage.foldername(name))[1]
    AND (d.owner_id = auth.uid() OR d.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Create restrictive policies for organization-files bucket
CREATE POLICY "Users can view files from their organizations" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'organization-files' AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id::text = (storage.foldername(name))[1]
    AND (o.owner_id = auth.uid() OR o.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can upload to their organizations" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-files' AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id::text = (storage.foldername(name))[1]
    AND (o.owner_id = auth.uid() OR o.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can delete files from their organizations" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-files' AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id::text = (storage.foldername(name))[1]
    AND (o.owner_id = auth.uid() OR o.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Create restrictive policies for people-files bucket
CREATE POLICY "Users can view files from their people" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'people-files' AND
  EXISTS (
    SELECT 1 FROM people p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND (p.owner_id = auth.uid() OR p.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can upload to their people" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'people-files' AND
  EXISTS (
    SELECT 1 FROM people p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND (p.owner_id = auth.uid() OR p.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can delete files from their people" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'people-files' AND
  EXISTS (
    SELECT 1 FROM people p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND (p.owner_id = auth.uid() OR p.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Fix sent_emails table - restrict to email sender only
DROP POLICY IF EXISTS "Authenticated users can view sent emails" ON sent_emails;

CREATE POLICY "Users can view own sent emails or admins" ON sent_emails
FOR SELECT TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Fix profiles table - keep ability to view names for mentions but restrict sensitive data
-- Note: The profiles table needs to be viewable for team mentions to work
-- However, we should ensure only essential fields are exposed in queries
-- The current RLS is acceptable since profiles only contain: full_name, avatar_url, phone
-- These are necessary for team collaboration features (mentions, assignments)

-- Add comment to document the security decision
COMMENT ON TABLE profiles IS 'User profiles - readable by all authenticated users for team collaboration features like @mentions and task assignments. Contains only non-sensitive fields: full_name, avatar_url, phone.';
