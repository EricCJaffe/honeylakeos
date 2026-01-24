-- Fix Security Definer Views - Use SECURITY INVOKER
-- ============================================================

-- Drop and recreate views with security_invoker = true

DROP VIEW IF EXISTS public.v_health_check_question_timeseries;
CREATE VIEW public.v_health_check_question_timeseries 
WITH (security_invoker = true)
AS
SELECT 
  hc.coaching_engagement_id,
  hc.template_id,
  r.template_question_id,
  hc.period_start,
  AVG(r.numeric_value) as numeric_value_avg,
  COUNT(*) as submission_count
FROM public.coaching_health_checks hc
JOIN public.coaching_health_check_responses r ON r.coaching_health_check_id = hc.id
WHERE r.numeric_value IS NOT NULL
  AND hc.status = 'submitted'
GROUP BY hc.coaching_engagement_id, hc.template_id, r.template_question_id, hc.period_start;

DROP VIEW IF EXISTS public.v_health_check_trend_delta;
DROP VIEW IF EXISTS public.v_health_check_subject_overall_score;

CREATE VIEW public.v_health_check_subject_overall_score 
WITH (security_invoker = true)
AS
SELECT 
  hc.id as coaching_health_check_id,
  hc.coaching_engagement_id,
  hc.subject_type,
  hc.period_start,
  hc.overall_score,
  hc.submitted_at
FROM public.coaching_health_checks hc
WHERE hc.status = 'submitted'
  AND hc.overall_score IS NOT NULL;

CREATE VIEW public.v_health_check_trend_delta 
WITH (security_invoker = true)
AS
WITH ranked_scores AS (
  SELECT 
    coaching_engagement_id,
    subject_type,
    period_start,
    overall_score,
    ROW_NUMBER() OVER (PARTITION BY coaching_engagement_id, subject_type ORDER BY period_start DESC) as rn
  FROM public.v_health_check_subject_overall_score
)
SELECT 
  curr.coaching_engagement_id,
  curr.subject_type,
  curr.period_start,
  curr.overall_score,
  prev.overall_score as prior_overall_score,
  CASE 
    WHEN prev.overall_score IS NOT NULL AND prev.overall_score != 0 
    THEN curr.overall_score - prev.overall_score 
    ELSE NULL 
  END as delta
FROM ranked_scores curr
LEFT JOIN ranked_scores prev 
  ON prev.coaching_engagement_id = curr.coaching_engagement_id 
  AND prev.subject_type = curr.subject_type 
  AND prev.rn = curr.rn + 1
WHERE curr.rn = 1;

DROP VIEW IF EXISTS public.v_goal_completion_rate;
CREATE VIEW public.v_goal_completion_rate 
WITH (security_invoker = true)
AS
SELECT 
  cg.coaching_plan_id,
  cp.coaching_engagement_id,
  DATE_TRUNC('month', cg.created_at)::date as period_start,
  COUNT(*) as goals_created,
  COUNT(cg.completed_at) as goals_completed,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(cg.completed_at)::numeric / COUNT(*)::numeric) * 100, 1)
    ELSE 0 
  END as completion_rate
FROM public.coaching_goals cg
JOIN public.coaching_plans cp ON cp.id = cg.coaching_plan_id
GROUP BY cg.coaching_plan_id, cp.coaching_engagement_id, DATE_TRUNC('month', cg.created_at);

DROP VIEW IF EXISTS public.v_org_scorecard_rollup;
CREATE VIEW public.v_org_scorecard_rollup 
WITH (security_invoker = true)
AS
SELECT 
  co.id as coaching_org_id,
  'overall_health' as metric_key,
  DATE_TRUNC('quarter', hc.period_start)::date as period_start,
  AVG(hc.overall_score) as avg_value,
  MIN(hc.overall_score) as min_value,
  MAX(hc.overall_score) as max_value,
  COUNT(DISTINCT hc.coaching_engagement_id) as engagement_count
FROM public.coaching_orgs co
JOIN public.coaching_org_engagements coe ON coe.coaching_org_id = co.id
JOIN public.coaching_health_checks hc ON hc.coaching_engagement_id = coe.id
WHERE hc.subject_type = 'organization'
  AND hc.status = 'submitted'
  AND hc.overall_score IS NOT NULL
GROUP BY co.id, DATE_TRUNC('quarter', hc.period_start)

UNION ALL

SELECT 
  co.id as coaching_org_id,
  'leader_health' as metric_key,
  DATE_TRUNC('quarter', hc.period_start)::date as period_start,
  AVG(hc.overall_score) as avg_value,
  MIN(hc.overall_score) as min_value,
  MAX(hc.overall_score) as max_value,
  COUNT(DISTINCT hc.coaching_engagement_id) as engagement_count
FROM public.coaching_orgs co
JOIN public.coaching_org_engagements coe ON coe.coaching_org_id = co.id
JOIN public.coaching_health_checks hc ON hc.coaching_engagement_id = coe.id
WHERE hc.subject_type = 'leader'
  AND hc.status = 'submitted'
  AND hc.overall_score IS NOT NULL
GROUP BY co.id, DATE_TRUNC('quarter', hc.period_start);