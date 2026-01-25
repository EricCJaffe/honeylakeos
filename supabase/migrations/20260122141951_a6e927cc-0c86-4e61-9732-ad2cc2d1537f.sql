-- ============================================================
-- Coaches Module Retrofit - Prompt 7: Health Checks + Trend Analysis MVP
-- ============================================================

-- A) New Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.health_check_cadence AS ENUM ('ad_hoc', 'monthly', 'quarterly', 'annually');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.health_check_response_type AS ENUM ('scale_1_5', 'scale_1_10', 'yes_no', 'text', 'number');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.scorecard_metric_source AS ENUM ('health_check', 'goals', 'tasks');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.scorecard_subject_type AS ENUM ('leader', 'organization', 'team', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B) Health Check Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coaching_health_check_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject_type public.coaching_health_subject_type NOT NULL DEFAULT 'organization',
  cadence public.health_check_cadence NOT NULL DEFAULT 'quarterly',
  status public.template_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_template_per_org UNIQUE (coaching_org_id, name, subject_type)
);

CREATE INDEX IF NOT EXISTS idx_health_check_templates_org 
ON public.coaching_health_check_templates (coaching_org_id, status);

CREATE TABLE IF NOT EXISTS public.coaching_health_check_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.coaching_health_check_templates(id) ON DELETE CASCADE,
  question_order integer NOT NULL,
  question_text text NOT NULL,
  response_type public.health_check_response_type NOT NULL DEFAULT 'scale_1_5',
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_question_order UNIQUE (template_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_health_check_template_questions_template 
ON public.coaching_health_check_template_questions (template_id, question_order);

-- C) Retrofit coaching_health_checks
-- ============================================================

ALTER TABLE public.coaching_health_checks
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.coaching_health_check_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS period_start date,
ADD COLUMN IF NOT EXISTS period_end date,
ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid,
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Update reviewed_at if not exists (it might already exist as reviewed_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coaching_health_checks' 
    AND column_name = 'overall_score'
  ) THEN
    ALTER TABLE public.coaching_health_checks ADD COLUMN overall_score numeric;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_health_checks_template 
ON public.coaching_health_checks (template_id);

CREATE INDEX IF NOT EXISTS idx_health_checks_period 
ON public.coaching_health_checks (coaching_engagement_id, period_start);

-- D) Retrofit coaching_health_check_responses
-- ============================================================

ALTER TABLE public.coaching_health_check_responses
ADD COLUMN IF NOT EXISTS template_question_id uuid REFERENCES public.coaching_health_check_template_questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS numeric_value numeric,
ADD COLUMN IF NOT EXISTS text_value text,
ADD COLUMN IF NOT EXISTS bool_value boolean;

CREATE INDEX IF NOT EXISTS idx_health_check_responses_question 
ON public.coaching_health_check_responses (template_question_id);

-- E) Retrofit coaching_goals
-- ============================================================

ALTER TABLE public.coaching_goals
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_by_user_id uuid;

-- F) Scorecards
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coaching_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status public.template_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecards_org 
ON public.coaching_scorecards (coaching_org_id, status);

CREATE TABLE IF NOT EXISTS public.coaching_scorecard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id uuid NOT NULL REFERENCES public.coaching_scorecards(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_label text,
  source public.scorecard_metric_source NOT NULL DEFAULT 'health_check',
  subject_type public.scorecard_subject_type NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_scorecard 
ON public.coaching_scorecard_metrics (scorecard_id);

-- G) Triggers
-- ============================================================

DROP TRIGGER IF EXISTS set_updated_at_coaching_health_check_templates ON public.coaching_health_check_templates;
CREATE TRIGGER set_updated_at_coaching_health_check_templates
  BEFORE UPDATE ON public.coaching_health_check_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_coaching_health_check_template_questions ON public.coaching_health_check_template_questions;
CREATE TRIGGER set_updated_at_coaching_health_check_template_questions
  BEFORE UPDATE ON public.coaching_health_check_template_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_coaching_scorecards ON public.coaching_scorecards;
CREATE TRIGGER set_updated_at_coaching_scorecards
  BEFORE UPDATE ON public.coaching_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_coaching_scorecard_metrics ON public.coaching_scorecard_metrics;
CREATE TRIGGER set_updated_at_coaching_scorecard_metrics
  BEFORE UPDATE ON public.coaching_scorecard_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-calculate overall_score on health check update
CREATE OR REPLACE FUNCTION public.fn_calculate_health_check_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_score numeric;
BEGIN
  -- Calculate average of numeric responses
  SELECT AVG(numeric_value) INTO v_avg_score
  FROM public.coaching_health_check_responses
  WHERE coaching_health_check_id = COALESCE(NEW.coaching_health_check_id, OLD.coaching_health_check_id)
    AND numeric_value IS NOT NULL;
  
  -- Update the health check overall_score
  UPDATE public.coaching_health_checks
  SET overall_score = v_avg_score
  WHERE id = COALESCE(NEW.coaching_health_check_id, OLD.coaching_health_check_id);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_health_check_score ON public.coaching_health_check_responses;
CREATE TRIGGER trg_update_health_check_score
  AFTER INSERT OR UPDATE OR DELETE ON public.coaching_health_check_responses
  FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_health_check_score();

-- H) Views for Trend Analysis
-- ============================================================

-- Question-level timeseries
CREATE OR REPLACE VIEW public.v_health_check_question_timeseries AS
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

-- Overall score per health check
CREATE OR REPLACE VIEW public.v_health_check_subject_overall_score AS
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

-- Trend delta (current vs prior period)
CREATE OR REPLACE VIEW public.v_health_check_trend_delta AS
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

-- Goal completion rate
CREATE OR REPLACE VIEW public.v_goal_completion_rate AS
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

-- Org-level scorecard rollup
CREATE OR REPLACE VIEW public.v_org_scorecard_rollup AS
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

-- I) RLS Policies
-- ============================================================

ALTER TABLE public.coaching_health_check_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_health_check_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_scorecard_metrics ENABLE ROW LEVEL SECURITY;

-- Health Check Templates
CREATE POLICY "hc_templates_select"
ON public.coaching_health_check_templates FOR SELECT
TO authenticated
USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR public.fn_is_coaching_manager(auth.uid(), coaching_org_id)
  OR public.fn_is_coach(auth.uid(), coaching_org_id)
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.coaching_org_id = coaching_health_check_templates.coaching_org_id
      AND coe.status IN ('active', 'suspended')
      AND public.fn_is_company_member(auth.uid(), coe.member_company_id)
  )
);

CREATE POLICY "hc_templates_insert"
ON public.coaching_health_check_templates FOR INSERT
TO authenticated
WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "hc_templates_update"
ON public.coaching_health_check_templates FOR UPDATE
TO authenticated
USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
)
WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "hc_templates_delete"
ON public.coaching_health_check_templates FOR DELETE
TO authenticated
USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- Template Questions (follow template access)
CREATE POLICY "hc_template_questions_select"
ON public.coaching_health_check_template_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_health_check_templates t
    WHERE t.id = template_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), t.coaching_org_id)
        OR public.fn_is_coaching_manager(auth.uid(), t.coaching_org_id)
        OR public.fn_is_coach(auth.uid(), t.coaching_org_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagements coe
          WHERE coe.coaching_org_id = t.coaching_org_id
            AND coe.status IN ('active', 'suspended')
            AND public.fn_is_company_member(auth.uid(), coe.member_company_id)
        )
      )
  )
);

CREATE POLICY "hc_template_questions_insert"
ON public.coaching_health_check_template_questions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaching_health_check_templates t
    WHERE t.id = template_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), t.coaching_org_id)
      )
  )
);

CREATE POLICY "hc_template_questions_update"
ON public.coaching_health_check_template_questions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_health_check_templates t
    WHERE t.id = template_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), t.coaching_org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaching_health_check_templates t
    WHERE t.id = template_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), t.coaching_org_id)
      )
  )
);

CREATE POLICY "hc_template_questions_delete"
ON public.coaching_health_check_template_questions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_health_check_templates t
    WHERE t.id = template_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), t.coaching_org_id)
      )
  )
);

-- Scorecards
CREATE POLICY "scorecards_select"
ON public.coaching_scorecards FOR SELECT
TO authenticated
USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR public.fn_is_coaching_manager(auth.uid(), coaching_org_id)
  OR public.fn_is_coach(auth.uid(), coaching_org_id)
);

CREATE POLICY "scorecards_insert"
ON public.coaching_scorecards FOR INSERT
TO authenticated
WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "scorecards_update"
ON public.coaching_scorecards FOR UPDATE
TO authenticated
USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
)
WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "scorecards_delete"
ON public.coaching_scorecards FOR DELETE
TO authenticated
USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- Scorecard Metrics
CREATE POLICY "scorecard_metrics_select"
ON public.coaching_scorecard_metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_scorecards s
    WHERE s.id = scorecard_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), s.coaching_org_id)
        OR public.fn_is_coaching_manager(auth.uid(), s.coaching_org_id)
        OR public.fn_is_coach(auth.uid(), s.coaching_org_id)
      )
  )
);

CREATE POLICY "scorecard_metrics_insert"
ON public.coaching_scorecard_metrics FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaching_scorecards s
    WHERE s.id = scorecard_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), s.coaching_org_id)
      )
  )
);

CREATE POLICY "scorecard_metrics_update"
ON public.coaching_scorecard_metrics FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_scorecards s
    WHERE s.id = scorecard_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), s.coaching_org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaching_scorecards s
    WHERE s.id = scorecard_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), s.coaching_org_id)
      )
  )
);

CREATE POLICY "scorecard_metrics_delete"
ON public.coaching_scorecard_metrics FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_scorecards s
    WHERE s.id = scorecard_id
      AND (
        public.fn_is_site_admin(auth.uid())
        OR public.fn_is_coaching_org_admin(auth.uid(), s.coaching_org_id)
      )
  )
);