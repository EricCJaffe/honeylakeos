import * as React from "react";
import { format, subDays, subMonths, subQuarters, subYears } from "date-fns";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useQuery } from "@tanstack/react-query";
import { ReportType, ReportConfig } from "@/hooks/useReports";

interface RelationshipsReportFiltersProps {
  reportType: ReportType;
  config: ReportConfig;
  onChange: (config: ReportConfig) => void;
}

const DATE_PRESETS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 12 months", months: 12 },
  { label: "Last 24 months", months: 24 },
];

const RETENTION_PERIODS = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
];

const GROUPING_INTERVALS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export function RelationshipsReportFilters({ 
  reportType, 
  config, 
  onChange 
}: RelationshipsReportFiltersProps) {
  const { activeCompanyId } = useMembership();

  // Fetch pipelines for CRM reports
  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("sales_pipelines")
        .select("id, name, is_default")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("name");
      return data || [];
    },
    enabled: !!activeCompanyId && reportType.startsWith("crm"),
  });

  // Fetch donor campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["donor-campaigns-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("donor_campaigns")
        .select("id, name")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("name");
      return data || [];
    },
    enabled: !!activeCompanyId && reportType.startsWith("donor"),
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

  const isCrmReport = reportType.startsWith("crm");
  const isDonorReport = reportType.startsWith("donor");
  const showPipeline = reportType === "crm_pipeline_totals" || reportType === "crm_opportunities_won_lost";
  const showDateRange = ["crm_pipeline_totals", "crm_opportunities_won_lost", "donors_by_campaign"].includes(reportType);
  const showCampaign = reportType === "donors_by_campaign";
  const showRetentionPeriod = reportType === "donor_retention";
  const showGroupingInterval = reportType === "crm_opportunities_won_lost";
  const showDateToggle = reportType === "crm_pipeline_totals";

  const hasActiveFilters = Object.keys(config.filters || {}).some(k => config.filters?.[k]);

  // Set default pipeline if not set
  React.useEffect(() => {
    if (showPipeline && pipelines.length > 0 && !config.filters?.pipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      if (defaultPipeline) {
        handleFilterChange("pipelineId", defaultPipeline.id);
      }
    }
  }, [pipelines, config.filters?.pipelineId, showPipeline]);

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

      {/* Pipeline Selection (Required for CRM) */}
      {showPipeline && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Pipeline <span className="text-destructive">*</span>
          </Label>
          <Select
            value={(config.filters?.pipelineId as string) || ""}
            onValueChange={(v) => handleFilterChange("pipelineId", v)}
          >
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue placeholder="Select a pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name} {pipeline.is_default && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pipelines.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No pipelines found. Create a pipeline first.
            </p>
          )}
        </div>
      )}

      {/* Campaign Selection (Optional for Donors) */}
      {showCampaign && campaigns.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Campaign (Optional)</Label>
          <Select
            value={(config.filters?.campaignId as string) || "all"}
            onValueChange={(v) => handleFilterChange("campaignId", v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date Range */}
      {showDateRange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Date Range</Label>
            {showDateToggle && (
              <div className="flex items-center gap-2 text-xs">
                <span className={!config.filters?.useDateUpdated ? "font-medium" : "text-muted-foreground"}>
                  Created
                </span>
                <Switch
                  checked={!!config.filters?.useDateUpdated}
                  onCheckedChange={(checked) => handleFilterChange("useDateUpdated", checked || undefined)}
                />
                <span className={config.filters?.useDateUpdated ? "font-medium" : "text-muted-foreground"}>
                  Updated
                </span>
              </div>
            )}
          </div>
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

      {/* Grouping Interval for Won/Lost */}
      {showGroupingInterval && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Group By</Label>
          <Select
            value={(config.filters?.groupInterval as string) || "month"}
            onValueChange={(v) => handleFilterChange("groupInterval", v)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUPING_INTERVALS.map((interval) => (
                <SelectItem key={interval.value} value={interval.value}>
                  {interval.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Retention Period */}
      {showRetentionPeriod && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Select
            value={(config.filters?.period as string) || "quarter"}
            onValueChange={(v) => handleFilterChange("period", v)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {campaigns.length > 0 && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Campaign (Optional)</Label>
              <Select
                value={(config.filters?.campaignId as string) || "all"}
                onValueChange={(v) => handleFilterChange("campaignId", v === "all" ? undefined : v)}
              >
                <SelectTrigger className="w-[220px] h-8 text-xs mt-1">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
