import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCoachingOrg } from "./useActiveCoachingOrg";

export type DashboardType = "org_admin" | "manager" | "coach" | "member";

export interface DashboardWidget {
  id: string;
  widgetKey: string;
  description: string | null;
  dataSource: string | null;
  configJson: WidgetConfig;
  widgetOrder: number;
}

export interface WidgetConfig {
  route?: string;
  comingSoon?: boolean;
  modalContent?: string;
  icon?: string;
  metric?: string;
  [key: string]: unknown;
}

export interface CoachingDashboard {
  id: string;
  name: string;
  description: string | null;
  dashboardType: DashboardType;
  widgets: DashboardWidget[];
}

/**
 * Humanize a widget_key to a readable title
 * e.g., "active_engagements" -> "Active Engagements"
 */
export function humanizeWidgetKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get the route for a data source if it maps to an existing feature
 */
export function getDataSourceRoute(dataSource: string | null): string | null {
  if (!dataSource) return null;

  const routeMap: Record<string, string> = {
    coaching_org_engagements: "/app/coaching/engagements",
    coaching_coaches: "/app/coaching/org/team",
    coaching_managers: "/app/coaching/org/team",
    coaching_meetings: "/app/coaching/meetings",
    coaching_goals: "/app/coaching/goals",
    coaching_plans: "/app/coaching/plans",
    coaching_health_checks: "/app/coaching/health",
    coaching_workflow_templates: "/app/coaching/org/workflows",
    coaching_meeting_prep_items: "/app/coaching/prep",
  };

  return routeMap[dataSource] || null;
}

/**
 * Hook to fetch coaching dashboard and widgets by type
 */
export function useCoachingDashboard(dashboardType: DashboardType) {
  const { activeCoachingOrgId } = useActiveCoachingOrg();

  return useQuery({
    queryKey: ["coaching-dashboard", dashboardType, activeCoachingOrgId],
    queryFn: async () => {
      // Fetch the dashboard by type
      const { data: dashboard, error: dashboardError } = await supabase
        .from("coaching_dashboards")
        .select("id, name, description, dashboard_type")
        .eq("dashboard_type", dashboardType)
        .maybeSingle();

      if (dashboardError) throw dashboardError;
      if (!dashboard) return null;

      // Fetch widgets for this dashboard, ordered by widget_order
      const { data: widgets, error: widgetsError } = await supabase
        .from("coaching_dashboard_widgets")
        .select("id, widget_key, description, data_source, config_json, widget_order")
        .eq("dashboard_id", dashboard.id)
        .order("widget_order", { ascending: true });

      if (widgetsError) throw widgetsError;

      const result: CoachingDashboard = {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        dashboardType: dashboard.dashboard_type as DashboardType,
        widgets: (widgets || []).map((w) => ({
          id: w.id,
          widgetKey: w.widget_key,
          description: w.description,
          dataSource: w.data_source,
          configJson: (w.config_json as WidgetConfig) || {},
          widgetOrder: w.widget_order,
        })),
      };

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch org-specific dashboard widgets (from coaching_org_dashboard_widgets)
 * Falls back to default dashboard if no org-specific widgets exist
 */
export function useOrgDashboardWidgets(dashboardType: DashboardType) {
  const { activeCoachingOrgId } = useActiveCoachingOrg();

  return useQuery({
    queryKey: ["org-dashboard-widgets", dashboardType, activeCoachingOrgId],
    queryFn: async () => {
      if (!activeCoachingOrgId) {
        return null;
      }

      // Try to fetch org-specific widgets first
      const { data: orgWidgets, error: orgError } = await supabase
        .from("coaching_org_dashboard_widgets")
        .select("id, widget_key, description, data_source, config_json, widget_order, is_enabled")
        .eq("coaching_org_id", activeCoachingOrgId)
        .eq("dashboard_type", dashboardType)
        .eq("is_enabled", true)
        .order("widget_order", { ascending: true });

      if (orgError) throw orgError;

      // If org has custom widgets, use those
      if (orgWidgets && orgWidgets.length > 0) {
        return orgWidgets.map((w) => ({
          id: w.id,
          widgetKey: w.widget_key,
          description: w.description,
          dataSource: w.data_source,
          configJson: (w.config_json as WidgetConfig) || {},
          widgetOrder: w.widget_order,
          isOrgSpecific: true,
        }));
      }

      // Fall back to default dashboard widgets
      return null;
    },
    enabled: !!activeCoachingOrgId,
    staleTime: 5 * 60 * 1000,
  });
}
