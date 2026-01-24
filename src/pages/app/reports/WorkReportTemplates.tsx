import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Play,
  Save,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportType } from "@/hooks/useReports";

export interface WorkReportTemplate {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "tasks" | "projects";
}

export const WORK_REPORT_TEMPLATES: WorkReportTemplate[] = [
  {
    id: "tasks-by-status",
    type: "tasks_by_status",
    name: "Tasks by Status",
    description: "See how your tasks are distributed across statuses (todo, in progress, completed, etc.)",
    icon: CheckCircle2,
    category: "tasks",
  },
  {
    id: "tasks-by-assignee",
    type: "tasks_by_assignee",
    name: "Tasks by Assignee",
    description: "View task distribution and completion rates per team member",
    icon: Users,
    category: "tasks",
  },
  {
    id: "tasks-due-overdue",
    type: "tasks_due_soon",
    name: "Due Soon & Overdue",
    description: "Track tasks due in the next 7 days and overdue items",
    icon: Clock,
    category: "tasks",
  },
  {
    id: "projects-by-phase",
    type: "projects_by_phase",
    name: "Projects by Phase",
    description: "Analyze project distribution across phases and track progress",
    icon: FolderKanban,
    category: "projects",
  },
];

interface WorkReportTemplateCardProps {
  template: WorkReportTemplate;
  onRun: () => void;
  onSave: () => void;
}

export function WorkReportTemplateCard({ template, onRun, onSave }: WorkReportTemplateCardProps) {
  const Icon = template.icon;
  
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs capitalize">
                {template.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {template.description}
        </CardDescription>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onRun} className="gap-1">
            <Play className="h-3 w-3" />
            Run Now
          </Button>
          <Button size="sm" variant="outline" onClick={onSave} className="gap-1">
            <Save className="h-3 w-3" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
