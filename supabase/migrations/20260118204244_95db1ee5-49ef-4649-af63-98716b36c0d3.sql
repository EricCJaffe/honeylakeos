-- Framework Finance Targets (company-scoped, framework-scoped targets)
CREATE TABLE IF NOT EXISTS public.framework_finance_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  targets_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT framework_finance_targets_unique UNIQUE (company_id, framework_id)
);

-- Framework Finance Playbook Items (condition-based prompts)
CREATE TABLE IF NOT EXISTS public.framework_finance_playbook_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  condition_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_framework_finance_targets_company 
  ON public.framework_finance_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_framework_finance_targets_framework 
  ON public.framework_finance_targets(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_finance_playbook_items_framework 
  ON public.framework_finance_playbook_items(framework_id);

-- RLS for framework_finance_targets
ALTER TABLE public.framework_finance_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance targets viewable by finance users"
  ON public.framework_finance_targets
  FOR SELECT
  USING (public.is_finance_admin(company_id));

CREATE POLICY "Finance targets manageable by finance admins"
  ON public.framework_finance_targets
  FOR ALL
  USING (public.is_finance_admin(company_id))
  WITH CHECK (public.is_finance_admin(company_id));

-- RLS for framework_finance_playbook_items (read-only for authenticated users with framework access)
ALTER TABLE public.framework_finance_playbook_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playbook items viewable by authenticated users"
  ON public.framework_finance_playbook_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Playbook items manageable by system/coach owners"
  ON public.framework_finance_playbook_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      WHERE f.id = framework_finance_playbook_items.framework_id
      AND (f.is_system_template = true OR f.owner_type = 'coach_org')
    )
  );

-- Seed default EOS playbook items
INSERT INTO public.framework_finance_playbook_items (framework_id, condition_key, title, description, sort_order)
SELECT 
  f.id,
  items.condition_key,
  items.title,
  items.description,
  items.sort_order
FROM public.frameworks f
CROSS JOIN (VALUES
  ('revenue_down', 'Revenue Decline Detected', 'Review sales pipeline and marketing activity. Consider scheduling a sales review meeting.', 1),
  ('ar_high', 'High Accounts Receivable', 'Review collections process and follow up on overdue invoices. Consider tightening credit terms.', 2),
  ('ap_high', 'High Accounts Payable', 'Review vendor payment schedules and cash flow projections.', 3),
  ('cash_low', 'Low Cash Position', 'Review expenses and accelerate collections. Consider line of credit options.', 4),
  ('gross_margin_low', 'Gross Margin Below Target', 'Analyze cost of goods sold and pricing strategy. Review vendor contracts.', 5),
  ('net_income_low', 'Net Income Below Target', 'Review all expense categories for optimization opportunities.', 6)
) AS items(condition_key, title, description, sort_order)
WHERE f.name ILIKE '%EOS%' AND f.is_system_template = true
ON CONFLICT DO NOTHING;