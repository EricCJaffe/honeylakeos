-- Add missing DELETE policies for groups, tasks, events, group_members, task_assignees, event_attendees
-- Following the deletion security pattern: Company Admins can delete any record, standard users can only delete records they created

-- 1. DELETE policy for groups (company admins or creator)
CREATE POLICY "groups_delete_policy"
ON public.groups FOR DELETE
USING (
  is_company_admin(company_id) 
  OR created_by = auth.uid()
);
-- 2. DELETE policy for group_members (company admins only)
CREATE POLICY "group_members_delete_policy"
ON public.group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND is_company_admin(g.company_id)
  )
);
-- 3. DELETE policy for tasks (company admins or creator)
CREATE POLICY "tasks_delete_policy"
ON public.tasks FOR DELETE
USING (
  is_company_admin(company_id) 
  OR created_by = auth.uid()
);
-- 4. DELETE policy for task_assignees (task creator or company admin)
CREATE POLICY "task_assignees_delete_policy"
ON public.task_assignees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_assignees.task_id 
    AND (t.created_by = auth.uid() OR is_company_admin(t.company_id))
  )
);
-- 5. DELETE policy for events (company admins or creator)
CREATE POLICY "events_delete_policy"
ON public.events FOR DELETE
USING (
  is_company_admin(company_id) 
  OR created_by = auth.uid()
);
-- 6. DELETE policy for event_attendees (event creator or company admin)
CREATE POLICY "event_attendees_delete_policy"
ON public.event_attendees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_attendees.event_id 
    AND (e.created_by = auth.uid() OR is_company_admin(e.company_id))
  )
);
