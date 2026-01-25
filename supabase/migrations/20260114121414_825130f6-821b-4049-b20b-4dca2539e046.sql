-- Fix the UPDATE policy to use the function in USING clause as well (avoids linter warning)
DROP POLICY IF EXISTS "group_members_update_role_guard" ON public.group_members;

-- Recreate with proper USING clause (check authorization for viewing the row to update)
CREATE POLICY "group_members_update_role_guard"
ON public.group_members
FOR UPDATE
TO authenticated
USING (can_update_group_member_role(group_id, user_id, role))
WITH CHECK (can_update_group_member_role(group_id, user_id, role));