-- Financial Insights tables for external_reporting mode

-- 1) financial_import_batches - tracks CSV imports
CREATE TABLE IF NOT EXISTS public.financial_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('pl', 'balance_sheet', 'open_ar', 'open_ap')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  source_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  row_count INTEGER,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 2) financial_categories - company-scoped mapping targets
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'asset', 'liability', 'equity')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);
-- 3) financial_statement_lines - P&L and Balance Sheet line items
CREATE TABLE IF NOT EXISTS public.financial_statement_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.financial_import_batches(id) ON DELETE CASCADE,
  statement_type TEXT NOT NULL CHECK (statement_type IN ('pl', 'balance_sheet')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  original_category TEXT NOT NULL,
  mapped_category_id UUID REFERENCES public.financial_categories(id),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 4) open_ar_items - Accounts Receivable
CREATE TABLE IF NOT EXISTS public.open_ar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.financial_import_batches(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  invoice_number TEXT,
  due_date DATE,
  amount_due NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 5) open_ap_items - Accounts Payable
CREATE TABLE IF NOT EXISTS public.open_ap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.financial_import_batches(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  bill_number TEXT,
  due_date DATE,
  amount_due NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_import_batches_company ON public.financial_import_batches(company_id, import_type, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_statement_lines_lookup ON public.financial_statement_lines(company_id, statement_type, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_categories_company ON public.financial_categories(company_id, category_type);
CREATE INDEX IF NOT EXISTS idx_open_ar_items_company ON public.open_ar_items(company_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_open_ap_items_company ON public.open_ap_items(company_id, batch_id);
-- RLS Policies
ALTER TABLE public.financial_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_ar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_ap_items ENABLE ROW LEVEL SECURITY;
-- financial_import_batches policies
CREATE POLICY "Finance users can view import batches"
  ON public.financial_import_batches FOR SELECT
  USING (public.is_finance_admin(company_id));
CREATE POLICY "Finance users can create import batches"
  ON public.financial_import_batches FOR INSERT
  WITH CHECK (public.is_finance_admin(company_id));
CREATE POLICY "Finance users can update import batches"
  ON public.financial_import_batches FOR UPDATE
  USING (public.is_finance_admin(company_id));
-- financial_categories policies
CREATE POLICY "Finance users can view categories"
  ON public.financial_categories FOR SELECT
  USING (public.is_finance_admin(company_id));
CREATE POLICY "Finance users can manage categories"
  ON public.financial_categories FOR ALL
  USING (public.is_finance_admin(company_id));
-- financial_statement_lines policies
CREATE POLICY "Finance users can view statement lines"
  ON public.financial_statement_lines FOR SELECT
  USING (public.is_finance_admin(company_id));
CREATE POLICY "Finance users can manage statement lines"
  ON public.financial_statement_lines FOR ALL
  USING (public.is_finance_admin(company_id));
-- open_ar_items policies
CREATE POLICY "Finance users can view AR items"
  ON public.open_ar_items FOR SELECT
  USING (public.is_finance_admin(company_id));
CREATE POLICY "Finance users can manage AR items"
  ON public.open_ar_items FOR ALL
  USING (public.is_finance_admin(company_id));
-- open_ap_items policies
CREATE POLICY "Finance users can view AP items"
  ON public.open_ap_items FOR SELECT
  USING (public.is_finance_admin(company_id));
CREATE POLICY "Finance users can manage AP items"
  ON public.open_ap_items FOR ALL
  USING (public.is_finance_admin(company_id));
