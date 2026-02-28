-- Replace the SELECT policy with one that also allows creators
DROP POLICY IF EXISTS "companies_select_member_or_site_admin" ON public.companies;
CREATE POLICY "companies_select_member_or_site_admin"
ON public.companies
FOR SELECT
TO authenticated
USING (
  is_company_member(id)
  OR is_site_admin(site_id)
  OR created_by = auth.uid()
);
