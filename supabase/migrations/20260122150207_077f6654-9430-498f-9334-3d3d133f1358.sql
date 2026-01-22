-- Fix security definer view by adding security_invoker
DROP VIEW IF EXISTS public.v_coaching_audit_events;
CREATE VIEW public.v_coaching_audit_events 
WITH (security_invoker = true)
AS
SELECT 
  al.id,
  al.actor_user_id,
  p.full_name as actor_name,
  al.company_id,
  c.name as company_name,
  al.action,
  al.entity_type,
  al.entity_id,
  al.metadata,
  al.created_at,
  coe.coaching_org_id,
  corg.name as coaching_org_name
FROM audit_logs al
LEFT JOIN profiles p ON p.user_id = al.actor_user_id
LEFT JOIN companies c ON c.id = al.company_id
LEFT JOIN coaching_org_engagements coe ON coe.member_company_id = al.company_id AND coe.status = 'active'
LEFT JOIN companies corg ON corg.id = coe.coaching_org_id
WHERE al.action LIKE 'coaching.%'
   OR al.action LIKE 'access_grant.%'
   OR al.action LIKE 'engagement.%'
   OR al.entity_type IN ('coaching_engagement', 'access_grant', 'coaching_workflow', 'coaching_health_check');