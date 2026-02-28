-- 1. Create helper function to get company_id from entity based on type
CREATE OR REPLACE FUNCTION public.entity_acl_company_id(p_entity_type text, p_entity_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_entity_type
    WHEN 'note' THEN (SELECT company_id FROM public.notes WHERE id = p_entity_id)
    WHEN 'document' THEN (SELECT company_id FROM public.documents WHERE id = p_entity_id)
    WHEN 'folder' THEN (SELECT company_id FROM public.folders WHERE id = p_entity_id)
    WHEN 'project' THEN (SELECT company_id FROM public.projects WHERE id = p_entity_id)
    WHEN 'task' THEN (SELECT company_id FROM public.tasks WHERE id = p_entity_id)
    WHEN 'event' THEN (SELECT company_id FROM public.events WHERE id = p_entity_id)
    ELSE NULL
  END;
$$;
-- 2. Create helper function to check if user is entity owner
CREATE OR REPLACE FUNCTION public.entity_acl_is_owner(p_entity_type text, p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_entity_type
    WHEN 'note' THEN EXISTS (SELECT 1 FROM public.notes WHERE id = p_entity_id AND created_by = auth.uid())
    WHEN 'document' THEN EXISTS (SELECT 1 FROM public.documents WHERE id = p_entity_id AND created_by = auth.uid())
    WHEN 'folder' THEN EXISTS (SELECT 1 FROM public.folders WHERE id = p_entity_id AND created_by = auth.uid())
    WHEN 'project' THEN EXISTS (SELECT 1 FROM public.projects WHERE id = p_entity_id AND (created_by = auth.uid() OR owner_user_id = auth.uid()))
    WHEN 'task' THEN EXISTS (SELECT 1 FROM public.tasks WHERE id = p_entity_id AND created_by = auth.uid())
    WHEN 'event' THEN EXISTS (SELECT 1 FROM public.events WHERE id = p_entity_id AND created_by = auth.uid())
    ELSE false
  END;
$$;
-- 3. Drop the permissive SELECT policy
DROP POLICY IF EXISTS "entity_acl_select_company_admin" ON public.entity_acl;
-- 4. Create secure SELECT policy
-- Allow SELECT only if:
-- a) The entity belongs to user's active company, AND
-- b) User is grantee OR company admin OR entity owner
CREATE POLICY "entity_acl_select_authorized"
ON public.entity_acl FOR SELECT
USING (
  -- Get the company_id of the referenced entity
  entity_acl_company_id(entity_type, entity_id) IS NOT NULL
  AND (
    -- User is the grantee
    (grantee_type = 'user' AND grantee_id = auth.uid())
    OR
    -- User is in a group that is the grantee
    (grantee_type = 'group' AND grantee_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    ))
    OR
    -- User is company admin for the entity's company
    is_company_admin(entity_acl_company_id(entity_type, entity_id))
    OR
    -- User is the owner/creator of the entity
    entity_acl_is_owner(entity_type, entity_id)
  )
);
-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_entity_acl_lookup ON public.entity_acl(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_acl_grantee ON public.entity_acl(grantee_type, grantee_id);
