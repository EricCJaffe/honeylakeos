-- Seed default financial categories function (called per company when needed)
-- This creates a function that can be called to seed categories for a company

CREATE OR REPLACE FUNCTION public.seed_financial_categories(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Income categories
  INSERT INTO public.financial_categories (company_id, name, category_type, sort_order)
  VALUES 
    (p_company_id, 'Revenue', 'income', 1)
  ON CONFLICT (company_id, name) DO NOTHING;
  
  -- Expense categories
  INSERT INTO public.financial_categories (company_id, name, category_type, sort_order)
  VALUES 
    (p_company_id, 'Cost of Goods Sold', 'expense', 1),
    (p_company_id, 'Payroll', 'expense', 2),
    (p_company_id, 'Contractors', 'expense', 3),
    (p_company_id, 'Rent', 'expense', 4),
    (p_company_id, 'Software', 'expense', 5),
    (p_company_id, 'Marketing', 'expense', 6),
    (p_company_id, 'Travel', 'expense', 7),
    (p_company_id, 'Other Expense', 'expense', 8)
  ON CONFLICT (company_id, name) DO NOTHING;
  
  -- Asset categories
  INSERT INTO public.financial_categories (company_id, name, category_type, sort_order)
  VALUES 
    (p_company_id, 'Cash', 'asset', 1),
    (p_company_id, 'Accounts Receivable', 'asset', 2),
    (p_company_id, 'Other Current Assets', 'asset', 3)
  ON CONFLICT (company_id, name) DO NOTHING;
  
  -- Liability categories
  INSERT INTO public.financial_categories (company_id, name, category_type, sort_order)
  VALUES 
    (p_company_id, 'Accounts Payable', 'liability', 1),
    (p_company_id, 'Credit Cards', 'liability', 2),
    (p_company_id, 'Other Current Liabilities', 'liability', 3)
  ON CONFLICT (company_id, name) DO NOTHING;
  
  -- Equity categories
  INSERT INTO public.financial_categories (company_id, name, category_type, sort_order)
  VALUES 
    (p_company_id, 'Equity', 'equity', 1)
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$$;
