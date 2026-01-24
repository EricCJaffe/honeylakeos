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
} from "lucide-react";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  children?: React.ReactNode;
}

const WIDGET_ICONS: Record<string, React.ReactNode> = {
  active_engagements: <Users className="h-5 w-5" />,
  coach_performance: <TrendingUp className="h-5 w-5" />,
  org_health_trends: <Heart className="h-5 w-5" />,
  workflow_templates: <Workflow className="h-5 w-5" />,
  coaches_overview: <Users className="h-5 w-5" />,
  engagement_status: <CheckCircle2 className="h-5 w-5" />,
  overdue_workflows: <Clock className="h-5 w-5" />,
  team_meetings: <Calendar className="h-5 w-5" />,
  upcoming_meetings: <Calendar className="h-5 w-5" />,
  my_upcoming_meetings: <Calendar className="h-5 w-5" />,
  client_goals: <Target className="h-5 w-5" />,
  goals_progress: <Target className="h-5 w-5" />,
  prep_required: <FileText className="h-5 w-5" />,
  active_plans: <FileText className="h-5 w-5" />,
  my_plans: <FileText className="h-5 w-5" />,
  health_trends: <Heart className="h-5 w-5" />,
};

export function DashboardWidgetCard({ widget, children }: DashboardWidgetCardProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const title = humanizeWidgetKey(widget.widgetKey);
  const config = widget.configJson || {};
  const isComingSoon = config.comingSoon === true;
  
  // Determine route: config.route takes precedence, then data source mapping
  const route = config.route || getDataSourceRoute(widget.dataSource);
  const hasRoute = !!route && !isComingSoon;

  const icon = WIDGET_ICONS[widget.widgetKey] || <Settings className="h-5 w-5" />;

  const handleCardClick = () => {
    if (isComingSoon) {
      setShowPreviewModal(true);
    }
  };

  return (
    <>
      <Card 
        className={`transition-all ${isComingSoon ? "opacity-75 cursor-pointer hover:opacity-100" : ""} ${hasRoute ? "hover:shadow-md" : ""}`}
        onClick={isComingSoon ? handleCardClick : undefined}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
            <DialogDescription>
              {config.modalContent || widget.description || "This feature is coming soon."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted p-6 text-center">
              <p className="text-muted-foreground">
                This widget will display data from <code className="text-xs bg-background px-1 py-0.5 rounded">{widget.dataSource || "N/A"}</code>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back soon for updates!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
