import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DashboardWidget, 
  humanizeWidgetKey, 
  getDataSourceRoute,
  WidgetConfig 
} from "@/hooks/useCoachingDashboard";
import { 
  ArrowRight, 
  Calendar, 
  Target, 
  Users, 
  Heart, 
  FileText, 
  Settings,
  TrendingUp,
  CheckCircle2,
  Clock,
  Workflow,
  GitBranch,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  BookOpen,
  Layers,
} from "lucide-react";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  children?: React.ReactNode;
}

const WIDGET_ICONS: Record<string, React.ReactNode> = {
  active_engagements: <Users className="h-5 w-5" />,
  coach_performance: <TrendingUp className="h-5 w-5" />,
  org_health_trends: <Heart className="h-5 w-5" />,
  workflow_templates: <Layers className="h-5 w-5" />,
  coaches_overview: <Users className="h-5 w-5" />,
  engagement_status: <Activity className="h-5 w-5" />,
  overdue_workflows: <AlertTriangle className="h-5 w-5" />,
  team_meetings: <Calendar className="h-5 w-5" />,
  upcoming_meetings: <Calendar className="h-5 w-5" />,
  my_upcoming_meetings: <Calendar className="h-5 w-5" />,
  client_goals: <Target className="h-5 w-5" />,
  goals_progress: <Target className="h-5 w-5" />,
  prep_required: <ClipboardCheck className="h-5 w-5" />,
  active_plans: <FileText className="h-5 w-5" />,
  my_plans: <BookOpen className="h-5 w-5" />,
  health_trends: <Heart className="h-5 w-5" />,
  // New workflow/forms widgets
  org_workflows: <GitBranch className="h-5 w-5" />,
  org_forms: <FileText className="h-5 w-5" />,
  coach_workflows: <GitBranch className="h-5 w-5" />,
  coach_forms: <FileText className="h-5 w-5" />,
  my_workflows: <GitBranch className="h-5 w-5" />,
  my_forms: <FileText className="h-5 w-5" />,
  manager_workflows: <GitBranch className="h-5 w-5" />,
  manager_forms: <FileText className="h-5 w-5" />,
};

// Icon name to component mapping for dynamic resolution
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, Heart, TrendingUp, Activity, AlertTriangle, Calendar, Target, 
  ClipboardCheck, FileText, BookOpen, Layers, GitBranch, Settings, Workflow, CheckCircle2, Clock,
};

// Dynamic icon resolver from config_json.icon
function getIconFromConfig(iconName: string | undefined): React.ReactNode | null {
  if (!iconName) return null;
  const IconComponent = ICON_MAP[iconName];
  if (IconComponent) {
    return <IconComponent className="h-5 w-5" />;
  }
  return null;
}

export function DashboardWidgetCard({ widget, children }: DashboardWidgetCardProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const title = humanizeWidgetKey(widget.widgetKey);
  const config = widget.configJson || {};
  const isComingSoon = config.comingSoon === true;
  const isLink = config.kind === "link";
  const isPlaceholder = config.kind === "placeholder";
  
  // Determine route: config.href takes precedence, then config.route, then data source mapping
  const route = (config as { href?: string }).href || config.route || getDataSourceRoute(widget.dataSource);
  const hasRoute = !!route && !isComingSoon;

  // Get icon from config or fallback to widget key mapping
  const configIcon = getIconFromConfig(config.icon as string | undefined);
  const icon = configIcon || WIDGET_ICONS[widget.widgetKey] || <Settings className="h-5 w-5" />;

  const handleCardClick = () => {
    if (isComingSoon || isPlaceholder) {
      setShowPreviewModal(true);
    }
  };

  // Extract preview info from config
  const preview = (config as { preview?: { title?: string; steps?: string[] } }).preview;

  return (
    <>
      <Card 
        className={`transition-all ${isComingSoon || isPlaceholder ? "opacity-75 cursor-pointer hover:opacity-100" : ""} ${hasRoute ? "hover:shadow-md" : ""}`}
        onClick={(isComingSoon || isPlaceholder) && !hasRoute ? handleCardClick : undefined}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">{icon}</div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            </div>
            {isComingSoon && (
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            )}
          </div>
          {widget.description && (
            <CardDescription className="text-sm">
              {widget.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {children ? (
            children
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-muted-foreground">—</span>
              {hasRoute && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to={route}>
                    View
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {(isComingSoon || isPlaceholder) && !hasRoute && (
                <Button variant="ghost" size="sm" onClick={handleCardClick}>
                  Preview
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon / Placeholder Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {preview?.title || title}
            </DialogTitle>
            <DialogDescription>
              {config.modalContent || widget.description || "This feature is coming soon."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {preview?.steps && preview.steps.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">What you'll be able to do:</p>
                <ul className="space-y-2">
                  {preview.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg bg-muted p-6 text-center">
                <p className="text-muted-foreground">
                  {widget.dataSource ? (
                    <>This widget will display data from <code className="text-xs bg-background px-1 py-0.5 rounded">{widget.dataSource}</code></>
                  ) : (
                    "This feature is under development."
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Check back soon for updates!
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
