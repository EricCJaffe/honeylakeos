import { DashboardWidget } from "@/hooks/useCoachingDashboard";
import { DashboardWidgetCard } from "./DashboardWidgetCard";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardWidgetGridProps {
  widgets: DashboardWidget[];
  isLoading?: boolean;
  /** Custom renderer for specific widget keys */
  renderWidget?: (widget: DashboardWidget) => React.ReactNode | null;
  columns?: 2 | 3 | 4;
}

export function DashboardWidgetGrid({ 
  widgets, 
  isLoading,
  renderWidget,
  columns = 4,
}: DashboardWidgetGridProps) {
  if (isLoading) {
    return (
      <div className={`grid gap-4 ${
        columns === 2 ? "md:grid-cols-2" : 
        columns === 3 ? "md:grid-cols-3" : 
        "md:grid-cols-2 lg:grid-cols-4"
      }`}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!widgets || widgets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No widgets configured for this dashboard.
      </div>
    );
  }

  const gridClass = columns === 2 
    ? "grid gap-4 md:grid-cols-2" 
    : columns === 3 
    ? "grid gap-4 md:grid-cols-3" 
    : "grid gap-4 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={gridClass}>
      {widgets.map((widget) => {
        // Allow custom rendering for specific widgets
        const customContent = renderWidget?.(widget);
        
        return (
          <DashboardWidgetCard key={widget.id} widget={widget}>
            {customContent}
          </DashboardWidgetCard>
        );
      })}
    </div>
  );
}
