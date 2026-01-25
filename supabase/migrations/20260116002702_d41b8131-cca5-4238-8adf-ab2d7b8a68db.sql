-- ===============================================
-- MODULE SYSTEM HARDENING: DB-level enforcement
-- ===============================================

-- 1. Create is_module_enabled function (single source of truth)
-- For CORE modules, always return true
-- For premium modules, check company_modules table
CREATE OR REPLACE FUNCTION public.is_module_enabled(p_company_id uuid, p_module_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_core_modules text[] := ARRAY['projects', 'tasks', 'calendar', 'documents', 'notes', 'folders', 'groups', 'locations'];
  v_module_id uuid;
  v_status text;
BEGIN
  -- Core modules are always enabled for any valid company
  IF p_module_key = ANY(v_core_modules) THEN
    RETURN EXISTS (SELECT 1 FROM companies WHERE id = p_company_id);
  END IF;
  
  -- For premium modules, check company_modules
  SELECT m.id INTO v_module_id
  FROM modules m
  WHERE m.slug = p_module_key AND m.is_public = true;
  
  IF v_module_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT cm.status INTO v_status
  FROM company_modules cm
  WHERE cm.company_id = p_company_id 
    AND cm.module_id = v_module_id;
  
  -- Module is enabled if status is 'active' or 'trial'
  RETURN v_status IN ('active', 'trial');
END;
$$;

-- 2. Create require_module_enabled function (raises exception if not enabled)
CREATE OR REPLACE FUNCTION public.require_module_enabled(p_company_id uuid, p_module_key text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_module_enabled(p_company_id, p_module_key) THEN
    RAISE EXCEPTION 'MODULE_DISABLED: Module % is not enabled for this company', p_module_key;
  END IF;
END;
$$;

-- 3. Create is_link_allowed function for entity_links
-- Both modules for the entity types must be enabled
CREATE OR REPLACE FUNCTION public.is_link_allowed(p_company_id uuid, p_from_type text, p_to_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type_to_module text;
BEGIN
  -- Map entity types to module keys
  -- Check that both source and target modules are enabled
  RETURN is_module_enabled(p_company_id, 
    CASE p_from_type 
      WHEN 'task' THEN 'tasks'
      WHEN 'project' THEN 'projects'
      WHEN 'event' THEN 'calendar'
      WHEN 'document' THEN 'documents'
      WHEN 'note' THEN 'notes'
      WHEN 'folder' THEN 'folders'
      ELSE p_from_type
    END
  )
  AND is_module_enabled(p_company_id,
    CASE p_to_type 
      WHEN 'task' THEN 'tasks'
      WHEN 'project' THEN 'projects'
      WHEN 'event' THEN 'calendar'
      WHEN 'document' THEN 'documents'
      WHEN 'note' THEN 'notes'
      WHEN 'folder' THEN 'folders'
      ELSE p_to_type
    END
  );
END;
$$;

-- 4. Update RLS policies on feature tables to check module enablement
-- We'll add module checks to the existing policies

-- TASKS: Add module check
DROP POLICY IF EXISTS "tasks_select_company_member" ON tasks;
CREATE POLICY "tasks_select_company_member" ON tasks
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "tasks_insert_company_member" ON tasks;
CREATE POLICY "tasks_insert_company_member" ON tasks
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "tasks_update_creator_or_admin" ON tasks;
CREATE POLICY "tasks_update_creator_or_admin" ON tasks
  FOR UPDATE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "tasks_delete_creator_or_admin" ON tasks;
CREATE POLICY "tasks_delete_creator_or_admin" ON tasks
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'tasks'));

-- EVENTS/CALENDAR: Add module check
DROP POLICY IF EXISTS "events_select_company_member" ON events;
CREATE POLICY "events_select_company_member" ON events
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "events_insert_company_member" ON events;
CREATE POLICY "events_insert_company_member" ON events
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "events_update_creator_or_admin" ON events;
CREATE POLICY "events_update_creator_or_admin" ON events
  FOR UPDATE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "events_delete_creator_or_admin" ON events;
CREATE POLICY "events_delete_creator_or_admin" ON events
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'calendar'));

-- PROJECTS: Add module check
DROP POLICY IF EXISTS "projects_select_company_member" ON projects;
CREATE POLICY "projects_select_company_member" ON projects
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'projects'));

DROP POLICY IF EXISTS "projects_insert_company_member" ON projects;
CREATE POLICY "projects_insert_company_member" ON projects
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'projects'));

DROP POLICY IF EXISTS "projects_update_owner_or_admin" ON projects;
CREATE POLICY "projects_update_owner_or_admin" ON projects
  FOR UPDATE
  USING ((owner_user_id = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'projects'));

DROP POLICY IF EXISTS "projects_delete_owner_or_admin" ON projects;
CREATE POLICY "projects_delete_owner_or_admin" ON projects
  FOR DELETE
  USING ((owner_user_id = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'projects'));

-- DOCUMENTS: Add module check
DROP POLICY IF EXISTS "documents_select_access" ON documents;
CREATE POLICY "documents_select_access" ON documents
  FOR SELECT
  USING (
    is_company_member(company_id) 
    AND is_module_enabled(company_id, 'documents')
    AND (
      access_level = 'company' 
      OR created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM entity_acl
        WHERE entity_acl.entity_type = 'document' 
          AND entity_acl.entity_id = documents.id 
          AND (
            (entity_acl.grantee_type = 'user' AND entity_acl.grantee_id = auth.uid())
            OR (entity_acl.grantee_type = 'group' AND entity_acl.grantee_id IN (
              SELECT group_members.group_id FROM group_members WHERE group_members.user_id = auth.uid()
            ))
          )
      )
    )
  );

DROP POLICY IF EXISTS "documents_insert_company_member" ON documents;
CREATE POLICY "documents_insert_company_member" ON documents
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'documents'));

DROP POLICY IF EXISTS "documents_update_creator_or_admin" ON documents;
CREATE POLICY "documents_update_creator_or_admin" ON documents
  FOR UPDATE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'documents'));

DROP POLICY IF EXISTS "documents_delete_creator_or_admin" ON documents;
CREATE POLICY "documents_delete_creator_or_admin" ON documents
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'documents'));

-- NOTES: Add module check
DROP POLICY IF EXISTS "notes_select_access" ON notes;
CREATE POLICY "notes_select_access" ON notes
  FOR SELECT
  USING (
    is_company_member(company_id) 
    AND is_module_enabled(company_id, 'notes')
    AND (
      access_level = 'company' 
      OR created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM entity_acl
        WHERE entity_acl.entity_type = 'note' 
          AND entity_acl.entity_id = notes.id 
          AND (
            (entity_acl.grantee_type = 'user' AND entity_acl.grantee_id = auth.uid())
            OR (entity_acl.grantee_type = 'group' AND entity_acl.grantee_id IN (
              SELECT group_members.group_id FROM group_members WHERE group_members.user_id = auth.uid()
            ))
          )
      )
    )
  );

DROP POLICY IF EXISTS "notes_insert_company_member" ON notes;
CREATE POLICY "notes_insert_company_member" ON notes
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'notes'));

DROP POLICY IF EXISTS "notes_update_creator_or_admin" ON notes;
CREATE POLICY "notes_update_creator_or_admin" ON notes
  FOR UPDATE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'notes'));

DROP POLICY IF EXISTS "notes_delete_creator_or_admin" ON notes;
CREATE POLICY "notes_delete_creator_or_admin" ON notes
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'notes'));

-- FOLDERS: Add module check
DROP POLICY IF EXISTS "folders_select_company_member" ON folders;
CREATE POLICY "folders_select_company_member" ON folders
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'folders') AND (access_level = 'company' OR created_by = auth.uid()));

DROP POLICY IF EXISTS "folders_insert_company_member" ON folders;
CREATE POLICY "folders_insert_company_member" ON folders
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'folders'));

DROP POLICY IF EXISTS "folders_update_creator_or_admin" ON folders;
CREATE POLICY "folders_update_creator_or_admin" ON folders
  FOR UPDATE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'folders'));

DROP POLICY IF EXISTS "folders_delete_creator_or_admin" ON folders;
CREATE POLICY "folders_delete_creator_or_admin" ON folders
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'folders'));

-- GROUPS: Add module check  
DROP POLICY IF EXISTS "groups_select_company_member" ON groups;
CREATE POLICY "groups_select_company_member" ON groups
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'groups'));

DROP POLICY IF EXISTS "groups_write_company_admin" ON groups;
CREATE POLICY "groups_write_company_admin" ON groups
  FOR INSERT
  WITH CHECK (is_company_admin(company_id) AND is_module_enabled(company_id, 'groups'));

DROP POLICY IF EXISTS "groups_update_company_admin" ON groups;
CREATE POLICY "groups_update_company_admin" ON groups
  FOR UPDATE
  USING (is_company_admin(company_id) AND is_module_enabled(company_id, 'groups'));

DROP POLICY IF EXISTS "groups_delete_company_admin" ON groups;
CREATE POLICY "groups_delete_company_admin" ON groups
  FOR DELETE
  USING (is_company_admin(company_id) AND is_module_enabled(company_id, 'groups'));

-- ENTITY_LINKS: Gate by both modules being enabled
DROP POLICY IF EXISTS "entity_links_select_company_member" ON entity_links;
CREATE POLICY "entity_links_select_company_member" ON entity_links
  FOR SELECT
  USING (is_company_member(company_id) AND is_link_allowed(company_id, from_type, to_type));

DROP POLICY IF EXISTS "entity_links_insert_company_member" ON entity_links;
CREATE POLICY "entity_links_insert_company_member" ON entity_links
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND created_by = auth.uid() AND is_link_allowed(company_id, from_type, to_type));

DROP POLICY IF EXISTS "entity_links_delete_creator_or_admin" ON entity_links;
CREATE POLICY "entity_links_delete_creator_or_admin" ON entity_links
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_link_allowed(company_id, from_type, to_type));

-- TASK RECURRENCE TABLES: Add module check
DROP POLICY IF EXISTS "task_recurrence_exceptions_select_company_member" ON task_recurrence_exceptions;
CREATE POLICY "task_recurrence_exceptions_select_company_member" ON task_recurrence_exceptions
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "task_recurrence_exceptions_insert_company_member" ON task_recurrence_exceptions;
CREATE POLICY "task_recurrence_exceptions_insert_company_member" ON task_recurrence_exceptions
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "task_recurrence_exceptions_delete_creator_or_admin" ON task_recurrence_exceptions;
CREATE POLICY "task_recurrence_exceptions_delete_creator_or_admin" ON task_recurrence_exceptions
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "task_recurrence_overrides_select_company_member" ON task_recurrence_overrides;
CREATE POLICY "task_recurrence_overrides_select_company_member" ON task_recurrence_overrides
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "task_recurrence_overrides_insert_company_member" ON task_recurrence_overrides;
CREATE POLICY "task_recurrence_overrides_insert_company_member" ON task_recurrence_overrides
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "task_recurrence_overrides_delete_creator_or_admin" ON task_recurrence_overrides;
CREATE POLICY "task_recurrence_overrides_delete_creator_or_admin" ON task_recurrence_overrides
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'tasks'));

-- TASK OCCURRENCE COMPLETIONS: Add module check
DROP POLICY IF EXISTS "task_occurrence_completions_select_company_member" ON task_occurrence_completions;
CREATE POLICY "task_occurrence_completions_select_company_member" ON task_occurrence_completions
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'tasks'));

DROP POLICY IF EXISTS "task_occurrence_completions_insert_authorized" ON task_occurrence_completions;
CREATE POLICY "task_occurrence_completions_insert_authorized" ON task_occurrence_completions
  FOR INSERT
  WITH CHECK (
    is_company_member(company_id) 
    AND is_module_enabled(company_id, 'tasks')
    AND (
      EXISTS (SELECT 1 FROM tasks t WHERE t.id = series_task_id AND t.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = series_task_id AND ta.user_id = auth.uid())
      OR is_company_admin(company_id)
    )
  );

DROP POLICY IF EXISTS "task_occurrence_completions_delete_authorized" ON task_occurrence_completions;
CREATE POLICY "task_occurrence_completions_delete_authorized" ON task_occurrence_completions
  FOR DELETE
  USING (
    is_module_enabled(company_id, 'tasks')
    AND (
      EXISTS (SELECT 1 FROM tasks t WHERE t.id = series_task_id AND t.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = series_task_id AND ta.user_id = auth.uid())
      OR is_company_admin(company_id)
    )
  );

-- EVENT RECURRENCE TABLES: Add module check
DROP POLICY IF EXISTS "event_recurrence_exceptions_select_company_member" ON event_recurrence_exceptions;
CREATE POLICY "event_recurrence_exceptions_select_company_member" ON event_recurrence_exceptions
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "event_recurrence_exceptions_insert_company_member" ON event_recurrence_exceptions;
CREATE POLICY "event_recurrence_exceptions_insert_company_member" ON event_recurrence_exceptions
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "event_recurrence_exceptions_delete_creator_or_admin" ON event_recurrence_exceptions;
CREATE POLICY "event_recurrence_exceptions_delete_creator_or_admin" ON event_recurrence_exceptions
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "event_recurrence_overrides_select_company_member" ON event_recurrence_overrides;
CREATE POLICY "event_recurrence_overrides_select_company_member" ON event_recurrence_overrides
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "event_recurrence_overrides_insert_company_member" ON event_recurrence_overrides;
CREATE POLICY "event_recurrence_overrides_insert_company_member" ON event_recurrence_overrides
  FOR INSERT
  WITH CHECK (is_company_member(company_id) AND is_module_enabled(company_id, 'calendar'));

DROP POLICY IF EXISTS "event_recurrence_overrides_delete_creator_or_admin" ON event_recurrence_overrides;
CREATE POLICY "event_recurrence_overrides_delete_creator_or_admin" ON event_recurrence_overrides
  FOR DELETE
  USING ((created_by = auth.uid() OR is_company_admin(company_id)) AND is_module_enabled(company_id, 'calendar'));

-- PROJECT_PHASES: Add module check
DROP POLICY IF EXISTS "project_phases_select_company_member" ON project_phases;
CREATE POLICY "project_phases_select_company_member" ON project_phases
  FOR SELECT
  USING (is_company_member(company_id) AND is_module_enabled(company_id, 'projects'));

DROP POLICY IF EXISTS "project_phases_insert_company_admin" ON project_phases;
CREATE POLICY "project_phases_insert_company_admin" ON project_phases
  FOR INSERT
  WITH CHECK (
    is_module_enabled(company_id, 'projects') 
    AND (
      is_company_admin(company_id) 
      OR (SELECT projects.owner_user_id FROM projects WHERE projects.id = project_phases.project_id) = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_phases_update_company_admin" ON project_phases;
CREATE POLICY "project_phases_update_company_admin" ON project_phases
  FOR UPDATE
  USING (
    is_module_enabled(company_id, 'projects') 
    AND (
      is_company_admin(company_id) 
      OR (SELECT projects.owner_user_id FROM projects WHERE projects.id = project_phases.project_id) = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_phases_delete_company_admin" ON project_phases;
CREATE POLICY "project_phases_delete_company_admin" ON project_phases
  FOR DELETE
  USING (
    is_module_enabled(company_id, 'projects') 
    AND (
      is_company_admin(company_id) 
      OR (SELECT projects.owner_user_id FROM projects WHERE projects.id = project_phases.project_id) = auth.uid()
    )
  );

-- 5. Add RLS policy for company_modules to allow admins to delete (for disabling)
DROP POLICY IF EXISTS "company_modules_delete_admins" ON company_modules;
CREATE POLICY "company_modules_delete_admins" ON company_modules
  FOR DELETE
  USING (
    is_company_admin(company_id) 
    OR is_site_admin((SELECT c.site_id FROM companies c WHERE c.id = company_modules.company_id))
  );

-- Allow UPDATE on company_modules for admins
DROP POLICY IF EXISTS "company_modules_update_admins" ON company_modules;
CREATE POLICY "company_modules_update_admins" ON company_modules
  FOR UPDATE
  USING (
    is_company_admin(company_id) 
    OR is_site_admin((SELECT c.site_id FROM companies c WHERE c.id = company_modules.company_id))
  );

-- 6. Create trigger to seed company_modules when a new company is created
CREATE OR REPLACE FUNCTION public.seed_company_modules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert premium modules as disabled by default
  INSERT INTO company_modules (company_id, module_id, status)
  SELECT NEW.id, m.id, 'suspended'
  FROM modules m
  WHERE m.slug NOT IN ('projects', 'tasks', 'calendar', 'documents', 'notes', 'folders', 'groups', 'locations')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_company_modules ON companies;
CREATE TRIGGER trigger_seed_company_modules
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION seed_company_modules();

-- 7. Backfill company_modules for existing companies (premium modules only)
INSERT INTO company_modules (company_id, module_id, status)
SELECT c.id, m.id, 'suspended'
FROM companies c
CROSS JOIN modules m
WHERE m.slug NOT IN ('projects', 'tasks', 'calendar', 'documents', 'notes', 'folders', 'groups', 'locations')
ON CONFLICT DO NOTHING;