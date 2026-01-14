-- Allow users to select their own memberships
DROP POLICY IF EXISTS "memberships_select_self" ON public.memberships;

CREATE POLICY "memberships_select_self"
ON public.memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());