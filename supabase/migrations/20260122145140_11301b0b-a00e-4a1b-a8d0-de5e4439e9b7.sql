-- PROMPT 11 PART 3: Functions and Trigger

CREATE OR REPLACE FUNCTION public.fn_company_entitlements(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan_entitlements jsonb; v_override record;
BEGIN
  SELECT p.entitlements INTO v_plan_entitlements FROM company_plans cp
  JOIN plans p ON p.slug = cp.plan_tier::text WHERE cp.company_id = p_company_id AND cp.status IN ('active', 'trial', 'grace');
  IF v_plan_entitlements IS NULL THEN SELECT entitlements INTO v_plan_entitlements FROM plans WHERE slug = 'free_minimal'; END IF;
  FOR v_override IN SELECT entitlement_key, entitlement_value FROM company_entitlement_overrides WHERE company_id = p_company_id AND (expires_at IS NULL OR expires_at > now())
  LOOP v_plan_entitlements := jsonb_set(COALESCE(v_plan_entitlements, '{}'), string_to_array(v_override.entitlement_key, '.'), v_override.entitlement_value::jsonb); END LOOP;
  RETURN COALESCE(v_plan_entitlements, '{}');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_on_coaching_engagement_ended() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_company_id uuid; v_has_other_active boolean; v_current_plan record; v_grace_days integer := 14;
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status != 'ended') THEN
    v_member_company_id := NEW.client_company_id;
    SELECT EXISTS(SELECT 1 FROM coaching_org_engagements coe WHERE coe.client_company_id = v_member_company_id AND coe.id != NEW.id AND coe.status IN ('active', 'pending_acceptance')) INTO v_has_other_active;
    IF NOT v_has_other_active THEN
      SELECT * INTO v_current_plan FROM company_plans WHERE company_id = v_member_company_id;
      IF v_current_plan IS NOT NULL AND v_current_plan.source = 'provisioned_by_coaching_org' THEN
        UPDATE company_plans SET status = 'requires_action', grace_ends_at = now() + (v_grace_days || ' days')::interval WHERE company_id = v_member_company_id;
        INSERT INTO subscription_events (company_id, event_type, from_value, to_value, reason, metadata) VALUES (v_member_company_id, 'grace_started', v_current_plan.status::text, 'requires_action', 'coaching_engagement_ended', jsonb_build_object('engagement_id', NEW.id, 'grace_days', v_grace_days));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_coaching_engagement_ended ON public.coaching_org_engagements;
CREATE TRIGGER trg_coaching_engagement_ended AFTER UPDATE ON public.coaching_org_engagements FOR EACH ROW EXECUTE FUNCTION public.fn_on_coaching_engagement_ended();

GRANT EXECUTE ON FUNCTION public.fn_company_entitlements(uuid) TO authenticated;