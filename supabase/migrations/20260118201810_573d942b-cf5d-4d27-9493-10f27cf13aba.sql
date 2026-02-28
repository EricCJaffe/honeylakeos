-- Create ledger_postings table for standardized reporting
CREATE TABLE IF NOT EXISTS public.ledger_postings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'journal_entry', 'bill', 'invoice', 'receipt', 'bank_txn'
  source_id UUID NOT NULL,
  posting_date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES public.finance_accounts(id),
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ledger_postings_company_account ON public.ledger_postings(company_id, account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_postings_posting_date ON public.ledger_postings(company_id, posting_date);
CREATE INDEX IF NOT EXISTS idx_ledger_postings_source ON public.ledger_postings(source_type, source_id);
-- Enable RLS
ALTER TABLE public.ledger_postings ENABLE ROW LEVEL SECURITY;
-- RLS policies for ledger_postings (same as journal_entries - finance access required)
CREATE POLICY "ledger_postings_select" ON public.ledger_postings
  FOR SELECT USING (public.is_finance_admin(company_id));
CREATE POLICY "ledger_postings_insert" ON public.ledger_postings
  FOR INSERT WITH CHECK (public.is_finance_admin(company_id));
CREATE POLICY "ledger_postings_update" ON public.ledger_postings
  FOR UPDATE USING (public.is_finance_admin(company_id));
CREATE POLICY "ledger_postings_delete" ON public.ledger_postings
  FOR DELETE USING (public.is_finance_admin(company_id));
