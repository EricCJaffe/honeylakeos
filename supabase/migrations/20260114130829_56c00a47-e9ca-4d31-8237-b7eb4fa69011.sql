-- Drop existing INSERT policy on group_members
DROP POLICY IF EXISTS "group_members_write_company_admin" ON public.group_members;

-- Create new INSERT policy that allows company admins OR group managers
CREATE POLICY "group_members_insert_admin_or_manager"
ON public.group_members
FOR INSERT
WITH CHECK (
  is_company_admin((SELECT g.company_id FROM public.groups g WHERE g.id = group_members.group_id))
  OR is_group_manager(group_members.group_id, auth.uid())
);