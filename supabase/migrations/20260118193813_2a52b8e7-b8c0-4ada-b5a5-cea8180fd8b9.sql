-- =============================================================================
-- FINANCE V2: Dual-Mode Finance System
-- Phase 1: Schema Foundation (Fixed RLS policies)
-- =============================================================================

-- Helper function to check if user is a finance admin (company_admin or site_admin)
CREATE OR REPLACE FUNCTION public.is_finance_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE company_id = p_company_id 
      AND user_id = auth.uid() 
      AND status = 'active' 
      AND role = 'company_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.site_memberships sm
    JOIN public.companies c ON c.site_id = sm.site_id
    WHERE c.id = p_company_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('site_admin', 'super_admin')
  );
$$;

-- 1) Add finance_mode to companies
CREATE TYPE finance_mode AS ENUM ('builtin_books', 'external_reporting');

ALTER TABLE public.companies 
ADD COLUMN finance_mode finance_mode DEFAULT 'builtin_books';

-- =============================================================================
-- BUILT-IN BOOKS TABLES
-- =============================================================================

-- 2) Chart of Accounts
CREATE TABLE public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_number TEXT,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype TEXT,
  parent_account_id UUID REFERENCES public.finance_accounts(id),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_finance_accounts_company ON public.finance_accounts(company_id);
CREATE INDEX idx_finance_accounts_type ON public.finance_accounts(company_id, account_type);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_accounts_select" ON public.finance_accounts
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "finance_accounts_insert" ON public.finance_accounts
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "finance_accounts_update" ON public.finance_accounts
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "finance_accounts_delete" ON public.finance_accounts
  FOR DELETE USING (is_system = false AND public.is_finance_admin(company_id));

-- 3) Journal Entries
CREATE TYPE journal_entry_status AS ENUM ('draft', 'posted', 'voided');

CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  posting_date DATE,
  status journal_entry_status NOT NULL DEFAULT 'draft',
  memo TEXT,
  reference_type TEXT,
  reference_id UUID,
  total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  sample_batch_id UUID REFERENCES public.sample_data_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_journal_entries_company ON public.journal_entries(company_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(company_id, entry_date);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(company_id, status);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_select" ON public.journal_entries
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "journal_entries_insert" ON public.journal_entries
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "journal_entries_update" ON public.journal_entries
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "journal_entries_delete" ON public.journal_entries
  FOR DELETE USING (status = 'draft' AND public.is_finance_admin(company_id));

-- 4) Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.finance_accounts(id),
  description TEXT,
  debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entry_lines_select" ON public.journal_entry_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id AND public.is_company_member(je.company_id)
    )
  );

CREATE POLICY "journal_entry_lines_insert" ON public.journal_entry_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id AND public.is_finance_admin(je.company_id)
    )
  );

CREATE POLICY "journal_entry_lines_update" ON public.journal_entry_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id AND public.is_finance_admin(je.company_id)
    )
  );

CREATE POLICY "journal_entry_lines_delete" ON public.journal_entry_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id AND je.status = 'draft' AND public.is_finance_admin(je.company_id)
    )
  );

-- 5) Vendors (for AP)
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  tax_id TEXT,
  payment_terms INTEGER DEFAULT 30,
  default_expense_account_id UUID REFERENCES public.finance_accounts(id),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  sample_batch_id UUID REFERENCES public.sample_data_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_vendors_company ON public.vendors(company_id);
CREATE INDEX idx_vendors_active ON public.vendors(company_id, is_active);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select" ON public.vendors
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "vendors_insert" ON public.vendors
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "vendors_update" ON public.vendors
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "vendors_delete" ON public.vendors
  FOR DELETE USING (public.is_finance_admin(company_id));

-- 6) Bills (AP)
CREATE TYPE bill_status AS ENUM ('draft', 'approved', 'paid', 'voided');

CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status bill_status NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(15, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  currency TEXT NOT NULL DEFAULT 'USD',
  memo TEXT,
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  payment_journal_entry_id UUID REFERENCES public.journal_entries(id),
  is_sample BOOLEAN NOT NULL DEFAULT false,
  sample_batch_id UUID REFERENCES public.sample_data_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_bills_company ON public.bills(company_id);
CREATE INDEX idx_bills_vendor ON public.bills(vendor_id);
CREATE INDEX idx_bills_status ON public.bills(company_id, status);
CREATE INDEX idx_bills_due_date ON public.bills(company_id, due_date);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills_select" ON public.bills
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "bills_delete" ON public.bills
  FOR DELETE USING (status = 'draft' AND public.is_finance_admin(company_id));

-- 7) Bill Line Items
CREATE TABLE public.bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.finance_accounts(id),
  description TEXT,
  quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_lines_bill ON public.bill_lines(bill_id);

ALTER TABLE public.bill_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_lines_select" ON public.bill_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_lines.bill_id AND public.is_company_member(b.company_id)
    )
  );

CREATE POLICY "bill_lines_insert" ON public.bill_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_lines.bill_id AND public.is_finance_admin(b.company_id)
    )
  );

CREATE POLICY "bill_lines_update" ON public.bill_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_lines.bill_id AND public.is_finance_admin(b.company_id)
    )
  );

CREATE POLICY "bill_lines_delete" ON public.bill_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_lines.bill_id AND b.status = 'draft' AND public.is_finance_admin(b.company_id)
    )
  );

-- 8) Bank Accounts
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  finance_account_id UUID REFERENCES public.finance_accounts(id),
  name TEXT NOT NULL,
  institution_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'checking',
  account_mask TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(15, 2),
  plaid_account_id TEXT,
  plaid_item_id TEXT,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  sample_batch_id UUID REFERENCES public.sample_data_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_bank_accounts_company ON public.bank_accounts(company_id);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE USING (public.is_finance_admin(company_id));

-- 9) Bank Transactions
CREATE TYPE bank_transaction_status AS ENUM ('unmatched', 'matched', 'posted', 'excluded');

CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  posted_date DATE,
  description TEXT NOT NULL,
  original_description TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type TEXT,
  category TEXT,
  plaid_transaction_id TEXT UNIQUE,
  status bank_transaction_status NOT NULL DEFAULT 'unmatched',
  matched_account_id UUID REFERENCES public.finance_accounts(id),
  matched_vendor_id UUID REFERENCES public.vendors(id),
  matched_crm_client_id UUID REFERENCES public.crm_clients(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  reconciliation_id UUID,
  tags TEXT[],
  notes TEXT,
  import_batch_id UUID,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  sample_batch_id UUID REFERENCES public.sample_data_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_transactions_company ON public.bank_transactions(company_id);
CREATE INDEX idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_status ON public.bank_transactions(company_id, status);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(bank_account_id, transaction_date);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "bank_transactions_insert" ON public.bank_transactions
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "bank_transactions_update" ON public.bank_transactions
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "bank_transactions_delete" ON public.bank_transactions
  FOR DELETE USING (status IN ('unmatched', 'excluded') AND public.is_finance_admin(company_id));

-- 10) Bank Reconciliations
CREATE TYPE reconciliation_status AS ENUM ('in_progress', 'completed', 'voided');

CREATE TABLE public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  statement_date DATE NOT NULL,
  statement_ending_balance NUMERIC(15, 2) NOT NULL,
  cleared_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  difference NUMERIC(15, 2) GENERATED ALWAYS AS (statement_ending_balance - cleared_balance) STORED,
  status reconciliation_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_reconciliations_company ON public.bank_reconciliations(company_id);
CREATE INDEX idx_reconciliations_account ON public.bank_reconciliations(bank_account_id);

ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reconciliations_select" ON public.bank_reconciliations
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "reconciliations_insert" ON public.bank_reconciliations
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "reconciliations_update" ON public.bank_reconciliations
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "reconciliations_delete" ON public.bank_reconciliations
  FOR DELETE USING (status = 'in_progress' AND public.is_finance_admin(company_id));

-- Add FK for reconciliation_id in bank_transactions
ALTER TABLE public.bank_transactions
ADD CONSTRAINT fk_bank_transactions_reconciliation
FOREIGN KEY (reconciliation_id) REFERENCES public.bank_reconciliations(id);

-- =============================================================================
-- EXTERNAL REPORTING TABLES
-- =============================================================================

-- 11) Financial Statement Imports
CREATE TYPE financial_import_type AS ENUM ('profit_loss', 'balance_sheet', 'open_ar', 'open_ap');
CREATE TYPE financial_import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.financial_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_type financial_import_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_name TEXT,
  status financial_import_status NOT NULL DEFAULT 'pending',
  row_count INTEGER DEFAULT 0,
  error_message TEXT,
  mapping_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_financial_imports_company ON public.financial_imports(company_id);
CREATE INDEX idx_financial_imports_type ON public.financial_imports(company_id, import_type);

ALTER TABLE public.financial_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_imports_select" ON public.financial_imports
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "financial_imports_insert" ON public.financial_imports
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "financial_imports_update" ON public.financial_imports
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "financial_imports_delete" ON public.financial_imports
  FOR DELETE USING (public.is_finance_admin(company_id));

-- 12) Financial Statement Rows (normalized imported data)
CREATE TABLE public.financial_statement_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES public.financial_imports(id) ON DELETE CASCADE,
  statement_type financial_import_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  original_category TEXT NOT NULL,
  original_subcategory TEXT,
  mapped_account_id UUID REFERENCES public.finance_accounts(id),
  mapped_category TEXT,
  entity_name TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_statement_rows_company ON public.financial_statement_rows(company_id);
CREATE INDEX idx_statement_rows_import ON public.financial_statement_rows(import_id);
CREATE INDEX idx_statement_rows_period ON public.financial_statement_rows(company_id, period_start, period_end);
CREATE INDEX idx_statement_rows_type ON public.financial_statement_rows(company_id, statement_type);

ALTER TABLE public.financial_statement_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statement_rows_select" ON public.financial_statement_rows
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "statement_rows_insert" ON public.financial_statement_rows
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "statement_rows_update" ON public.financial_statement_rows
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "statement_rows_delete" ON public.financial_statement_rows
  FOR DELETE USING (public.is_finance_admin(company_id));

-- 13) Reporting Category Mappings
CREATE TABLE public.finance_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  mapped_account_id UUID REFERENCES public.finance_accounts(id),
  mapped_category TEXT NOT NULL,
  statement_type financial_import_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, original_name, statement_type)
);

CREATE INDEX idx_category_mappings_company ON public.finance_category_mappings(company_id);

ALTER TABLE public.finance_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_mappings_select" ON public.finance_category_mappings
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "category_mappings_insert" ON public.finance_category_mappings
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "category_mappings_update" ON public.finance_category_mappings
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "category_mappings_delete" ON public.finance_category_mappings
  FOR DELETE USING (public.is_finance_admin(company_id));

-- 14) Invoice Line Items (enhance existing invoices)
CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.finance_accounts(id),
  description TEXT,
  quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_lines_select" ON public.invoice_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_lines.invoice_id AND public.is_company_member(i.company_id)
    )
  );

CREATE POLICY "invoice_lines_insert" ON public.invoice_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_lines.invoice_id AND public.is_finance_admin(i.company_id)
    )
  );

CREATE POLICY "invoice_lines_update" ON public.invoice_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_lines.invoice_id AND public.is_finance_admin(i.company_id)
    )
  );

CREATE POLICY "invoice_lines_delete" ON public.invoice_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_lines.invoice_id AND public.is_finance_admin(i.company_id)
    )
  );

-- 15) Recurring Invoice Templates
CREATE TYPE recurrence_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually');

CREATE TABLE public.recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_client_id UUID REFERENCES public.crm_clients(id),
  template_name TEXT NOT NULL,
  frequency recurrence_frequency NOT NULL DEFAULT 'monthly',
  next_issue_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_terms INTEGER DEFAULT 30,
  notes TEXT,
  last_generated_at TIMESTAMPTZ,
  invoices_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_recurring_invoices_company ON public.recurring_invoices(company_id);
CREATE INDEX idx_recurring_invoices_next ON public.recurring_invoices(company_id, next_issue_date) WHERE is_active = true;

ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_invoices_select" ON public.recurring_invoices
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "recurring_invoices_insert" ON public.recurring_invoices
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));

CREATE POLICY "recurring_invoices_update" ON public.recurring_invoices
  FOR UPDATE USING (public.is_finance_admin(company_id));

CREATE POLICY "recurring_invoices_delete" ON public.recurring_invoices
  FOR DELETE USING (public.is_finance_admin(company_id));

-- 16) Recurring Invoice Line Items
CREATE TABLE public.recurring_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_invoice_id UUID NOT NULL REFERENCES public.recurring_invoices(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.finance_accounts(id),
  description TEXT,
  quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_invoice_lines ON public.recurring_invoice_lines(recurring_invoice_id);

ALTER TABLE public.recurring_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_invoice_lines_select" ON public.recurring_invoice_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recurring_invoices ri
      WHERE ri.id = recurring_invoice_lines.recurring_invoice_id AND public.is_company_member(ri.company_id)
    )
  );

CREATE POLICY "recurring_invoice_lines_insert" ON public.recurring_invoice_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recurring_invoices ri
      WHERE ri.id = recurring_invoice_lines.recurring_invoice_id AND public.is_finance_admin(ri.company_id)
    )
  );

CREATE POLICY "recurring_invoice_lines_update" ON public.recurring_invoice_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recurring_invoices ri
      WHERE ri.id = recurring_invoice_lines.recurring_invoice_id AND public.is_finance_admin(ri.company_id)
    )
  );

CREATE POLICY "recurring_invoice_lines_delete" ON public.recurring_invoice_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recurring_invoices ri
      WHERE ri.id = recurring_invoice_lines.recurring_invoice_id AND public.is_finance_admin(ri.company_id)
    )
  );

-- 17) Add journal_entry_id to invoices for GL integration
ALTER TABLE public.invoices ADD COLUMN journal_entry_id UUID REFERENCES public.journal_entries(id);

-- 18) Updated_at triggers
CREATE TRIGGER update_finance_accounts_updated_at BEFORE UPDATE ON public.finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_reconciliations_updated_at BEFORE UPDATE ON public.bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_imports_updated_at BEFORE UPDATE ON public.financial_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_category_mappings_updated_at BEFORE UPDATE ON public.finance_category_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_invoices_updated_at BEFORE UPDATE ON public.recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();