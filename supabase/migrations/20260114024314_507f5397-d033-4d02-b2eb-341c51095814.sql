-- =====================================================
-- DELETE POLICIES FOR CORE BUSINESS TABLES
-- Rules:
-- 1. Company admins can delete any row in their company
-- 2. Creators can delete their own records
-- 3. Join tables: company admin OR link creator
-- =====================================================

-- GROUPS: Company admin can delete any group in company
CREATE POLICY "groups_delete_company_admin"
ON public.groups FOR DELETE
USING (is_company_admin(company_id));

-- GROUP_MEMBERS: Company admin OR link creator
CREATE POLICY "group_members_delete_admin_or_creator"
ON public.group_members FOR DELETE
USING (
  is_company_admin((SELECT g.company_id FROM public.groups g WHERE g.id = group_members.group_id))
);

-- PROJECTS: Already has projects_delete_owner_or_admin, verify it exists
-- Skip if already exists

-- PROJECT_MEMBERS: Company admin OR project owner OR link creator
CREATE POLICY "project_members_delete_admin_or_owner"
ON public.project_members FOR DELETE
USING (
  -- Company admin
  is_company_admin((SELECT p.company_id FROM public.projects p WHERE p.id = project_members.project_id))
  OR
  -- Project owner
  (SELECT p.owner_user_id FROM public.projects p WHERE p.id = project_members.project_id) = auth.uid()
);

-- TASKS: Creator or company admin can delete
CREATE POLICY "tasks_delete_creator_or_admin"
ON public.tasks FOR DELETE
USING (
  created_by = auth.uid()
  OR assigned_by = auth.uid()
  OR is_company_admin(company_id)
);

-- TASK_ASSIGNEES: Task creator, assigned_by, or company admin
CREATE POLICY "task_assignees_delete_authorized"
ON public.task_assignees FOR DELETE
USING (
  -- Company admin
  is_company_admin((SELECT t.company_id FROM public.tasks t WHERE t.id = task_assignees.task_id))
  OR
  -- Task creator
  (SELECT t.created_by FROM public.tasks t WHERE t.id = task_assignees.task_id) = auth.uid()
  OR
  -- Task assigner
  (SELECT t.assigned_by FROM public.tasks t WHERE t.id = task_assignees.task_id) = auth.uid()
);

-- EVENTS: Creator or company admin can delete
CREATE POLICY "events_delete_creator_or_admin"
ON public.events FOR DELETE
USING (
  created_by = auth.uid()
  OR is_company_admin(company_id)
);

-- EVENT_ATTENDEES: Event creator or company admin
CREATE POLICY "event_attendees_delete_authorized"
ON public.event_attendees FOR DELETE
USING (
  -- Company admin
  is_company_admin((SELECT e.company_id FROM public.events e WHERE e.id = event_attendees.event_id))
  OR
  -- Event creator
  (SELECT e.created_by FROM public.events e WHERE e.id = event_attendees.event_id) = auth.uid()
);

-- PROJECT_DOCUMENTS: Link creator or company admin
CREATE POLICY "project_documents_delete_authorized"
ON public.project_documents FOR DELETE
USING (
  created_by = auth.uid()
  OR is_company_admin((SELECT p.company_id FROM public.projects p WHERE p.id = project_documents.project_id))
);

-- TASK_DOCUMENTS: Link creator or company admin
CREATE POLICY "task_documents_delete_authorized"
ON public.task_documents FOR DELETE
USING (
  created_by = auth.uid()
  OR is_company_admin((SELECT t.company_id FROM public.tasks t WHERE t.id = task_documents.task_id))
);

-- EVENT_DOCUMENTS: Link creator or company admin
CREATE POLICY "event_documents_delete_authorized"
ON public.event_documents FOR DELETE
USING (
  created_by = auth.uid()
  OR is_company_admin((SELECT e.company_id FROM public.events e WHERE e.id = event_documents.event_id))
);

-- =====================================================
-- UPDATE POLICY FOR GROUP_MEMBERS (missing, needed for parity)
-- =====================================================
CREATE POLICY "group_members_update_company_admin"
ON public.group_members FOR UPDATE
USING (
  is_company_admin((SELECT g.company_id FROM public.groups g WHERE g.id = group_members.group_id))
);