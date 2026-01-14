-- Allow company creators to insert themselves as initial admin
DROP POLICY IF EXISTS "memberships_insert_self_initial_admin" ON public.memberships;

CREATE POLICY "memberships_insert_self_initial_admin"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'company_admin'
  AND status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = company_id
      AND c.created_by = auth.uid()
  )
);