-- ============================================
-- Sales Ops Automation v1: Quotes + Sales Orders
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.sales_quote_status AS ENUM ('draft', 'sent', 'signed', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.sales_order_status AS ENUM ('open', 'fulfilled', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Quotes
CREATE TABLE IF NOT EXISTS public.sales_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.sales_opportunities(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  quote_type TEXT NOT NULL DEFAULT 'sow' CHECK (quote_type IN ('psa', 'sow', 'combined')),
  status public.sales_quote_status NOT NULL DEFAULT 'draft',

  summary TEXT,
  internal_notes TEXT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT
);
ALTER TABLE public.sales_quotes ENABLE ROW LEVEL SECURITY;
-- RLS (requires sales module enabled)
DROP POLICY IF EXISTS "sales_quotes_select" ON public.sales_quotes;
CREATE POLICY "sales_quotes_select" ON public.sales_quotes
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM company_modules cm
      JOIN modules m ON m.id = cm.module_id
      WHERE cm.company_id = sales_quotes.company_id
        AND m.slug = 'sales'
        AND cm.status = 'active'
    )
  );
DROP POLICY IF EXISTS "sales_quotes_insert" ON public.sales_quotes;
CREATE POLICY "sales_quotes_insert" ON public.sales_quotes
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM company_modules cm
      JOIN modules m ON m.id = cm.module_id
      WHERE cm.company_id = sales_quotes.company_id
        AND m.slug = 'sales'
        AND cm.status = 'active'
    )
  );
DROP POLICY IF EXISTS "sales_quotes_update" ON public.sales_quotes;
CREATE POLICY "sales_quotes_update" ON public.sales_quotes
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM company_modules cm
      JOIN modules m ON m.id = cm.module_id
      WHERE cm.company_id = sales_quotes.company_id
        AND m.slug = 'sales'
        AND cm.status = 'active'
    )
  );
DROP POLICY IF EXISTS "sales_quotes_delete" ON public.sales_quotes;
CREATE POLICY "sales_quotes_delete" ON public.sales_quotes
  FOR DELETE USING (false);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_company ON public.sales_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_client ON public.sales_quotes(company_id, crm_client_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_opp ON public.sales_quotes(company_id, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_status ON public.sales_quotes(company_id, status);
DROP TRIGGER IF EXISTS update_sales_quotes_updated_at ON public.sales_quotes;
CREATE TRIGGER update_sales_quotes_updated_at
  BEFORE UPDATE ON public.sales_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Sales Orders (minimal stub)
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.sales_opportunities(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.sales_quotes(id) ON DELETE SET NULL,

  status public.sales_order_status NOT NULL DEFAULT 'open',
  notes TEXT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_orders_select" ON public.sales_orders;
CREATE POLICY "sales_orders_select" ON public.sales_orders
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM company_modules cm
      JOIN modules m ON m.id = cm.module_id
      WHERE cm.company_id = sales_orders.company_id
        AND m.slug = 'sales'
        AND cm.status = 'active'
    )
  );
DROP POLICY IF EXISTS "sales_orders_insert" ON public.sales_orders;
CREATE POLICY "sales_orders_insert" ON public.sales_orders
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM company_modules cm
      JOIN modules m ON m.id = cm.module_id
      WHERE cm.company_id = sales_orders.company_id
        AND m.slug = 'sales'
        AND cm.status = 'active'
    )
  );
DROP POLICY IF EXISTS "sales_orders_update" ON public.sales_orders;
CREATE POLICY "sales_orders_update" ON public.sales_orders
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM company_modules cm
      JOIN modules m ON m.id = cm.module_id
      WHERE cm.company_id = sales_orders.company_id
        AND m.slug = 'sales'
        AND cm.status = 'active'
    )
  );
DROP POLICY IF EXISTS "sales_orders_delete" ON public.sales_orders;
CREATE POLICY "sales_orders_delete" ON public.sales_orders
  FOR DELETE USING (false);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON public.sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_client ON public.sales_orders(company_id, crm_client_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote ON public.sales_orders(company_id, quote_id);
DROP TRIGGER IF EXISTS update_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Extend attachments entity_type to support sales_quote
ALTER TABLE public.attachments
  DROP CONSTRAINT IF EXISTS attachments_entity_type_check;
ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_entity_type_check
  CHECK (entity_type IN ('task', 'project', 'note', 'document', 'event', 'bill', 'ticket', 'sales_quote'));
-- Update attachments RLS to allow sales_quote
DROP POLICY IF EXISTS "Users can view attachments for entities they can access" ON public.attachments;
CREATE POLICY "Users can view attachments for entities they can access"
ON public.attachments
FOR SELECT
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = attachments.company_id
    )
    AND (
        (entity_type = 'task' AND EXISTS (
            SELECT 1 FROM public.tasks t 
            WHERE t.id = attachments.entity_id 
            AND t.company_id = attachments.company_id
        ))
        OR (entity_type = 'project' AND EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = attachments.entity_id 
            AND p.company_id = attachments.company_id
        ))
        OR (entity_type = 'note' AND EXISTS (
            SELECT 1 FROM public.notes n 
            WHERE n.id = attachments.entity_id 
            AND n.company_id = attachments.company_id
        ))
        OR (entity_type = 'document' AND EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = attachments.entity_id 
            AND d.company_id = attachments.company_id
        ))
        OR (entity_type = 'event' AND EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = attachments.entity_id 
            AND e.company_id = attachments.company_id
        ))
        OR (entity_type = 'sales_quote' AND EXISTS (
            SELECT 1 FROM public.sales_quotes q
            WHERE q.id = attachments.entity_id
            AND q.company_id = attachments.company_id
        ))
    )
);
