-- 1. Create helper function to extract company_id from storage path
CREATE OR REPLACE FUNCTION public.storage_path_company_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF((string_to_array(object_name, '/'))[1], '')::uuid;
$$;
-- 2. Create helper function to extract user_id from storage path (second segment)
CREATE OR REPLACE FUNCTION public.storage_path_user_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF((string_to_array(object_name, '/'))[2], '')::uuid;
$$;
-- 3. Create helper function to check if user can access a document file
-- This mirrors the documents RLS logic
CREATE OR REPLACE FUNCTION public.can_access_document_file(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = object_name
      AND is_company_member(d.company_id)
      AND (
        -- Company-wide access
        d.access_level = 'company'
        OR
        -- Personal document (created by user)
        d.created_by = auth.uid()
        OR
        -- Explicit ACL grant to user
        EXISTS (
          SELECT 1 FROM public.entity_acl acl
          WHERE acl.entity_type = 'document'
            AND acl.entity_id = d.id
            AND acl.grantee_type = 'user'
            AND acl.grantee_id = auth.uid()
        )
        OR
        -- Explicit ACL grant to a group the user belongs to
        EXISTS (
          SELECT 1 FROM public.entity_acl acl
          WHERE acl.entity_type = 'document'
            AND acl.entity_id = d.id
            AND acl.grantee_type = 'group'
            AND acl.grantee_id IN (
              SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
      )
  );
$$;
-- 4. Create helper function to check if user can delete a document file
CREATE OR REPLACE FUNCTION public.can_delete_document_file(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = object_name
      AND (
        -- Document creator can delete
        d.created_by = auth.uid()
        OR
        -- Company admin can delete
        is_company_admin(d.company_id)
        OR
        -- Super admin can delete
        is_super_admin()
      )
  );
$$;
-- 5. Drop existing permissive storage policies
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;
-- 6. Create secure SELECT policy
-- Allow if user can access the document per documents table + RLS
CREATE POLICY "documents_storage_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check document access via helper function
    can_access_document_file(name)
    OR
    -- Super admin bypass
    is_super_admin()
  )
);
-- 7. Create secure INSERT policy
-- Allow only if uploading to own user folder within a company the user belongs to
CREATE POLICY "documents_storage_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Must be member of the company (from path)
    is_company_member(storage_path_company_id(name))
    AND
    -- Must upload to own user folder
    storage_path_user_id(name) = auth.uid()
  )
);
-- 8. Create secure UPDATE policy (for file replacements)
CREATE POLICY "documents_storage_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND can_delete_document_file(name)
);
-- 9. Create secure DELETE policy
-- Allow only if user created the document or is company admin
CREATE POLICY "documents_storage_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND can_delete_document_file(name)
);
