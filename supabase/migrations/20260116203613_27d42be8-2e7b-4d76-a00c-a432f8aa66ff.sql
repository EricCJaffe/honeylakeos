-- ============================================================================
-- UNIFIED FOLDER SYSTEM: Extend folders table + create folder_acl
-- ============================================================================

-- Add new columns to folders table for company/personal scope
ALTER TABLE public.folders
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company', 'personal')),
ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;
-- Add constraint: personal folders must have owner_user_id, company folders must not
ALTER TABLE public.folders 
DROP CONSTRAINT IF EXISTS folders_scope_owner_check;
ALTER TABLE public.folders
ADD CONSTRAINT folders_scope_owner_check 
CHECK (
  (scope = 'company' AND owner_user_id IS NULL) OR 
  (scope = 'personal' AND owner_user_id IS NOT NULL)
);
-- Create index for efficient tree queries
CREATE INDEX IF NOT EXISTS idx_folders_parent ON public.folders (parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_scope ON public.folders (company_id, scope);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON public.folders (owner_user_id) WHERE owner_user_id IS NOT NULL;
-- ============================================================================
-- FOLDER ACL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folder_acl (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  principal_type text NOT NULL CHECK (principal_type IN ('company', 'group', 'user')),
  principal_id uuid NULL, -- null when principal_type = 'company' (means all company members)
  access_level text NOT NULL CHECK (access_level IN ('view', 'edit', 'admin')) DEFAULT 'view',
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure principal_id is set correctly based on type
  CONSTRAINT folder_acl_principal_check CHECK (
    (principal_type = 'company' AND principal_id IS NULL) OR
    (principal_type IN ('group', 'user') AND principal_id IS NOT NULL)
  ),
  
  -- Unique constraint to prevent duplicate ACL entries
  CONSTRAINT folder_acl_unique UNIQUE (folder_id, principal_type, principal_id)
);
-- Enable RLS
ALTER TABLE public.folder_acl ENABLE ROW LEVEL SECURITY;
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_folder_acl_folder ON public.folder_acl (folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_acl_principal ON public.folder_acl (principal_type, principal_id);
-- ============================================================================
-- HELPER FUNCTION: Check if user has access to a folder
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_folder_access_level(
  p_folder_id uuid,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder RECORD;
  v_access_level text := NULL;
  v_user_groups uuid[];
BEGIN
  -- Get folder info
  SELECT * INTO v_folder FROM folders WHERE id = p_folder_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Personal folders: only owner has access
  IF v_folder.scope = 'personal' THEN
    IF v_folder.owner_user_id = p_user_id THEN
      RETURN 'admin';
    ELSE
      RETURN NULL;
    END IF;
  END IF;
  
  -- Company Admin / Site Admin / Super Admin always have admin access
  IF is_company_admin(v_folder.company_id) OR 
     is_site_admin((SELECT site_id FROM companies WHERE id = v_folder.company_id)) OR
     is_super_admin() THEN
    RETURN 'admin';
  END IF;
  
  -- Get user's group memberships
  SELECT ARRAY_AGG(group_id) INTO v_user_groups 
  FROM group_members 
  WHERE user_id = p_user_id;
  
  -- Check ACL entries - highest access wins
  SELECT 
    CASE 
      WHEN bool_or(access_level = 'admin') THEN 'admin'
      WHEN bool_or(access_level = 'edit') THEN 'edit'
      WHEN bool_or(access_level = 'view') THEN 'view'
      ELSE NULL
    END INTO v_access_level
  FROM folder_acl
  WHERE folder_id = p_folder_id
    AND (
      -- Company-wide access
      (principal_type = 'company' AND principal_id IS NULL) OR
      -- User-specific access
      (principal_type = 'user' AND principal_id = p_user_id) OR
      -- Group-based access
      (principal_type = 'group' AND principal_id = ANY(COALESCE(v_user_groups, ARRAY[]::uuid[])))
    );
  
  RETURN v_access_level;
END;
$$;
-- ============================================================================
-- HELPER FUNCTION: Check folder nesting depth (prevent > 5 levels)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_folder_depth(p_folder_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_depth integer := 0;
  v_current_id uuid := p_folder_id;
  v_parent_id uuid;
BEGIN
  WHILE v_current_id IS NOT NULL AND v_depth < 10 LOOP
    SELECT parent_folder_id INTO v_parent_id FROM folders WHERE id = v_current_id;
    IF v_parent_id IS NOT NULL THEN
      v_depth := v_depth + 1;
      v_current_id := v_parent_id;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_depth;
END;
$$;
-- ============================================================================
-- TRIGGER: Prevent cycles and enforce max depth on folder insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_folder_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_depth integer;
  v_ancestor_id uuid;
BEGIN
  -- Skip if no parent
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check for cycle (folder cannot be its own ancestor)
  v_ancestor_id := NEW.parent_folder_id;
  WHILE v_ancestor_id IS NOT NULL LOOP
    IF v_ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'Folder hierarchy cycle detected';
    END IF;
    SELECT parent_folder_id INTO v_ancestor_id FROM folders WHERE id = v_ancestor_id;
  END LOOP;
  
  -- Check max depth (5 levels)
  v_depth := get_folder_depth(NEW.parent_folder_id) + 1;
  IF v_depth > 5 THEN
    RAISE EXCEPTION 'Maximum folder nesting depth (5) exceeded';
  END IF;
  
  -- Ensure parent is in same company
  IF (SELECT company_id FROM folders WHERE id = NEW.parent_folder_id) != NEW.company_id THEN
    RAISE EXCEPTION 'Parent folder must be in the same company';
  END IF;
  
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_folder_hierarchy_trigger ON public.folders;
CREATE TRIGGER validate_folder_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_folder_hierarchy();
-- ============================================================================
-- TRIGGER: Auto-create company-wide view ACL for new company folders
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_folder_acl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for company-scoped folders
  IF NEW.scope = 'company' THEN
    INSERT INTO folder_acl (company_id, folder_id, principal_type, principal_id, access_level, created_by)
    VALUES (NEW.company_id, NEW.id, 'company', NULL, 'view', NEW.created_by)
    ON CONFLICT (folder_id, principal_type, principal_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS auto_create_folder_acl_trigger ON public.folders;
CREATE TRIGGER auto_create_folder_acl_trigger
  AFTER INSERT ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_folder_acl();
-- ============================================================================
-- RLS POLICIES FOR FOLDERS (update existing)
-- ============================================================================

-- Drop existing policies to recreate
DROP POLICY IF EXISTS folders_select_company_member ON public.folders;
DROP POLICY IF EXISTS folders_insert_company_member ON public.folders;
DROP POLICY IF EXISTS folders_update_creator_or_admin ON public.folders;
DROP POLICY IF EXISTS folders_delete_creator_or_admin ON public.folders;
-- SELECT: Can see company folders with ACL access + own personal folders
CREATE POLICY folders_select_accessible ON public.folders
FOR SELECT USING (
  is_company_member(company_id) AND
  (
    -- Personal folders: only owner
    (scope = 'personal' AND owner_user_id = auth.uid()) OR
    -- Company folders: must have ACL access or be admin
    (scope = 'company' AND (
      is_company_admin(company_id) OR
      get_folder_access_level(id, auth.uid()) IS NOT NULL
    ))
  )
);
-- INSERT: Company members can create personal folders, admins/delegated admins can create company folders
CREATE POLICY folders_insert_accessible ON public.folders
FOR INSERT WITH CHECK (
  is_company_member(company_id) AND
  (
    -- Personal folders: anyone can create for themselves
    (scope = 'personal' AND owner_user_id = auth.uid()) OR
    -- Company folders: admins or users with admin access on parent folder
    (scope = 'company' AND (
      is_company_admin(company_id) OR
      (parent_folder_id IS NOT NULL AND get_folder_access_level(parent_folder_id, auth.uid()) = 'admin')
    ))
  )
);
-- UPDATE: Owner of personal, admin/delegated admin of company folders
CREATE POLICY folders_update_accessible ON public.folders
FOR UPDATE USING (
  is_company_member(company_id) AND
  (
    (scope = 'personal' AND owner_user_id = auth.uid()) OR
    (scope = 'company' AND (
      is_company_admin(company_id) OR
      get_folder_access_level(id, auth.uid()) = 'admin'
    ))
  )
);
-- DELETE: Owner of personal, admin/delegated admin of company folders
CREATE POLICY folders_delete_accessible ON public.folders
FOR DELETE USING (
  is_company_member(company_id) AND
  (
    (scope = 'personal' AND owner_user_id = auth.uid()) OR
    (scope = 'company' AND (
      is_company_admin(company_id) OR
      get_folder_access_level(id, auth.uid()) = 'admin'
    ))
  )
);
-- ============================================================================
-- RLS POLICIES FOR FOLDER_ACL
-- ============================================================================

-- SELECT: Can see ACL entries for folders you can view
CREATE POLICY folder_acl_select ON public.folder_acl
FOR SELECT USING (
  is_company_member(company_id) AND
  (
    is_company_admin(company_id) OR
    get_folder_access_level(folder_id, auth.uid()) IS NOT NULL
  )
);
-- INSERT: Company admins or folder admins
CREATE POLICY folder_acl_insert ON public.folder_acl
FOR INSERT WITH CHECK (
  is_company_member(company_id) AND
  (
    is_company_admin(company_id) OR
    get_folder_access_level(folder_id, auth.uid()) = 'admin'
  )
);
-- UPDATE: Company admins or folder admins
CREATE POLICY folder_acl_update ON public.folder_acl
FOR UPDATE USING (
  is_company_member(company_id) AND
  (
    is_company_admin(company_id) OR
    get_folder_access_level(folder_id, auth.uid()) = 'admin'
  )
);
-- DELETE: Company admins or folder admins
CREATE POLICY folder_acl_delete ON public.folder_acl
FOR DELETE USING (
  is_company_member(company_id) AND
  (
    is_company_admin(company_id) OR
    get_folder_access_level(folder_id, auth.uid()) = 'admin'
  )
);
-- ============================================================================
-- ADD AUDIT ACTIONS FOR FOLDERS
-- ============================================================================
-- (Audit logging will be done in application code via useAuditLog);
