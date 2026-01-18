import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { startOfMonth, endOfMonth, subMonths, startOfYear, format, parseISO } from "date-fns";

export interface FinancialKPIs {
  revenue: number;
  expenses: number;
  netIncome: number;
  cashOnHand: number;
  openArTotal: number;
  openApTotal: number;
  grossMarginPercent: number | null;
  netMarginPercent: number | null;
}

export interface PeriodComparison {
  currentPeriod: FinancialKPIs;
  previousPeriod: FinancialKPIs | null;
  ytd: FinancialKPIs;
  momRevenueChange: number | null;
  momNetIncomeChange: number | null;
  yoyRevenueChange: number | null;
}

interface FinancialStatementLine {
  amount: number;
  mapped_category: {
    category_type: string;
    name: string;
  } | null;
}

// Get available periods (months with data)
export function useAvailablePeriods() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["available-periods", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("financial_import_batches")
        .select("period_start, period_end, import_type")
        .eq("company_id", activeCompanyId)
        .eq("status", "completed")
        .order("period_end", { ascending: false });

      if (error) throw error;

      // Extract unique months
      const periods = new Map<string, { start: string; end: string }>();
      for (const batch of data || []) {
        const key = batch.period_end;
        if (!periods.has(key)) {
          periods.set(key, { start: batch.period_start, end: batch.period_end });
        }
      }

      return Array.from(periods.values());
    },
    enabled: !!activeCompanyId,
  });
}

// Calculate KPIs for a specific period
export function useFinancialKPIs(periodEnd?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["financial-kpis", activeCompanyId, periodEnd],
    queryFn: async (): Promise<FinancialKPIs> => {
      if (!activeCompanyId) {
        return { revenue: 0, expenses: 0, netIncome: 0, cashOnHand: 0, openArTotal: 0, openApTotal: 0, grossMarginPercent: null, netMarginPercent: null };
      }

      const targetEnd = periodEnd || format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Get P&L lines for the period
      const { data: plLines, error: plError } = await supabase
        .from("financial_statement_lines")
        .select(`
          amount,
          mapped_category:financial_categories(category_type, name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("statement_type", "pl")
        .eq("period_end", targetEnd);

      if (plError) throw plError;

      // Get Balance Sheet lines for the period
      const { data: bsLines, error: bsError } = await supabase
        .from("financial_statement_lines")
        .select(`
          amount,
          mapped_category:financial_categories(category_type, name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("statement_type", "balance_sheet")
        .eq("period_end", targetEnd);

      if (bsError) throw bsError;

      // Get latest AR batch for the period
      const { data: arBatch } = await supabase
        .from("financial_import_batches")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("import_type", "open_ar")
        .eq("status", "completed")
        .lte("period_end", targetEnd)
        .order("period_end", { ascending: false })
        .limit(1)
        .single();

      let openArTotal = 0;
      if (arBatch) {
        const { data: arItems } = await supabase
          .from("open_ar_items")
          .select("amount_due")
          .eq("batch_id", arBatch.id);
        openArTotal = (arItems || []).reduce((sum, item) => sum + Number(item.amount_due), 0);
      }

      // Get latest AP batch for the period
      const { data: apBatch } = await supabase
        .from("financial_import_batches")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("import_type", "open_ap")
        .eq("status", "completed")
        .lte("period_end", targetEnd)
        .order("period_end", { ascending: false })
        .limit(1)
        .single();

      let openApTotal = 0;
      if (apBatch) {
        const { data: apItems } = await supabase
          .from("open_ap_items")
          .select("amount_due")
          .eq("batch_id", apBatch.id);
        openApTotal = (apItems || []).reduce((sum, item) => sum + Number(item.amount_due), 0);
      }

      // Calculate KPIs from P&L
      const typedPlLines = plLines as FinancialStatementLine[];
      let revenue = 0;
      let expenses = 0;
      let cogs = 0;

      for (const line of typedPlLines) {
        const cat = line.mapped_category;
        if (!cat) continue;

        if (cat.category_type === "income") {
          revenue += Number(line.amount);
        } else if (cat.category_type === "expense") {
          expenses += Number(line.amount);
          if (cat.name === "Cost of Goods Sold") {
            cogs += Number(line.amount);
          }
        }
      }

      // Calculate cash on hand from balance sheet
      const typedBsLines = bsLines as FinancialStatementLine[];
      let cashOnHand = 0;
      for (const line of typedBsLines) {
        const cat = line.mapped_category;
        if (cat?.name === "Cash") {
          cashOnHand += Number(line.amount);
        }
      }

      const netIncome = revenue - expenses;
      const grossMarginPercent = revenue > 0 && cogs > 0 ? ((revenue - cogs) / revenue) * 100 : null;
      const netMarginPercent = revenue > 0 ? (netIncome / revenue) * 100 : null;

      return {
        revenue,
        expenses,
        netIncome,
        cashOnHand,
        openArTotal,
        openApTotal,
        grossMarginPercent,
        netMarginPercent,
      };
    },
    enabled: !!activeCompanyId,
  });
}

// Calculate YTD KPIs
export function useYtdKPIs(year?: number) {
  const { activeCompanyId } = useActiveCompany();
  const targetYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["ytd-kpis", activeCompanyId, targetYear],
    queryFn: async (): Promise<FinancialKPIs> => {
      if (!activeCompanyId) {
        return { revenue: 0, expenses: 0, netIncome: 0, cashOnHand: 0, openArTotal: 0, openApTotal: 0, grossMarginPercent: null, netMarginPercent: null };
      }

      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31`;

      // Get all P&L lines for the year
      const { data: plLines, error: plError } = await supabase
        .from("financial_statement_lines")
        .select(`
          amount,
          mapped_category:financial_categories(category_type, name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("statement_type", "pl")
        .gte("period_end", yearStart)
        .lte("period_end", yearEnd);

      if (plError) throw plError;

      const typedPlLines = plLines as FinancialStatementLine[];
      let revenue = 0;
      let expenses = 0;
      let cogs = 0;

      for (const line of typedPlLines) {
        const cat = line.mapped_category;
        if (!cat) continue;

        if (cat.category_type === "income") {
          revenue += Number(line.amount);
        } else if (cat.category_type === "expense") {
          expenses += Number(line.amount);
          if (cat.name === "Cost of Goods Sold") {
            cogs += Number(line.amount);
          }
        }
      }

      const netIncome = revenue - expenses;
      const grossMarginPercent = revenue > 0 && cogs > 0 ? ((revenue - cogs) / revenue) * 100 : null;
      const netMarginPercent = revenue > 0 ? (netIncome / revenue) * 100 : null;

      return {
        revenue,
        expenses,
        netIncome,
        cashOnHand: 0, // YTD doesn't sum cash
        openArTotal: 0,
        openApTotal: 0,
        grossMarginPercent,
        netMarginPercent,
      };
    },
    enabled: !!activeCompanyId,
  });
}

// Period comparison hook
export function usePeriodComparison(periodEnd?: string) {
  const currentKPIs = useFinancialKPIs(periodEnd);
  
  // Calculate previous month
  const prevPeriodEnd = periodEnd 
    ? format(endOfMonth(subMonths(parseISO(periodEnd), 1)), "yyyy-MM-dd")
    : format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
  
  const previousKPIs = useFinancialKPIs(prevPeriodEnd);
  const ytdKPIs = useYtdKPIs();

  const isLoading = currentKPIs.isLoading || previousKPIs.isLoading || ytdKPIs.isLoading;

  let momRevenueChange: number | null = null;
  let momNetIncomeChange: number | null = null;

  if (currentKPIs.data && previousKPIs.data) {
    if (previousKPIs.data.revenue > 0) {
      momRevenueChange = ((currentKPIs.data.revenue - previousKPIs.data.revenue) / previousKPIs.data.revenue) * 100;
    }
    if (previousKPIs.data.netIncome !== 0) {
      momNetIncomeChange = ((currentKPIs.data.netIncome - previousKPIs.data.netIncome) / Math.abs(previousKPIs.data.netIncome)) * 100;
    }
  }

  return {
    currentPeriod: currentKPIs.data,
    previousPeriod: previousKPIs.data,
    ytd: ytdKPIs.data,
    momRevenueChange,
    momNetIncomeChange,
    isLoading,
  };
}
