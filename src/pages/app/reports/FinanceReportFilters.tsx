import * as React from "react";
import { format, subDays, subMonths } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useQuery } from "@tanstack/react-query";
import { ReportType, ReportConfig } from "@/hooks/useReports";

interface FinanceReportFiltersProps {
  reportType: ReportType;
  config: ReportConfig;
  onChange: (config: ReportConfig) => void;
}

const DATE_PRESETS = [
  { label: "This Month", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 12 months", months: 12 },
  { label: "Last 24 months", months: 24 },
];

const INVOICE_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
  { value: "partial", label: "Partial" },
];

const PAYMENT_METHODS = [
  { value: "all", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "ach", label: "ACH" },
  { value: "other", label: "Other" },
];

export function FinanceReportFilters({ 
  reportType, 
  config, 
  onChange 
}: FinanceReportFiltersProps) {
  const { activeCompanyId } = useMembership();

  // Fetch CRM clients for customer filter
  const { data: clients = [] } = useQuery({
    queryKey: ["crm-clients-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("crm_clients")
        .select("id, org_name, person_full_name")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("org_name");
      return data || [];
    },
    enabled: !!activeCompanyId && (reportType === "invoices_by_status" || reportType === "payments_summary" || reportType === "ar_aging"),
  });

  // Fetch receipt categories/tags
  const { data: receiptTags = [] } = useQuery({
    queryKey: ["receipt-tags", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("receipts")
        .select("category")
        .eq("company_id", activeCompanyId)
        .not("category", "is", null);
      
      // Get unique categories
      const categories = [...new Set((data || []).map(r => r.category).filter(Boolean))];
      return categories as string[];
    },
    enabled: !!activeCompanyId && reportType === "receipts_by_tag",
  });

  const handleDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const end = new Date();
    let start: Date;
    
    if (preset.days) {
      start = subDays(end, preset.days);
    } else if (preset.months) {
      start = subMonths(end, preset.months);
    } else {
      start = subDays(end, 90);
    }

    onChange({
      ...config,
      dateRange: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
    });
  };

  const handleFilterChange = (key: string, value: unknown) => {
    onChange({
      ...config,
      filters: {
        ...config.filters,
        [key]: value || undefined,
      },
    });
  };

  const clearFilters = () => {
    onChange({
      dateRange: config.dateRange,
      filters: {},
    });
  };

  const showDateRange = ["invoices_by_status", "payments_summary", "receipts_by_tag"].includes(reportType);
  const showAsOfDate = reportType === "ar_aging";
  const showCustomer = ["invoices_by_status", "payments_summary", "ar_aging"].includes(reportType);
  const showStatus = reportType === "invoices_by_status";
  const showPaymentMethod = reportType === "payments_summary";
  const showTags = reportType === "receipts_by_tag";
  const showVendor = reportType === "receipts_by_tag";

  const hasActiveFilters = Object.keys(config.filters || {}).some(k => config.filters?.[k]);

  const getClientDisplayName = (client: { org_name: string | null; person_full_name: string | null }) => {
    return client.org_name || client.person_full_name || "Unknown";
  };

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Filters</Label>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Date Range */}
      {showDateRange && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleDatePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal h-8",
                    !config.dateRange?.start && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {config.dateRange?.start
                    ? format(new Date(config.dateRange.start), "MMM d, yyyy")
                    : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={config.dateRange?.start ? new Date(config.dateRange.start) : undefined}
                  onSelect={(date) =>
                    onChange({
                      ...config,
                      dateRange: {
                        start: date?.toISOString().split("T")[0] || "",
                        end: config.dateRange?.end || new Date().toISOString().split("T")[0],
                      },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground self-center text-sm">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal h-8",
                    !config.dateRange?.end && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {config.dateRange?.end
                    ? format(new Date(config.dateRange.end), "MMM d, yyyy")
                    : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={config.dateRange?.end ? new Date(config.dateRange.end) : undefined}
                  onSelect={(date) =>
                    onChange({
                      ...config,
                      dateRange: {
                        start: config.dateRange?.start || "",
                        end: date?.toISOString().split("T")[0] || "",
                      },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* As of Date (for AR Aging) */}
      {showAsOfDate && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">As of Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[180px] justify-start text-left font-normal h-8",
                  !config.filters?.asOfDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {config.filters?.asOfDate
                  ? format(new Date(config.filters.asOfDate as string), "MMM d, yyyy")
                  : "Today"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={config.filters?.asOfDate ? new Date(config.filters.asOfDate as string) : new Date()}
                onSelect={(date) => handleFilterChange("asOfDate", date?.toISOString().split("T")[0])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Filter Dropdowns Row */}
      <div className="flex flex-wrap gap-3">
        {/* Customer Filter */}
        {showCustomer && clients.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Customer</Label>
            <Select
              value={(config.filters?.customerId as string) || "all"}
              onValueChange={(v) => handleFilterChange("customerId", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {getClientDisplayName(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Filter */}
        {showStatus && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={(config.filters?.status as string) || "all"}
              onValueChange={(v) => handleFilterChange("status", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Payment Method Filter */}
        {showPaymentMethod && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Payment Method</Label>
            <Select
              value={(config.filters?.paymentMethod as string) || "all"}
              onValueChange={(v) => handleFilterChange("paymentMethod", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tag/Category Filter */}
        {showTags && receiptTags.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select
              value={(config.filters?.tag as string) || "all"}
              onValueChange={(v) => handleFilterChange("tag", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {receiptTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
