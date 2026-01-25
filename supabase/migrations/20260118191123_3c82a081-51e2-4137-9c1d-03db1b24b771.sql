-- Integration Providers (static list, seeded)
CREATE TABLE public.integration_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  scope_supported TEXT NOT NULL CHECK (scope_supported IN ('company', 'site', 'both')),
  is_enabled_platform_wide BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can read providers (public reference data)
CREATE POLICY "Anyone authenticated can read providers"
  ON public.integration_providers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only super_admin can modify (via admin tooling, not needed now)
CREATE POLICY "Super admin can manage providers"
  ON public.integration_providers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.user_id = auth.uid() AND sm.role = 'super_admin'
    )
  );

-- Company Integrations (per-company config)
CREATE TABLE public.company_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB NOT NULL DEFAULT '{}',
  secret_ref TEXT, -- Reference to secret (masked, actual secret stored server-side)
  secret_configured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider_key)
);

-- Enable RLS
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

-- Company admin can read/write their company's integrations
CREATE POLICY "Company admin can manage integrations"
  ON public.company_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.company_id = company_integrations.company_id
        AND m.role = 'company_admin'
        AND m.status = 'active'
    )
  );

-- Site admin can manage any company's integrations
CREATE POLICY "Site admin can manage any company integrations"
  ON public.company_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.user_id = auth.uid() AND sm.role IN ('site_admin', 'super_admin')
    )
  );

-- Site Integrations (global config)
CREATE TABLE public.site_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB NOT NULL DEFAULT '{}',
  secret_ref TEXT,
  secret_configured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, provider_key)
);

-- Enable RLS
ALTER TABLE public.site_integrations ENABLE ROW LEVEL SECURITY;

-- Only site admin can manage site integrations
CREATE POLICY "Site admin can manage site integrations"
  ON public.site_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.user_id = auth.uid() AND sm.role IN ('site_admin', 'super_admin')
    )
  );

-- Integration Secrets (server-only, never exposed to client)
CREATE TABLE public.integration_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('company', 'site')),
  scope_id UUID NOT NULL, -- company_id or site_id
  provider_key TEXT NOT NULL,
  secret_key TEXT NOT NULL, -- e.g., 'api_key', 'client_id', 'client_secret'
  encrypted_value TEXT NOT NULL, -- encrypted using pgcrypto
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_id, provider_key, secret_key)
);

-- Enable RLS - NO SELECT for client, only RPC functions can access
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

-- No policies for direct client access - only edge functions/RPC can access via service role

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_company_integrations_updated_at
  BEFORE UPDATE ON public.company_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

CREATE TRIGGER update_site_integrations_updated_at
  BEFORE UPDATE ON public.site_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

CREATE TRIGGER update_integration_secrets_updated_at
  BEFORE UPDATE ON public.integration_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_integration_updated_at();

-- Seed integration providers
INSERT INTO public.integration_providers (key, name, description, scope_supported, is_enabled_platform_wide) VALUES
  ('zapier', 'Zapier', 'Automate workflows by connecting to 5,000+ apps. Create triggers and actions to streamline your processes.', 'company', true),
  ('plaid', 'Plaid', 'Connect bank accounts securely. Enable ACH transfers, account verification, and transaction data.', 'company', true),
  ('planning_center', 'Planning Center Online', 'Sync people, giving, and group data with Planning Center for church management.', 'site', true);

-- Add audit action types for integrations
-- (These will be logged via the existing audit_logs table)