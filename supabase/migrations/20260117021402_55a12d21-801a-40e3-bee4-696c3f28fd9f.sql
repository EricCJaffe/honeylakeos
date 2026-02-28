-- Create framework owner type enum
CREATE TYPE public.framework_owner_type AS ENUM ('system', 'coach_org', 'company');
-- Create framework status enum
CREATE TYPE public.framework_status AS ENUM ('draft', 'published', 'archived');
-- Create framework frequency type enum
CREATE TYPE public.framework_frequency_type AS ENUM ('weekly', 'monthly', 'quarterly', 'annual', 'custom');
-- Create metric type enum
CREATE TYPE public.framework_metric_type AS ENUM ('percentage', 'count', 'trend', 'boolean');
-- Create dashboard audience enum
CREATE TYPE public.framework_dashboard_audience AS ENUM ('company_admin', 'leadership', 'member', 'coach', 'coach_manager');
-- ==========================================
-- FRAMEWORKS TABLE
-- ==========================================
CREATE TABLE public.frameworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_type public.framework_owner_type NOT NULL DEFAULT 'company',
  owner_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  version_label TEXT DEFAULT 'v1',
  status public.framework_status NOT NULL DEFAULT 'draft',
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
-- ==========================================
-- FRAMEWORK CONCEPTS (Vocabulary + Structure)
-- ==========================================
CREATE TABLE public.framework_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  display_name_singular TEXT NOT NULL,
  display_name_plural TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, key)
);
-- ==========================================
-- FRAMEWORK CADENCES (Routines & Rhythm)
-- ==========================================
CREATE TABLE public.framework_cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  frequency_type public.framework_frequency_type NOT NULL DEFAULT 'weekly',
  interval_n INTEGER,
  target_day_of_week INTEGER CHECK (target_day_of_week >= 0 AND target_day_of_week <= 6),
  target_day_of_month INTEGER CHECK (target_day_of_month >= 1 AND target_day_of_month <= 31),
  duration_minutes INTEGER,
  default_owner_role_hint TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, key)
);
-- ==========================================
-- FRAMEWORK TEMPLATES (Link to existing template system)
-- ==========================================
CREATE TABLE public.framework_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  template_id UUID,
  applies_to_concept_key TEXT,
  cadence_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ==========================================
-- FRAMEWORK DASHBOARDS
-- ==========================================
CREATE TABLE public.framework_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  audience public.framework_dashboard_audience NOT NULL DEFAULT 'member',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, key)
);
-- ==========================================
-- FRAMEWORK DASHBOARD SECTIONS
-- ==========================================
CREATE TABLE public.framework_dashboard_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES public.framework_dashboards(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  data_source_type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ==========================================
-- FRAMEWORK HEALTH METRICS
-- ==========================================
CREATE TABLE public.framework_health_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  metric_type public.framework_metric_type NOT NULL DEFAULT 'count',
  data_source_type TEXT NOT NULL,
  calculation_key TEXT NOT NULL,
  thresholds JSONB DEFAULT '{"green": null, "yellow": null, "red": null}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_id, key)
);
-- ==========================================
-- COMPANY FRAMEWORKS (Active framework per company)
-- ==========================================
CREATE TABLE public.company_frameworks (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE PRIMARY KEY,
  active_framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE RESTRICT,
  adopted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  adopted_by UUID
);
-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_frameworks_company_id ON public.frameworks(company_id);
CREATE INDEX idx_frameworks_owner_type ON public.frameworks(owner_type);
CREATE INDEX idx_frameworks_status ON public.frameworks(status);
CREATE INDEX idx_framework_concepts_framework_id ON public.framework_concepts(framework_id);
CREATE INDEX idx_framework_cadences_framework_id ON public.framework_cadences(framework_id);
CREATE INDEX idx_framework_templates_framework_id ON public.framework_templates(framework_id);
CREATE INDEX idx_framework_dashboards_framework_id ON public.framework_dashboards(framework_id);
CREATE INDEX idx_framework_dashboard_sections_dashboard_id ON public.framework_dashboard_sections(dashboard_id);
CREATE INDEX idx_framework_health_metrics_framework_id ON public.framework_health_metrics(framework_id);
-- ==========================================
-- UPDATED_AT TRIGGERS
-- ==========================================
CREATE TRIGGER update_frameworks_updated_at
  BEFORE UPDATE ON public.frameworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_framework_concepts_updated_at
  BEFORE UPDATE ON public.framework_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_framework_cadences_updated_at
  BEFORE UPDATE ON public.framework_cadences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_framework_templates_updated_at
  BEFORE UPDATE ON public.framework_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_framework_dashboards_updated_at
  BEFORE UPDATE ON public.framework_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_framework_dashboard_sections_updated_at
  BEFORE UPDATE ON public.framework_dashboard_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_framework_health_metrics_updated_at
  BEFORE UPDATE ON public.framework_health_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ==========================================
-- RLS POLICIES
-- ==========================================

-- FRAMEWORKS
ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System templates readable by authenticated users"
  ON public.frameworks FOR SELECT
  USING (is_system_template = true AND status = 'published');
CREATE POLICY "Company frameworks readable by company members"
  ON public.frameworks FOR SELECT
  USING (
    company_id IS NOT NULL 
    AND public.is_company_member(company_id)
  );
CREATE POLICY "Company admins can insert company frameworks"
  ON public.frameworks FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL 
    AND public.is_company_admin(company_id)
  );
CREATE POLICY "Company admins can update company frameworks"
  ON public.frameworks FOR UPDATE
  USING (
    company_id IS NOT NULL 
    AND public.is_company_admin(company_id)
    AND is_system_template = false
  );
CREATE POLICY "Company admins can delete draft company frameworks"
  ON public.frameworks FOR DELETE
  USING (
    company_id IS NOT NULL 
    AND public.is_company_admin(company_id)
    AND is_system_template = false
    AND status = 'draft'
  );
-- FRAMEWORK CONCEPTS
ALTER TABLE public.framework_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concepts readable via framework access"
  ON public.framework_concepts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND (
        (f.is_system_template = true AND f.status = 'published')
        OR (f.company_id IS NOT NULL AND public.is_company_member(f.company_id))
      )
    )
  );
CREATE POLICY "Company admins can manage concepts"
  ON public.framework_concepts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND f.company_id IS NOT NULL
      AND public.is_company_admin(f.company_id)
      AND f.is_system_template = false
    )
  );
-- FRAMEWORK CADENCES
ALTER TABLE public.framework_cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cadences readable via framework access"
  ON public.framework_cadences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND (
        (f.is_system_template = true AND f.status = 'published')
        OR (f.company_id IS NOT NULL AND public.is_company_member(f.company_id))
      )
    )
  );
CREATE POLICY "Company admins can manage cadences"
  ON public.framework_cadences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND f.company_id IS NOT NULL
      AND public.is_company_admin(f.company_id)
      AND f.is_system_template = false
    )
  );
-- FRAMEWORK TEMPLATES
ALTER TABLE public.framework_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates readable via framework access"
  ON public.framework_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND (
        (f.is_system_template = true AND f.status = 'published')
        OR (f.company_id IS NOT NULL AND public.is_company_member(f.company_id))
      )
    )
  );
CREATE POLICY "Company admins can manage framework templates"
  ON public.framework_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND f.company_id IS NOT NULL
      AND public.is_company_admin(f.company_id)
      AND f.is_system_template = false
    )
  );
-- FRAMEWORK DASHBOARDS
ALTER TABLE public.framework_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dashboards readable via framework access"
  ON public.framework_dashboards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND (
        (f.is_system_template = true AND f.status = 'published')
        OR (f.company_id IS NOT NULL AND public.is_company_member(f.company_id))
      )
    )
  );
CREATE POLICY "Company admins can manage dashboards"
  ON public.framework_dashboards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND f.company_id IS NOT NULL
      AND public.is_company_admin(f.company_id)
      AND f.is_system_template = false
    )
  );
-- FRAMEWORK DASHBOARD SECTIONS
ALTER TABLE public.framework_dashboard_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dashboard sections readable via dashboard access"
  ON public.framework_dashboard_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.framework_dashboards d
      JOIN public.frameworks f ON f.id = d.framework_id
      WHERE d.id = dashboard_id
      AND (
        (f.is_system_template = true AND f.status = 'published')
        OR (f.company_id IS NOT NULL AND public.is_company_member(f.company_id))
      )
    )
  );
CREATE POLICY "Company admins can manage dashboard sections"
  ON public.framework_dashboard_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.framework_dashboards d
      JOIN public.frameworks f ON f.id = d.framework_id
      WHERE d.id = dashboard_id
      AND f.company_id IS NOT NULL
      AND public.is_company_admin(f.company_id)
      AND f.is_system_template = false
    )
  );
-- FRAMEWORK HEALTH METRICS
ALTER TABLE public.framework_health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Health metrics readable via framework access"
  ON public.framework_health_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND (
        (f.is_system_template = true AND f.status = 'published')
        OR (f.company_id IS NOT NULL AND public.is_company_member(f.company_id))
      )
    )
  );
CREATE POLICY "Company admins can manage health metrics"
  ON public.framework_health_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_id
      AND f.company_id IS NOT NULL
      AND public.is_company_admin(f.company_id)
      AND f.is_system_template = false
    )
  );
-- COMPANY FRAMEWORKS
ALTER TABLE public.company_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view active framework"
  ON public.company_frameworks FOR SELECT
  USING (public.is_company_member(company_id));
CREATE POLICY "Company admins can adopt/switch frameworks"
  ON public.company_frameworks FOR INSERT
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "Company admins can update active framework"
  ON public.company_frameworks FOR UPDATE
  USING (public.is_company_admin(company_id));
CREATE POLICY "Company admins can remove framework adoption"
  ON public.company_frameworks FOR DELETE
  USING (public.is_company_admin(company_id));
-- ==========================================
-- CLONE FRAMEWORK FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.clone_framework(
  p_source_framework_id UUID,
  p_target_company_id UUID,
  p_new_name TEXT,
  p_new_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_framework_id UUID;
  v_source_framework RECORD;
  v_concept RECORD;
  v_cadence RECORD;
  v_template RECORD;
  v_dashboard RECORD;
  v_section RECORD;
  v_metric RECORD;
  v_new_dashboard_id UUID;
BEGIN
  -- Verify caller is admin of target company
  IF NOT public.is_company_admin(p_target_company_id) THEN
    RAISE EXCEPTION 'Permission denied: must be company admin';
  END IF;

  -- Get source framework
  SELECT * INTO v_source_framework
  FROM public.frameworks
  WHERE id = p_source_framework_id
  AND (
    (is_system_template = true AND status = 'published')
    OR (company_id IS NOT NULL AND public.is_company_member(company_id))
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source framework not found or not accessible';
  END IF;

  -- Create new framework
  INSERT INTO public.frameworks (
    company_id, owner_type, owner_company_id, name, description,
    version_label, status, is_system_template, created_by
  )
  VALUES (
    p_target_company_id, 'company', p_target_company_id, p_new_name,
    COALESCE(p_new_description, v_source_framework.description),
    'v1', 'draft', false, auth.uid()
  )
  RETURNING id INTO v_new_framework_id;

  -- Clone concepts
  FOR v_concept IN
    SELECT * FROM public.framework_concepts WHERE framework_id = p_source_framework_id
  LOOP
    INSERT INTO public.framework_concepts (
      framework_id, key, display_name_singular, display_name_plural,
      description, sort_order, enabled
    )
    VALUES (
      v_new_framework_id, v_concept.key, v_concept.display_name_singular,
      v_concept.display_name_plural, v_concept.description,
      v_concept.sort_order, v_concept.enabled
    );
  END LOOP;

  -- Clone cadences
  FOR v_cadence IN
    SELECT * FROM public.framework_cadences WHERE framework_id = p_source_framework_id
  LOOP
    INSERT INTO public.framework_cadences (
      framework_id, key, display_name, frequency_type, interval_n,
      target_day_of_week, target_day_of_month, duration_minutes,
      default_owner_role_hint, sort_order, enabled
    )
    VALUES (
      v_new_framework_id, v_cadence.key, v_cadence.display_name,
      v_cadence.frequency_type, v_cadence.interval_n,
      v_cadence.target_day_of_week, v_cadence.target_day_of_month,
      v_cadence.duration_minutes, v_cadence.default_owner_role_hint,
      v_cadence.sort_order, v_cadence.enabled
    );
  END LOOP;

  -- Clone templates (template_id references not copied - must be re-linked)
  FOR v_template IN
    SELECT * FROM public.framework_templates WHERE framework_id = p_source_framework_id
  LOOP
    INSERT INTO public.framework_templates (
      framework_id, template_type, template_id, applies_to_concept_key,
      cadence_key, sort_order, enabled
    )
    VALUES (
      v_new_framework_id, v_template.template_type, NULL,
      v_template.applies_to_concept_key, v_template.cadence_key,
      v_template.sort_order, v_template.enabled
    );
  END LOOP;

  -- Clone dashboards and sections
  FOR v_dashboard IN
    SELECT * FROM public.framework_dashboards WHERE framework_id = p_source_framework_id
  LOOP
    INSERT INTO public.framework_dashboards (
      framework_id, key, display_name, audience, sort_order, enabled
    )
    VALUES (
      v_new_framework_id, v_dashboard.key, v_dashboard.display_name,
      v_dashboard.audience, v_dashboard.sort_order, v_dashboard.enabled
    )
    RETURNING id INTO v_new_dashboard_id;

    -- Clone sections for this dashboard
    FOR v_section IN
      SELECT * FROM public.framework_dashboard_sections WHERE dashboard_id = v_dashboard.id
    LOOP
      INSERT INTO public.framework_dashboard_sections (
        dashboard_id, section_key, display_name, data_source_type,
        config, sort_order, enabled
      )
      VALUES (
        v_new_dashboard_id, v_section.section_key, v_section.display_name,
        v_section.data_source_type, v_section.config,
        v_section.sort_order, v_section.enabled
      );
    END LOOP;
  END LOOP;

  -- Clone health metrics
  FOR v_metric IN
    SELECT * FROM public.framework_health_metrics WHERE framework_id = p_source_framework_id
  LOOP
    INSERT INTO public.framework_health_metrics (
      framework_id, key, display_name, description, metric_type,
      data_source_type, calculation_key, thresholds, enabled, sort_order
    )
    VALUES (
      v_new_framework_id, v_metric.key, v_metric.display_name,
      v_metric.description, v_metric.metric_type, v_metric.data_source_type,
      v_metric.calculation_key, v_metric.thresholds,
      v_metric.enabled, v_metric.sort_order
    );
  END LOOP;

  RETURN v_new_framework_id;
END;
$$;
