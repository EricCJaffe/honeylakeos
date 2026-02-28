-- Allow creators to select their own companies
DROP POLICY IF EXISTS "companies_select_creator" ON public.companies;
CREATE POLICY "companies_select_creator"
ON public.companies
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
