-- Add is_module_enabled check to CRM tables RLS policies
-- CRM clients: Add module check

DROP POLICY IF EXISTS "Company members can view CRM clients" ON public.crm_clients;
CREATE POLICY "Company members can view CRM clients"
  ON public.crm_clients FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
DROP POLICY IF EXISTS "Company members can create CRM clients" ON public.crm_clients;
CREATE POLICY "Company members can create CRM clients"
  ON public.crm_clients FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
DROP POLICY IF EXISTS "Company members can update CRM clients" ON public.crm_clients;
CREATE POLICY "Company members can update CRM clients"
  ON public.crm_clients FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
DROP POLICY IF EXISTS "Company members can delete CRM clients" ON public.crm_clients;
CREATE POLICY "Company members can delete CRM clients"
  ON public.crm_clients FOR DELETE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
-- Coach profiles: Add module check

DROP POLICY IF EXISTS "Company members can view coach profiles" ON public.coach_profiles;
CREATE POLICY "Company members can view coach profiles"
  ON public.coach_profiles FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'coaches'));
DROP POLICY IF EXISTS "Company members can create coach profiles" ON public.coach_profiles;
CREATE POLICY "Company members can create coach profiles"
  ON public.coach_profiles FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'coaches'));
DROP POLICY IF EXISTS "Company members can update coach profiles" ON public.coach_profiles;
CREATE POLICY "Company members can update coach profiles"
  ON public.coach_profiles FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'coaches'));
DROP POLICY IF EXISTS "Company admins can delete coach profiles" ON public.coach_profiles;
CREATE POLICY "Company admins can delete coach profiles"
  ON public.coach_profiles FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'coaches'));
-- External contacts: Link to CRM module for access control

DROP POLICY IF EXISTS "Company members can view external contacts" ON public.external_contacts;
CREATE POLICY "Company members can view external contacts"
  ON public.external_contacts FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
DROP POLICY IF EXISTS "Company members can create external contacts" ON public.external_contacts;
CREATE POLICY "Company members can create external contacts"
  ON public.external_contacts FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
DROP POLICY IF EXISTS "Company members can update external contacts" ON public.external_contacts;
CREATE POLICY "Company members can update external contacts"
  ON public.external_contacts FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
DROP POLICY IF EXISTS "Company members can delete external contacts" ON public.external_contacts;
CREATE POLICY "Company members can delete external contacts"
  ON public.external_contacts FOR DELETE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'crm'));
