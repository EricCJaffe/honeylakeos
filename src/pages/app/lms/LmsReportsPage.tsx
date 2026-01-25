import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  FileText,
  ClipboardList,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import { useLmsOverviewStats, useLmsAssignmentsWithStatus } from "@/hooks/useLmsReporting";
import { useLmsPermissions } from "@/hooks/useModulePermissions";
import { format } from "date-fns";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "text-muted-foreground",
  loading,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <CardTitle className="text-2xl">
          {loading ? <Skeleton className="h-8 w-16" /> : value}
        </CardTitle>
      </CardHeader>
      {subtitle && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </CardContent>
      )}
    </Card>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} ({percent}%)</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

function LmsReportsContent() {
  const { data: stats, isLoading: statsLoading } = useLmsOverviewStats();
  const { data: assignments = [], isLoading: assignmentsLoading } = useLmsAssignmentsWithStatus();
  const permissions = useLmsPermissions();

  // If user doesn't have admin access, show access denied
  if (!permissions.canAdmin && !permissions.loading) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive/60 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              LMS reports require admin permissions to view.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentAssignments = assignments.slice(0, 10);
  const overdueCount = assignments.filter(a => a.isOverdue).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="LMS Reports"
        description="Overview of learning content and progress"
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Learning Paths"
          value={stats?.publishedPaths ?? 0}
          subtitle={`${stats?.totalPaths ?? 0} total`}
          icon={GraduationCap}
          color="text-primary"
          loading={statsLoading}
        />
        <StatCard
          title="Courses"
          value={stats?.publishedCourses ?? 0}
          subtitle={`${stats?.totalCourses ?? 0} total`}
          icon={BookOpen}
          color="text-blue-500"
          loading={statsLoading}
        />
        <StatCard
          title="Lessons"
          value={stats?.publishedLessons ?? 0}
          subtitle={`${stats?.totalLessons ?? 0} total`}
          icon={FileText}
          color="text-emerald-500"
          loading={statsLoading}
        />
        <StatCard
          title="Active Assignments"
          value={stats?.activeAssignments ?? 0}
          subtitle={`${stats?.overdueAssignments ?? 0} overdue`}
          icon={ClipboardList}
          color={stats?.overdueAssignments ? "text-destructive" : "text-amber-500"}
          loading={statsLoading}
        />
      </div>

      {/* Progress Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Learner Progress Distribution
            </CardTitle>
            <CardDescription>
              Status of {stats?.learnerProgress.total ?? 0} learners with any activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsLoading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </>
            ) : (
              <>
                <ProgressBar
                  label="Completed"
                  value={stats?.learnerProgress.completed ?? 0}
                  total={stats?.learnerProgress.total ?? 0}
                  color="bg-green-500"
                />
                <ProgressBar
                  label="In Progress"
                  value={stats?.learnerProgress.inProgress ?? 0}
                  total={stats?.learnerProgress.total ?? 0}
                  color="bg-blue-500"
                />
                <ProgressBar
                  label="Not Started"
                  value={stats?.learnerProgress.notStarted ?? 0}
                  total={stats?.learnerProgress.total ?? 0}
                  color="bg-muted"
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">
                  {stats?.publishedPaths ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Published Paths</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.publishedCourses ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Published Courses</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats?.publishedLessons ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Published Lessons</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {overdueCount}
                </div>
                <div className="text-xs text-muted-foreground">Overdue Assignments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Recent Assignments
            </CardTitle>
            <CardDescription>Click an assignment to view learner progress</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/lms/assignments">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentAssignments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No assignments yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  to={`/app/lms/reports/assignment/${assignment.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-3">
                    {assignment.assignable_type === "learning_path" && (
                      <GraduationCap className="h-4 w-4 text-primary" />
                    )}
                    {assignment.assignable_type === "course" && (
                      <BookOpen className="h-4 w-4 text-blue-500" />
                    )}
                    {assignment.assignable_type === "lesson" && (
                      <FileText className="h-4 w-4 text-emerald-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{assignment.assignableTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.target_type === "all_members"
                          ? "All Members"
                          : assignment.target_type === "group"
                          ? "Group"
                          : "Individual"}
                        {assignment.due_at && ` • Due ${format(new Date(assignment.due_at), "MMM d")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.is_required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                    {assignment.isOverdue && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LmsReportsPage() {
  return (
    <ModuleGuard moduleKey="lms" moduleName="LMS">
      <LmsReportsContent />
    </ModuleGuard>
  );
}
