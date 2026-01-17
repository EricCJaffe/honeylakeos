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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useQuery } from "@tanstack/react-query";
import { ReportType, ReportConfig } from "@/hooks/useReports";

interface WorkReportFiltersProps {
  reportType: ReportType;
  config: ReportConfig;
  onChange: (config: ReportConfig) => void;
}

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 12 months", months: 12 },
];

export function WorkReportFilters({ reportType, config, onChange }: WorkReportFiltersProps) {
  const { activeCompanyId } = useMembership();

  // Fetch task lists for filter dropdown
  const { data: taskLists = [] } = useQuery({
    queryKey: ["task-lists-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("task_lists")
        .select("id, name")
        .eq("company_id", activeCompanyId)
        .order("name");
      return data || [];
    },
    enabled: !!activeCompanyId && reportType.startsWith("tasks"),
  });

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("name");
      return data || [];
    },
    enabled: !!activeCompanyId,
  });

  const handleDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const end = new Date();
    let start: Date;
    
    if (preset.days) {
      start = subDays(end, preset.days);
    } else if (preset.months) {
      start = subMonths(end, preset.months);
    } else {
      start = subDays(end, 30);
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

  const isTasksReport = reportType.startsWith("tasks");
  const isProjectsReport = reportType.startsWith("projects");
  const showDateRange = ["tasks_by_status", "tasks_by_assignee", "projects_by_phase", "projects_active_completed"].includes(reportType);
  const showAssignee = ["tasks_by_status", "tasks_due_soon", "tasks_overdue"].includes(reportType);
  const showList = isTasksReport;
  const showProject = isTasksReport;
  const showStatus = reportType === "tasks_by_assignee";
  const showUnassigned = reportType === "tasks_by_status";
  const showOwner = isProjectsReport;
  const showActiveCompleted = reportType === "projects_by_phase";

  const hasActiveFilters = Object.keys(config.filters || {}).some(k => config.filters?.[k]);

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

      {/* Dropdowns Row */}
      <div className="flex flex-wrap gap-3">
        {/* Task List */}
        {showList && taskLists.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">List</Label>
            <Select
              value={(config.filters?.listId as string) || "all"}
              onValueChange={(v) => handleFilterChange("listId", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Lists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lists</SelectItem>
                {taskLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Project */}
        {showProject && projects.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select
              value={(config.filters?.projectId as string) || "all"}
              onValueChange={(v) => handleFilterChange("projectId", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status (for tasks by assignee) */}
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
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        {showUnassigned && (
          <div className="flex items-center gap-2">
            <Switch
              id="unassigned"
              checked={!!config.filters?.unassignedOnly}
              onCheckedChange={(checked) => handleFilterChange("unassignedOnly", checked || undefined)}
            />
            <Label htmlFor="unassigned" className="text-xs cursor-pointer">
              Unassigned only
            </Label>
          </div>
        )}

        {showActiveCompleted && (
          <>
            <div className="flex items-center gap-2">
              <Switch
                id="activeOnly"
                checked={!!config.filters?.activeOnly}
                onCheckedChange={(checked) => {
                  handleFilterChange("activeOnly", checked || undefined);
                  if (checked) handleFilterChange("completedOnly", undefined);
                }}
              />
              <Label htmlFor="activeOnly" className="text-xs cursor-pointer">
                Active only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="completedOnly"
                checked={!!config.filters?.completedOnly}
                onCheckedChange={(checked) => {
                  handleFilterChange("completedOnly", checked || undefined);
                  if (checked) handleFilterChange("activeOnly", undefined);
                }}
              />
              <Label htmlFor="completedOnly" className="text-xs cursor-pointer">
                Completed only
              </Label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
