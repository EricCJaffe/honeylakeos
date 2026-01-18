-- ============================================
-- Finance Module v1: Invoices, Payments, Receipts
-- ============================================

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void', 'partial')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  export_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (export_status IN ('not_ready', 'ready', 'exported')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoice RLS policies
CREATE POLICY "Users can view invoices in their company"
  ON public.invoices FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can create invoices in their company"
  ON public.invoices FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can update invoices in their company"
  ON public.invoices FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete invoices in their company"
  ON public.invoices FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

-- Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  crm_client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'other' CHECK (payment_method IN ('cash', 'check', 'card', 'bank_transfer', 'ach', 'other')),
  reference_number TEXT,
  notes TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  export_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (export_status IN ('not_ready', 'ready', 'exported')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payment RLS policies
CREATE POLICY "Users can view payments in their company"
  ON public.payments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can create payments in their company"
  ON public.payments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payments in their company"
  ON public.payments FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payments in their company"
  ON public.payments FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

-- Receipts table (for expense tracking)
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  payment_method TEXT DEFAULT 'other' CHECK (payment_method IN ('cash', 'check', 'card', 'bank_transfer', 'ach', 'other')),
  currency TEXT NOT NULL DEFAULT 'USD',
  export_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (export_status IN ('not_ready', 'ready', 'exported')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Receipt RLS policies
CREATE POLICY "Users can view receipts in their company"
  ON public.receipts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can create receipts in their company"
  ON public.receipts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can update receipts in their company"
  ON public.receipts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete receipts in their company"
  ON public.receipts FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_crm_client_id ON public.invoices(crm_client_id);

CREATE INDEX idx_payments_company_id ON public.payments(company_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);

CREATE INDEX idx_receipts_company_id ON public.receipts(company_id);
CREATE INDEX idx_receipts_receipt_date ON public.receipts(receipt_date);
CREATE INDEX idx_receipts_category ON public.receipts(category);

-- Add new report types to enum
ALTER TYPE public.report_type ADD VALUE IF NOT EXISTS 'invoices_summary';
ALTER TYPE public.report_type ADD VALUE IF NOT EXISTS 'payments_summary';
ALTER TYPE public.report_type ADD VALUE IF NOT EXISTS 'receipts_summary';
ALTER TYPE public.report_type ADD VALUE IF NOT EXISTS 'ar_aging';

-- Triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();