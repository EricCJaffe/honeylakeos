-- Add template_key to wf_forms for workflow automation referencing
ALTER TABLE public.wf_forms 
ADD COLUMN IF NOT EXISTS template_key text UNIQUE;
-- Add coaching_engagement_id to wf_form_submissions for coaching scoping
ALTER TABLE public.wf_form_submissions 
ADD COLUMN IF NOT EXISTS coaching_engagement_id uuid REFERENCES public.coaching_org_engagements(id);
-- Add index for faster queries by template_key
CREATE INDEX IF NOT EXISTS idx_wf_forms_template_key ON public.wf_forms(template_key) WHERE template_key IS NOT NULL;
-- Add index for faster queries by coaching_engagement_id
CREATE INDEX IF NOT EXISTS idx_wf_form_submissions_coaching_engagement_id 
ON public.wf_form_submissions(coaching_engagement_id) WHERE coaching_engagement_id IS NOT NULL;
-- Add RLS policy for coaches to access engagement-scoped submissions
-- Coaches can SELECT submissions where they have an active engagement
CREATE POLICY "Coaches can view engagement-scoped submissions"
ON public.wf_form_submissions
FOR SELECT
USING (
  coaching_engagement_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = wf_form_submissions.coaching_engagement_id
    AND coe.status IN ('active', 'suspended')
    AND (
      -- User is a coach on the coaching org
      EXISTS (
        SELECT 1 FROM public.coaching_coaches cc
        WHERE cc.coaching_org_id = coe.coaching_org_id
        AND cc.user_id = auth.uid()
        AND cc.status = 'active'
      )
      OR
      -- User is a manager on the coaching org
      EXISTS (
        SELECT 1 FROM public.coaching_managers cm
        WHERE cm.coaching_org_id = coe.coaching_org_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
      )
      OR
      -- User is org admin
      EXISTS (
        SELECT 1 FROM public.coaching_org_memberships com
        WHERE com.coaching_org_id = coe.coaching_org_id
        AND com.user_id = auth.uid()
        AND com.role = 'org_admin'
        AND com.status = 'active'
      )
    )
  )
);
