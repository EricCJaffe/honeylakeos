-- Allow any authenticated user to create a company row,
-- but only if they are the creator (prevents spoofing created_by)
CREATE POLICY "companies_insert_self"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());
