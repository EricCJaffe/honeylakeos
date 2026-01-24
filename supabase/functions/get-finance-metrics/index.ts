import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Standard metric keys
type MetricKey =
  | "revenue_mtd" | "revenue_ytd"
  | "gross_profit_mtd" | "gross_profit_ytd"
  | "gross_margin_mtd" | "gross_margin_ytd"
  | "net_income_mtd" | "net_income_ytd"
  | "cash_on_hand"
  | "open_ar_total" | "open_ap_total"
  | "ar_aging_0_30" | "ar_aging_31_60" | "ar_aging_61_90" | "ar_aging_90_plus"
  | "ap_aging_0_30" | "ap_aging_31_60" | "ap_aging_61_90" | "ap_aging_90_plus";

interface MetricValue {
  value: number | null;
  period_start: string | null;
  period_end: string | null;
  source: "builtin_books" | "external_reporting";
  confidence: "high" | "medium";
  notes: string | null;
}

type MetricsResponse = Record<MetricKey, MetricValue>;

interface RequestBody {
  company_id: string;
  period_end_date?: string; // YYYY-MM-DD, defaults to today
  period_granularity?: "month" | "quarter" | "year"; // defaults to month
}

// Helper to get period boundaries
function getPeriodBoundaries(endDate: Date, granularity: string): { start: Date; end: Date } {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  
  if (granularity === "quarter") {
    const quarter = Math.floor(end.getMonth() / 3);
    start = new Date(end.getFullYear(), quarter * 3, 1);
  } else if (granularity === "year") {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    // month
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  }
  
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Calculate aging bucket from due date
function getAgingBucket(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysOverdue <= 0) return "0_30"; // Not yet due, count as current
  if (daysOverdue <= 30) return "0_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";
  return "90_plus";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get authorization header for user context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token for RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { company_id, period_end_date, period_granularity = "month" } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check finance access permission
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role, can_access_finance")
      .eq("company_id", company_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    // Also check site admin
    const { data: siteMembership } = await supabase
      .from("site_memberships")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["site_admin", "super_admin"])
      .limit(1)
      .single();

    const isSiteAdmin = !!siteMembership;
    const isCompanyAdmin = membership?.role === "company_admin";
    const hasFinanceAccess = membership?.can_access_finance === true;

    if (!isSiteAdmin && !isCompanyAdmin && !hasFinanceAccess) {
      return new Response(
        JSON.stringify({ error: "Finance access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company and finance mode
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, finance_mode")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const financeMode = company.finance_mode as "builtin_books" | "external_reporting" | null;
    const endDate = period_end_date ? new Date(period_end_date) : new Date();
    const { start: periodStart, end: periodEnd } = getPeriodBoundaries(endDate, period_granularity);
    
    // YTD boundaries
    const ytdStart = new Date(endDate.getFullYear(), 0, 1);
    const ytdEnd = periodEnd;

    let metrics: Partial<MetricsResponse> = {};

    if (financeMode === "builtin_books") {
      metrics = await computeBuiltinBooksMetrics(
        supabase,
        company_id,
        periodStart,
        periodEnd,
        ytdStart,
        ytdEnd
      );
    } else if (financeMode === "external_reporting") {
      metrics = await computeExternalReportingMetrics(
        supabase,
        company_id,
        periodStart,
        periodEnd,
        ytdStart,
        ytdEnd
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: "Finance mode not configured",
          details: "Please set up finance mode in company settings"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the request
    await supabase.from("audit_logs").insert({
      company_id,
      action: "finance_metrics.requested",
      entity_type: "company",
      entity_id: company_id,
      actor_user_id: user.id,
      metadata: {
        mode: financeMode,
        period_end: formatDate(periodEnd),
        granularity: period_granularity,
      },
    });

    console.log(`Finance metrics requested for company ${company_id} in ${financeMode} mode`);

    return new Response(
      JSON.stringify({
        company_id,
        finance_mode: financeMode,
        period_start: formatDate(periodStart),
        period_end: formatDate(periodEnd),
        metrics,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error computing finance metrics:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================
// BUILTIN BOOKS METRICS COMPUTATION
// ============================================
async function computeBuiltinBooksMetrics(
  supabase: any,
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  ytdStart: Date,
  ytdEnd: Date
): Promise<Partial<MetricsResponse>> {
  const source = "builtin_books" as const;
  const periodStartStr = formatDate(periodStart);
  const periodEndStr = formatDate(periodEnd);
  const ytdStartStr = formatDate(ytdStart);
  const ytdEndStr = formatDate(ytdEnd);

  // Get ledger postings with account types for MTD
  const { data: mtdPostings } = await supabase
    .from("ledger_postings")
    .select(`
      debit_amount,
      credit_amount,
      account:finance_accounts(account_type, name)
    `)
    .eq("company_id", companyId)
    .gte("posting_date", periodStartStr)
    .lte("posting_date", periodEndStr);

  // Get ledger postings for YTD
  const { data: ytdPostings } = await supabase
    .from("ledger_postings")
    .select(`
      debit_amount,
      credit_amount,
      account:finance_accounts(account_type, name)
    `)
    .eq("company_id", companyId)
    .gte("posting_date", ytdStartStr)
    .lte("posting_date", ytdEndStr);

  // Calculate MTD revenue and expenses
  let mtdRevenue = 0;
  let mtdExpenses = 0;
  let mtdCogs = 0;
  
  for (const posting of mtdPostings || []) {
    const accountType = posting.account?.account_type;
    const accountName = posting.account?.name || "";
    const netAmount = Number(posting.credit_amount || 0) - Number(posting.debit_amount || 0);
    
    if (accountType === "income") {
      mtdRevenue += netAmount;
    } else if (accountType === "expense") {
      mtdExpenses += Math.abs(netAmount);
      // Check for COGS
      if (accountName.toLowerCase().includes("cost of goods") || accountName.toLowerCase().includes("cogs")) {
        mtdCogs += Math.abs(netAmount);
      }
    }
  }

  // Calculate YTD revenue and expenses
  let ytdRevenue = 0;
  let ytdExpenses = 0;
  let ytdCogs = 0;
  
  for (const posting of ytdPostings || []) {
    const accountType = posting.account?.account_type;
    const accountName = posting.account?.name || "";
    const netAmount = Number(posting.credit_amount || 0) - Number(posting.debit_amount || 0);
    
    if (accountType === "income") {
      ytdRevenue += netAmount;
    } else if (accountType === "expense") {
      ytdExpenses += Math.abs(netAmount);
      if (accountName.toLowerCase().includes("cost of goods") || accountName.toLowerCase().includes("cogs")) {
        ytdCogs += Math.abs(netAmount);
      }
    }
  }

  // Cash on hand - sum of bank account balances mapped to COA
  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const cashOnHand = (bankAccounts || []).reduce(
    (sum: number, acc: any) => sum + Number(acc.current_balance || 0),
    0
  );

  // Open AR - unpaid invoices (if invoices table exists)
  // For now, we'll check for any AR tracking
  let openArTotal = 0;
  let arAging = { "0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
  
  // Check finance accounts for AR balance
  const { data: arAccounts } = await supabase
    .from("finance_accounts")
    .select("id, name")
    .eq("company_id", companyId)
    .ilike("name", "%receivable%");

  // Open AP - unpaid bills
  const { data: unpaidBills } = await supabase
    .from("bills")
    .select("total_amount, amount_paid, due_date")
    .eq("company_id", companyId)
    .in("status", ["approved", "partial"]);

  let openApTotal = 0;
  let apAging = { "0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };

  for (const bill of unpaidBills || []) {
    const balance = Number(bill.total_amount || 0) - Number(bill.amount_paid || 0);
    openApTotal += balance;
    
    const bucket = getAgingBucket(bill.due_date);
    if (bucket && apAging[bucket as keyof typeof apAging] !== undefined) {
      apAging[bucket as keyof typeof apAging] += balance;
    }
  }

  const mtdNetIncome = mtdRevenue - mtdExpenses;
  const ytdNetIncome = ytdRevenue - ytdExpenses;
  const mtdGrossProfit = mtdCogs > 0 ? mtdRevenue - mtdCogs : null;
  const ytdGrossProfit = ytdCogs > 0 ? ytdRevenue - ytdCogs : null;
  const mtdGrossMargin = mtdCogs > 0 && mtdRevenue > 0 ? ((mtdRevenue - mtdCogs) / mtdRevenue) * 100 : null;
  const ytdGrossMargin = ytdCogs > 0 && ytdRevenue > 0 ? ((ytdRevenue - ytdCogs) / ytdRevenue) * 100 : null;

  const hasPostings = (mtdPostings?.length || 0) > 0 || (ytdPostings?.length || 0) > 0;

  return {
    revenue_mtd: {
      value: mtdRevenue,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence: hasPostings ? "high" : "medium",
      notes: hasPostings ? null : "No posted transactions in period",
    },
    revenue_ytd: {
      value: ytdRevenue,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence: hasPostings ? "high" : "medium",
      notes: null,
    },
    gross_profit_mtd: {
      value: mtdGrossProfit,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence: mtdCogs > 0 ? "high" : "medium",
      notes: mtdCogs === 0 ? "No COGS account found" : null,
    },
    gross_profit_ytd: {
      value: ytdGrossProfit,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence: ytdCogs > 0 ? "high" : "medium",
      notes: ytdCogs === 0 ? "No COGS account found" : null,
    },
    gross_margin_mtd: {
      value: mtdGrossMargin,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence: mtdCogs > 0 ? "high" : "medium",
      notes: mtdCogs === 0 ? "No COGS account found" : null,
    },
    gross_margin_ytd: {
      value: ytdGrossMargin,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence: ytdCogs > 0 ? "high" : "medium",
      notes: ytdCogs === 0 ? "No COGS account found" : null,
    },
    net_income_mtd: {
      value: mtdNetIncome,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence: hasPostings ? "high" : "medium",
      notes: null,
    },
    net_income_ytd: {
      value: ytdNetIncome,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence: hasPostings ? "high" : "medium",
      notes: null,
    },
    cash_on_hand: {
      value: cashOnHand,
      period_start: null,
      period_end: periodEndStr,
      source,
      confidence: "high",
      notes: null,
    },
    open_ar_total: {
      value: openArTotal,
      period_start: null,
      period_end: periodEndStr,
      source,
      confidence: "high",
      notes: openArTotal === 0 ? "No open receivables" : null,
    },
    open_ap_total: {
      value: openApTotal,
      period_start: null,
      period_end: periodEndStr,
      source,
      confidence: "high",
      notes: null,
    },
    ar_aging_0_30: { value: arAging["0_30"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ar_aging_31_60: { value: arAging["31_60"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ar_aging_61_90: { value: arAging["61_90"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ar_aging_90_plus: { value: arAging["90_plus"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ap_aging_0_30: { value: apAging["0_30"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ap_aging_31_60: { value: apAging["31_60"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ap_aging_61_90: { value: apAging["61_90"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
    ap_aging_90_plus: { value: apAging["90_plus"], period_start: null, period_end: periodEndStr, source, confidence: "high", notes: null },
  };
}

// ============================================
// EXTERNAL REPORTING METRICS COMPUTATION
// ============================================
async function computeExternalReportingMetrics(
  supabase: any,
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  ytdStart: Date,
  ytdEnd: Date
): Promise<Partial<MetricsResponse>> {
  const source = "external_reporting" as const;
  const periodStartStr = formatDate(periodStart);
  const periodEndStr = formatDate(periodEnd);
  const ytdStartStr = formatDate(ytdStart);
  const ytdEndStr = formatDate(ytdEnd);

  // Get P&L statement lines for the period with mapped categories
  const { data: mtdLines } = await supabase
    .from("financial_statement_lines")
    .select(`
      amount,
      mapped_category:financial_categories(category_type, name)
    `)
    .eq("company_id", companyId)
    .eq("statement_type", "pl")
    .eq("period_end", periodEndStr);

  // Get YTD P&L lines
  const { data: ytdLines } = await supabase
    .from("financial_statement_lines")
    .select(`
      amount,
      mapped_category:financial_categories(category_type, name)
    `)
    .eq("company_id", companyId)
    .eq("statement_type", "pl")
    .gte("period_end", ytdStartStr)
    .lte("period_end", ytdEndStr);

  // Get latest balance sheet
  const { data: bsLines } = await supabase
    .from("financial_statement_lines")
    .select(`
      amount,
      mapped_category:financial_categories(category_type, name)
    `)
    .eq("company_id", companyId)
    .eq("statement_type", "balance_sheet")
    .lte("period_end", periodEndStr)
    .order("period_end", { ascending: false })
    .limit(50);

  // Calculate MTD metrics
  let mtdRevenue = 0;
  let mtdExpenses = 0;
  let mtdCogs = 0;
  let mtdUnmapped = 0;

  for (const line of mtdLines || []) {
    const cat = line.mapped_category;
    if (!cat) {
      mtdUnmapped++;
      continue;
    }
    
    if (cat.category_type === "income") {
      mtdRevenue += Number(line.amount || 0);
    } else if (cat.category_type === "expense") {
      mtdExpenses += Number(line.amount || 0);
      if (cat.name?.toLowerCase().includes("cost of goods") || cat.name?.toLowerCase().includes("cogs")) {
        mtdCogs += Number(line.amount || 0);
      }
    }
  }

  // Calculate YTD metrics
  let ytdRevenue = 0;
  let ytdExpenses = 0;
  let ytdCogs = 0;

  for (const line of ytdLines || []) {
    const cat = line.mapped_category;
    if (!cat) continue;
    
    if (cat.category_type === "income") {
      ytdRevenue += Number(line.amount || 0);
    } else if (cat.category_type === "expense") {
      ytdExpenses += Number(line.amount || 0);
      if (cat.name?.toLowerCase().includes("cost of goods") || cat.name?.toLowerCase().includes("cogs")) {
        ytdCogs += Number(line.amount || 0);
      }
    }
  }

  // Cash on hand from balance sheet
  let cashOnHand = 0;
  for (const line of bsLines || []) {
    const cat = line.mapped_category;
    if (cat?.name?.toLowerCase() === "cash") {
      cashOnHand += Number(line.amount || 0);
    }
  }

  // Get latest AR import
  const { data: latestArBatch } = await supabase
    .from("financial_import_batches")
    .select("id")
    .eq("company_id", companyId)
    .eq("import_type", "open_ar")
    .eq("status", "completed")
    .order("period_end", { ascending: false })
    .limit(1)
    .single();

  let openArTotal = 0;
  let arAging = { "0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
  let hasArDueDates = false;

  if (latestArBatch) {
    const { data: arItems } = await supabase
      .from("open_ar_items")
      .select("amount_due, due_date")
      .eq("batch_id", latestArBatch.id);

    for (const item of arItems || []) {
      const amount = Number(item.amount_due || 0);
      openArTotal += amount;
      
      if (item.due_date) {
        hasArDueDates = true;
        const bucket = getAgingBucket(item.due_date);
        if (bucket && arAging[bucket as keyof typeof arAging] !== undefined) {
          arAging[bucket as keyof typeof arAging] += amount;
        }
      }
    }
  }

  // Get latest AP import
  const { data: latestApBatch } = await supabase
    .from("financial_import_batches")
    .select("id")
    .eq("company_id", companyId)
    .eq("import_type", "open_ap")
    .eq("status", "completed")
    .order("period_end", { ascending: false })
    .limit(1)
    .single();

  let openApTotal = 0;
  let apAging = { "0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
  let hasApDueDates = false;

  if (latestApBatch) {
    const { data: apItems } = await supabase
      .from("open_ap_items")
      .select("amount_due, due_date")
      .eq("batch_id", latestApBatch.id);

    for (const item of apItems || []) {
      const amount = Number(item.amount_due || 0);
      openApTotal += amount;
      
      if (item.due_date) {
        hasApDueDates = true;
        const bucket = getAgingBucket(item.due_date);
        if (bucket && apAging[bucket as keyof typeof apAging] !== undefined) {
          apAging[bucket as keyof typeof apAging] += amount;
        }
      }
    }
  }

  const mtdNetIncome = mtdRevenue - mtdExpenses;
  const ytdNetIncome = ytdRevenue - ytdExpenses;
  const mtdGrossProfit = mtdCogs > 0 ? mtdRevenue - mtdCogs : null;
  const ytdGrossProfit = ytdCogs > 0 ? ytdRevenue - ytdCogs : null;
  const mtdGrossMargin = mtdCogs > 0 && mtdRevenue > 0 ? ((mtdRevenue - mtdCogs) / mtdRevenue) * 100 : null;
  const ytdGrossMargin = ytdCogs > 0 && ytdRevenue > 0 ? ((ytdRevenue - ytdCogs) / ytdRevenue) * 100 : null;

  const hasImports = (mtdLines?.length || 0) > 0;
  const confidence = mtdUnmapped > 0 ? "medium" : "high";

  return {
    revenue_mtd: {
      value: mtdRevenue,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence,
      notes: hasImports ? (mtdUnmapped > 0 ? `${mtdUnmapped} unmapped categories` : null) : "No imports for this period",
    },
    revenue_ytd: {
      value: ytdRevenue,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence,
      notes: null,
    },
    gross_profit_mtd: {
      value: mtdGrossProfit,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence: mtdCogs > 0 ? confidence : "medium",
      notes: mtdCogs === 0 ? "Map COGS category to enable" : null,
    },
    gross_profit_ytd: {
      value: ytdGrossProfit,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence: ytdCogs > 0 ? confidence : "medium",
      notes: ytdCogs === 0 ? "Map COGS category to enable" : null,
    },
    gross_margin_mtd: {
      value: mtdGrossMargin,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence: mtdCogs > 0 ? confidence : "medium",
      notes: mtdCogs === 0 ? "Map COGS category to enable" : null,
    },
    gross_margin_ytd: {
      value: ytdGrossMargin,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence: ytdCogs > 0 ? confidence : "medium",
      notes: ytdCogs === 0 ? "Map COGS category to enable" : null,
    },
    net_income_mtd: {
      value: mtdNetIncome,
      period_start: periodStartStr,
      period_end: periodEndStr,
      source,
      confidence,
      notes: null,
    },
    net_income_ytd: {
      value: ytdNetIncome,
      period_start: ytdStartStr,
      period_end: ytdEndStr,
      source,
      confidence,
      notes: null,
    },
    cash_on_hand: {
      value: cashOnHand,
      period_start: null,
      period_end: periodEndStr,
      source,
      confidence: cashOnHand > 0 ? "high" : "medium",
      notes: cashOnHand === 0 ? "Map Cash category in balance sheet" : null,
    },
    open_ar_total: {
      value: openArTotal,
      period_start: null,
      period_end: periodEndStr,
      source,
      confidence: latestArBatch ? "high" : "medium",
      notes: !latestArBatch ? "Import Open AR data" : null,
    },
    open_ap_total: {
      value: openApTotal,
      period_start: null,
      period_end: periodEndStr,
      source,
      confidence: latestApBatch ? "high" : "medium",
      notes: !latestApBatch ? "Import Open AP data" : null,
    },
    ar_aging_0_30: { value: hasArDueDates ? arAging["0_30"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasArDueDates ? "high" : "medium", notes: hasArDueDates ? null : "Import due dates for aging" },
    ar_aging_31_60: { value: hasArDueDates ? arAging["31_60"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasArDueDates ? "high" : "medium", notes: null },
    ar_aging_61_90: { value: hasArDueDates ? arAging["61_90"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasArDueDates ? "high" : "medium", notes: null },
    ar_aging_90_plus: { value: hasArDueDates ? arAging["90_plus"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasArDueDates ? "high" : "medium", notes: null },
    ap_aging_0_30: { value: hasApDueDates ? apAging["0_30"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasApDueDates ? "high" : "medium", notes: hasApDueDates ? null : "Import due dates for aging" },
    ap_aging_31_60: { value: hasApDueDates ? apAging["31_60"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasApDueDates ? "high" : "medium", notes: null },
    ap_aging_61_90: { value: hasApDueDates ? apAging["61_90"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasApDueDates ? "high" : "medium", notes: null },
    ap_aging_90_plus: { value: hasApDueDates ? apAging["90_plus"] : null, period_start: null, period_end: periodEndStr, source, confidence: hasApDueDates ? "high" : "medium", notes: null },
  };
}
