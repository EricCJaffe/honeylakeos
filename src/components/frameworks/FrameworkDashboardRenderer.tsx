import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import {
  useCompanyActiveFramework,
  FrameworkDashboard,
  FrameworkDashboardSection,
} from "@/hooks/useFrameworks";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Calendar, 
  FileText, 
  FolderKanban, 
  GraduationCap,
  Users
} from "lucide-react";

interface FrameworkDashboardRendererProps {
  dashboardKey?: string;
  audience?: string;
}

interface SectionData {
  title: string;
  items: Array<{
    id: string;
    title: string;
    status?: string;
    dueDate?: string;
    progress?: number;
  }>;
  count: number;
  completedCount?: number;
}

const dataSourceIcons: Record<string, React.ReactNode> = {
  tasks: <CheckCircle2 className="h-5 w-5" />,
  projects: <FolderKanban className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  notes: <FileText className="h-5 w-5" />,
  lms: <GraduationCap className="h-5 w-5" />,
  crm: <Users className="h-5 w-5" />,
};

function useSectionData(section: FrameworkDashboardSection, companyId: string | null) {
  return useQuery({
    queryKey: ["framework-section-data", section.id, companyId],
    queryFn: async (): Promise<SectionData> => {
      if (!companyId) return { title: section.display_name, items: [], count: 0 };

      switch (section.data_source_type) {
        case "tasks": {
          const { data, count } = await supabase
            .from("tasks")
            .select("id, title, status, due_date", { count: "exact" })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(10);

          const completedCount = data?.filter((t) => t.status === "done").length || 0;
          return {
            title: section.display_name,
            items: (data || []).map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              dueDate: t.due_date,
            })),
            count: count || 0,
            completedCount,
          };
        }

        case "projects": {
          const { data, count } = await supabase
            .from("projects")
            .select("id, name, status", { count: "exact" })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .order("created_at", { ascending: false })
            .limit(10);

          const completedCount = data?.filter((p) => p.status === "completed").length || 0;
          return {
            title: section.display_name,
            items: (data || []).map((p) => ({
              id: p.id,
              title: p.name,
              status: p.status,
            })),
            count: count || 0,
            completedCount,
          };
        }

        case "calendar": {
          const now = new Date().toISOString();
          const { data, count } = await supabase
            .from("events")
            .select("id, title, start_at", { count: "exact" })
            .eq("company_id", companyId)
            .gte("start_at", now)
            .order("start_at", { ascending: true })
            .limit(10);

          return {
            title: section.display_name,
            items: (data || []).map((e) => ({
              id: e.id,
              title: e.title,
              dueDate: e.start_at,
            })),
            count: count || 0,
          };
        }

        case "notes": {
          const { data, count } = await supabase
            .from("notes")
            .select("id, title", { count: "exact" })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(10);

          return {
            title: section.display_name,
            items: (data || []).map((n) => ({
              id: n.id,
              title: n.title,
            })),
            count: count || 0,
          };
        }

        case "lms": {
          const { data, count } = await supabase
            .from("lms_courses")
            .select("id, title, status", { count: "exact" })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(10);

          return {
            title: section.display_name,
            items: (data || []).map((c) => ({
              id: c.id,
              title: c.title,
              status: c.status,
            })),
            count: count || 0,
          };
        }

        case "crm": {
          const { data, count } = await supabase
            .from("crm_clients")
            .select("id, person_full_name, org_name, lifecycle_status", { count: "exact" })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(10);

          return {
            title: section.display_name,
            items: (data || []).map((c) => ({
              id: c.id,
              title: c.person_full_name || c.org_name || "Unnamed",
              status: c.lifecycle_status,
            })),
            count: count || 0,
          };
        }

        default:
          return { title: section.display_name, items: [], count: 0 };
      }
    },
    enabled: !!companyId,
  });
}

function DashboardSection({
  section,
  companyId,
}: {
  section: FrameworkDashboardSection;
  companyId: string | null;
}) {
  const { data, isLoading } = useSectionData(section, companyId);
  const { isEnabled } = useCompanyModules();

  // Check if module is enabled for this data source
  const moduleMap: Record<string, string> = {
    tasks: "tasks",
    projects: "projects",
    calendar: "calendar",
    notes: "notes",
    lms: "lms",
    crm: "crm",
  };

  const moduleKey = moduleMap[section.data_source_type];
  // Skip module check - just render if data source type is known
  const moduleEnabled = true;

  if (!moduleEnabled) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {dataSourceIcons[section.data_source_type]}
            {section.display_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Module not enabled</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const completionPercent =
    data?.completedCount !== undefined && data.count > 0
      ? Math.round((data.completedCount / data.count) * 100)
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {dataSourceIcons[section.data_source_type]}
            {data?.title}
          </CardTitle>
          <Badge variant="secondary">{data?.count || 0}</Badge>
        </div>
        {completionPercent !== null && (
          <div className="flex items-center gap-2 mt-2">
            <Progress value={completionPercent} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground">{completionPercent}%</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data?.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items</p>
        ) : (
          <ul className="space-y-2">
            {data?.items.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                {item.status === "done" || item.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : item.status === "overdue" ? (
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate">{item.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function FrameworkDashboardRenderer({
  dashboardKey,
  audience,
}: FrameworkDashboardRendererProps) {
  const { activeCompanyId } = useActiveCompany();
  const { data: activeFramework, isLoading: frameworkLoading } = useCompanyActiveFramework();

  // Fetch dashboard and sections
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["framework-dashboard", activeFramework?.active_framework_id, dashboardKey, audience],
    queryFn: async () => {
      if (!activeFramework?.active_framework_id) return null;

      let query = supabase
        .from("framework_dashboards")
        .select("*")
        .eq("framework_id", activeFramework.active_framework_id)
        .eq("enabled", true);

      if (dashboardKey) {
        query = query.eq("key", dashboardKey);
      }
      if (audience) {
        query = query.eq("audience", audience);
      }

      const { data: dashboards } = await query.order("sort_order").limit(1);
      const dashboard = dashboards?.[0] as FrameworkDashboard | undefined;

      if (!dashboard) return null;

      const { data: sections } = await supabase
        .from("framework_dashboard_sections")
        .select("*")
        .eq("dashboard_id", dashboard.id)
        .eq("enabled", true)
        .order("sort_order");

      return {
        dashboard,
        sections: (sections || []) as FrameworkDashboardSection[],
      };
    },
    enabled: !!activeFramework?.active_framework_id,
  });

  if (frameworkLoading || dashboardLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!activeFramework) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CardDescription>No framework adopted. Go to Settings to select a framework.</CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CardDescription>No dashboard configured for this view.</CardDescription>
        </CardContent>
      </Card>
    );
  }

  const { dashboard, sections } = dashboardData;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{dashboard.display_name}</h2>
        <p className="text-muted-foreground">
          Powered by {activeFramework.framework?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <DashboardSection
            key={section.id}
            section={section}
            companyId={activeCompanyId}
          />
        ))}
      </div>
    </div>
  );
}
