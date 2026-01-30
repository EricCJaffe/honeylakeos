-- ============================================
-- Sales Orders → Invoices link (MVP)
-- ============================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_sales_order_id
ON public.invoices(company_id, sales_order_id) WHERE sales_order_id IS NOT NULL;
