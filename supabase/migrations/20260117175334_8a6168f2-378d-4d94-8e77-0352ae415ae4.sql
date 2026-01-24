-- Create onboarding_presets table
CREATE TABLE public.onboarding_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  target_audience TEXT,
  framework_id UUID REFERENCES public.frameworks(id) ON DELETE SET NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_presets_active ON public.onboarding_presets(is_active, sort_order);

ALTER TABLE public.onboarding_presets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active presets
CREATE POLICY "onboarding_presets_select_authenticated"
  ON public.onboarding_presets
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Site admins can manage presets (using existing is_site_admin function)
CREATE POLICY "onboarding_presets_manage_site_admin"
  ON public.onboarding_presets
  FOR ALL
  TO authenticated
  USING (public.is_site_admin(auth.uid()))
  WITH CHECK (public.is_site_admin(auth.uid()));

-- Add preset_id to company_onboarding_state
ALTER TABLE public.company_onboarding_state
  ADD COLUMN IF NOT EXISTS applied_preset_id UUID REFERENCES public.onboarding_presets(id) ON DELETE SET NULL;

-- Create apply_onboarding_preset function
CREATE OR REPLACE FUNCTION public.apply_onboarding_preset(
  p_company_id UUID,
  p_preset_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preset RECORD;
  v_config JSONB;
  v_module_slug TEXT;
  v_module_id UUID;
  v_term_key TEXT;
  v_term_value JSONB;
  v_user_id UUID;
  v_result JSONB := '{"modules_enabled": 0, "terminology_set": 0}'::jsonb;
BEGIN
  v_user_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE company_id = p_company_id AND user_id = v_user_id AND role = 'company_admin'
  ) THEN
    RAISE EXCEPTION 'User is not a company admin';
  END IF;
  
  SELECT * INTO v_preset FROM public.onboarding_presets WHERE id = p_preset_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preset not found or inactive';
  END IF;
  
  v_config := v_preset.config_json;
  
  IF v_config ? 'enabled_modules' AND jsonb_array_length(v_config->'enabled_modules') > 0 THEN
    FOR v_module_slug IN SELECT jsonb_array_elements_text(v_config->'enabled_modules')
    LOOP
      SELECT id INTO v_module_id FROM public.modules WHERE slug = v_module_slug;
      IF v_module_id IS NOT NULL THEN
        INSERT INTO public.company_modules (company_id, module_id, status, granted_by)
        VALUES (p_company_id, v_module_id, 'active', v_user_id)
        ON CONFLICT (company_id, module_id) DO UPDATE SET status = 'active', granted_by = v_user_id;
        v_result := jsonb_set(v_result, '{modules_enabled}', to_jsonb((v_result->>'modules_enabled')::int + 1));
      END IF;
    END LOOP;
  END IF;
  
  IF v_config ? 'terminology_overrides' THEN
    FOR v_term_key, v_term_value IN SELECT * FROM jsonb_each(v_config->'terminology_overrides')
    LOOP
      INSERT INTO public.company_terminology (company_id, term_key, singular_label, plural_label, updated_by)
      VALUES (p_company_id, v_term_key, v_term_value->>'singular', v_term_value->>'plural', v_user_id)
      ON CONFLICT (company_id, term_key) DO UPDATE SET
        singular_label = EXCLUDED.singular_label,
        plural_label = EXCLUDED.plural_label,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
      v_result := jsonb_set(v_result, '{terminology_set}', to_jsonb((v_result->>'terminology_set')::int + 1));
    END LOOP;
  END IF;
  
  IF v_preset.framework_id IS NOT NULL THEN
    INSERT INTO public.company_frameworks (company_id, active_framework_id, adopted_by)
    VALUES (p_company_id, v_preset.framework_id, v_user_id)
    ON CONFLICT (company_id) DO UPDATE SET
      active_framework_id = EXCLUDED.active_framework_id,
      adopted_by = EXCLUDED.adopted_by,
      adopted_at = now();
    v_result := jsonb_set(v_result, '{framework_assigned}', 'true'::jsonb);
  END IF;
  
  INSERT INTO public.company_onboarding_state (company_id, applied_preset_id, current_step)
  VALUES (p_company_id, p_preset_id, 'preset_applied')
  ON CONFLICT (company_id) DO UPDATE SET applied_preset_id = p_preset_id, updated_at = now();
  
  INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
  VALUES (p_company_id, 'onboarding_preset', p_preset_id, 'preset.applied', v_user_id,
    jsonb_build_object('preset_name', v_preset.name, 'result', v_result));
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_onboarding_preset(UUID, UUID) TO authenticated;