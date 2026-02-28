-- Exit survey email templates (per company, editable in Settings)
CREATE TABLE IF NOT EXISTS public.exit_survey_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trigger_key text NOT NULL,
  name text NOT NULL,
  description text,
  subject_template text NOT NULL,
  html_template text NOT NULL,
  text_template text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT exit_survey_email_templates_company_trigger_unique UNIQUE (company_id, trigger_key),
  CONSTRAINT exit_survey_email_templates_trigger_key_check CHECK (trigger_key ~ '^[a-z0-9_]+$'),
  CONSTRAINT exit_survey_email_templates_variables_is_array CHECK (jsonb_typeof(variables) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_exit_survey_email_templates_company ON public.exit_survey_email_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_exit_survey_email_templates_trigger ON public.exit_survey_email_templates(trigger_key);
ALTER TABLE public.exit_survey_email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exit_survey_email_templates_select" ON public.exit_survey_email_templates;
CREATE POLICY "exit_survey_email_templates_select"
ON public.exit_survey_email_templates
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
  )
);
DROP POLICY IF EXISTS "exit_survey_email_templates_insert" ON public.exit_survey_email_templates;
CREATE POLICY "exit_survey_email_templates_insert"
ON public.exit_survey_email_templates
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = 'company_admin'
  )
);
DROP POLICY IF EXISTS "exit_survey_email_templates_update" ON public.exit_survey_email_templates;
CREATE POLICY "exit_survey_email_templates_update"
ON public.exit_survey_email_templates
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = 'company_admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = 'company_admin'
  )
);
DROP POLICY IF EXISTS "exit_survey_email_templates_delete" ON public.exit_survey_email_templates;
CREATE POLICY "exit_survey_email_templates_delete"
ON public.exit_survey_email_templates
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = 'company_admin'
  )
);
CREATE OR REPLACE FUNCTION public.update_exit_survey_email_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_exit_survey_email_templates_updated_at ON public.exit_survey_email_templates;
CREATE TRIGGER trigger_exit_survey_email_templates_updated_at
  BEFORE UPDATE ON public.exit_survey_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exit_survey_email_templates_updated_at();
COMMENT ON TABLE public.exit_survey_email_templates IS 'Per-company editable email templates for exit survey notification triggers.';
COMMENT ON COLUMN public.exit_survey_email_templates.trigger_key IS 'Stable key used by edge functions, e.g. low_score_alert.';
COMMENT ON COLUMN public.exit_survey_email_templates.variables IS 'Supported variable placeholders for the template as an array of strings.';
-- Seed baseline templates for existing companies.
WITH template_seed AS (
  SELECT
    c.id AS company_id,
    t.trigger_key,
    t.name,
    t.description,
    t.subject_template,
    t.html_template,
    t.text_template,
    t.variables
  FROM public.companies c
  CROSS JOIN (
    VALUES
      (
        'low_score_alert',
        'Low Score Alert',
        'Immediate alert email when a low score response is received.',
        '[{{priority_label}}] Low score alert: {{question_category}} - {{company_name}} Exit Survey',
        '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif; color: #111;"><h2 style="margin:0 0 8px;">Exit Survey Alert</h2><p style="margin:0 0 12px;">Hi {{owner_name}},</p><p style="margin:0 0 12px;">A patient submitted a low score for your department.</p><p style="margin:0 0 12px;"><strong>Priority:</strong> {{priority_label}}<br/><strong>Score:</strong> {{score_label}}<br/><strong>Department:</strong> {{question_department}}<br/><strong>Patient:</strong> {{patient_name}}<br/><strong>Submitted:</strong> {{submitted_date}}</p><p style="margin:0 0 12px;"><strong>Question:</strong><br/>{{question_text}}</p><p style="margin:0;"><a href="{{dashboard_url}}" style="color:#0f766e;">View in dashboard</a></p></div>',
        'Exit Survey Alert\n\nHi {{owner_name}},\n\nA patient submitted a low score for your department.\nPriority: {{priority_label}}\nScore: {{score_label}}\nDepartment: {{question_department}}\nPatient: {{patient_name}}\nSubmitted: {{submitted_date}}\n\nQuestion: {{question_text}}\n\nView in dashboard: {{dashboard_url}}',
        '["priority_label","score_label","company_name","owner_name","question_text","question_category","question_department","patient_name","submitted_date","dashboard_url"]'::jsonb
      ),
      (
        'weekly_digest',
        'Weekly Digest',
        'Weekly summary email grouped by owner with scores and open follow-ups.',
        'Weekly Exit Survey Summary - {{week_start}} to {{week_end}}',
        '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif; color:#111;"><h2 style="margin:0 0 8px;">Weekly Exit Survey Summary</h2><p style="margin:0 0 12px;">Hi {{owner_name}},</p><p style="margin:0 0 12px;">Departments: {{department_list}}</p><p style="margin:0 0 12px;">Surveys completed: <strong>{{submission_count}}</strong></p><p style="margin:0 0 12px;">Open follow-ups: <strong>{{open_follow_up_count}}</strong></p><h3 style="margin:16px 0 8px;">Department Scores</h3><table style="width:100%; border-collapse: collapse; font-size: 13px;"><thead><tr><th style="text-align:left; padding:4px 8px; border-bottom:1px solid #e5e7eb;">Question</th><th style="text-align:right; padding:4px 8px; border-bottom:1px solid #e5e7eb;">Avg</th></tr></thead><tbody>{{question_rows_html}}</tbody></table>{{follow_ups_block_html}}</div>',
        'Weekly Exit Survey Summary\n\nHi {{owner_name}},\nDepartments: {{department_list}}\nSurveys completed: {{submission_count}}\nOpen follow-ups: {{open_follow_up_count}}\n\nView dashboard: {{dashboard_url}}',
        '["owner_name","department_list","submission_count","open_follow_up_count","week_start","week_end","question_rows_html","follow_ups_block_html","dashboard_url"]'::jsonb
      ),
      (
        'alert_reminder',
        'Follow-Up Reminder',
        'Reminder email for unresolved alerts.',
        'Reminder: Exit Survey Follow-Up Needed',
        '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif; color:#111;"><h2 style="margin:0 0 8px;">Reminder: Exit Survey Follow-Up Needed</h2><p style="margin:0 0 12px;">Hi {{owner_name}},</p><p style="margin:0 0 12px;"><strong>Question:</strong> {{question_text}}</p><p style="margin:0 0 12px;"><strong>Score:</strong> {{score_label}}</p><p style="margin:0 0 12px;"><strong>Patient:</strong> {{patient_name}}</p><p style="margin:0;"><a href="{{dashboard_url}}" style="color:#0f766e;">View response</a></p></div>',
        'Reminder: Exit Survey Follow-Up Needed\n\nHi {{owner_name}},\nQuestion: {{question_text}}\nScore: {{score_label}}\nPatient: {{patient_name}}\nView response: {{dashboard_url}}',
        '["owner_name","question_text","score_label","patient_name","dashboard_url","alert_age_hours"]'::jsonb
      ),
      (
        'survey_assignment',
        'Survey Assignment',
        'Template reserved for assignment workflow emails.',
        'New Survey Assignment: {{survey_name}}',
        '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif; color:#111;"><h2 style="margin:0 0 8px;">You Have a New Survey Assignment</h2><p style="margin:0 0 12px;">Hi {{assignee_name}},</p><p style="margin:0 0 12px;">{{assigner_name}} assigned you to complete <strong>{{survey_name}}</strong>.</p><p style="margin:0 0 12px;"><strong>Patient:</strong> {{patient_name}}</p><p style="margin:0;"><a href="{{assignment_url}}" style="color:#0f766e;">Open assignment</a></p></div>',
        'You have a new survey assignment\n\nHi {{assignee_name}},\n{{assigner_name}} assigned you to complete {{survey_name}}.\nPatient: {{patient_name}}\nOpen assignment: {{assignment_url}}',
        '["assignee_name","assigner_name","survey_name","patient_name","assignment_url","due_date"]'::jsonb
      )
  ) AS t(trigger_key, name, description, subject_template, html_template, text_template, variables)
)
INSERT INTO public.exit_survey_email_templates (
  company_id,
  trigger_key,
  name,
  description,
  subject_template,
  html_template,
  text_template,
  variables,
  is_active,
  is_system
)
SELECT
  s.company_id,
  s.trigger_key,
  s.name,
  s.description,
  s.subject_template,
  s.html_template,
  s.text_template,
  s.variables,
  true,
  true
FROM template_seed s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.exit_survey_email_templates e
  WHERE e.company_id = s.company_id
    AND e.trigger_key = s.trigger_key
);
