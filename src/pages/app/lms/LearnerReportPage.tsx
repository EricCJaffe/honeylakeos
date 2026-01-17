import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  FileText,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import { useUserLmsProgress } from "@/hooks/useLmsReporting";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { format } from "date-fns";

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </Badge>
    );
  }

  if (status === "completed") {
    return (
      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    );
  }

  if (status === "in_progress") {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1">
        <Clock className="h-3 w-3" />
        In Progress
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">Not Started</Badge>
  );
}

function LearnerReportContent() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { data: progressItems = [], isLoading: progressLoading } = useUserLmsProgress(userId);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const isLoading = progressLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={User}
          title="Learner Not Found"
          description="This user doesn't exist or you don't have access."
          actionLabel="Back to Reports"
          onAction={() => navigate("/app/lms/reports")}
        />
      </div>
    );
  }

  // Calculate stats
  const completedCount = progressItems.filter(i => i.status === "completed").length;
  const inProgressCount = progressItems.filter(i => i.status === "in_progress").length;
  const requiredCount = progressItems.filter(i => i.isRequired).length;
  const requiredCompletedCount = progressItems.filter(i => i.isRequired && i.status === "completed").length;
  const overdueCount = progressItems.filter(i => i.isOverdue).length;

  const overallProgress = progressItems.length > 0
    ? Math.round((completedCount / progressItems.length) * 100)
    : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "learning_path":
        return <GraduationCap className="h-4 w-4 text-primary" />;
      case "course":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "lesson":
        return <FileText className="h-4 w-4 text-emerald-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "learning_path":
        return "Path";
      case "course":
        return "Course";
      case "lesson":
        return "Lesson";
      default:
        return type;
    }
  };

  const getDetailLink = (type: string, id: string) => {
    switch (type) {
      case "learning_path":
        return `/app/lms/paths/${id}`;
      case "course":
        return `/app/lms/courses/${id}`;
      case "lesson":
        return `/app/lms/lessons/${id}`;
      default:
        return "#";
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/lms/reports")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Reports
      </Button>

      <PageHeader
        title="Learner Progress"
        description="Individual learning activity and completion status"
      />

      {/* Learner Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{profile.full_name || "Unknown"}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{completedCount} of {progressItems.length} completed</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completedCount}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {inProgressCount}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {requiredCompletedCount}/{requiredCount}
              </div>
              <div className="text-xs text-muted-foreground">Required Done</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {overdueCount}
              </div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Learning</CardTitle>
          <CardDescription>All paths, courses, and lessons assigned to this learner</CardDescription>
        </CardHeader>
        <CardContent>
          {progressItems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No learning content assigned yet
            </p>
          ) : (
            <div className="space-y-2">
              {progressItems.map((item) => (
                <Link
                  key={`${item.entityType}-${item.entityId}`}
                  to={getDetailLink(item.entityType, item.entityId)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(item.entityType)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item.entityTitle}</p>
                        {item.isRequired && (
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getTypeLabel(item.entityType)}
                        {item.dueAt && ` • Due ${format(new Date(item.dueAt), "MMM d")}`}
                        {item.completedAt && ` • Completed ${format(new Date(item.completedAt), "MMM d")}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={item.status} isOverdue={item.isOverdue} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LearnerReportPage() {
  return (
    <ModuleGuard moduleKey="lms" moduleName="LMS">
      <LearnerReportContent />
    </ModuleGuard>
  );
}
