import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import { useAssignmentLearnerProgress } from "@/hooks/useLmsReporting";
import { getAssignableTypeLabel, getTargetTypeLabel } from "@/hooks/useLmsAssignments";
import { getProgressStatusLabel, getProgressStatusColor } from "@/hooks/useLmsProgress";
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

function AssignmentReportContent() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAssignmentLearnerProgress(assignmentId);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.assignment) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={AlertTriangle}
          title="Assignment Not Found"
          description="This assignment doesn't exist or you don't have access."
          actionLabel="Back to Reports"
          onAction={() => navigate("/app/lms/reports")}
        />
      </div>
    );
  }

  const { assignment, learners } = data;

  // Calculate summary stats
  const completedCount = learners.filter(l => l.status === "completed").length;
  const inProgressCount = learners.filter(l => l.status === "in_progress").length;
  const notStartedCount = learners.filter(l => l.status === "not_started").length;
  const overdueCount = learners.filter(l => l.isOverdue).length;

  const getTypeIcon = () => {
    switch (assignment.assignable_type) {
      case "learning_path":
        return <GraduationCap className="h-5 w-5 text-primary" />;
      case "course":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "lesson":
        return <FileText className="h-5 w-5 text-emerald-500" />;
      default:
        return null;
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
        title="Assignment Report"
        description="View learner progress for this assignment"
      />

      {/* Assignment Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <div>
              <CardTitle className="text-lg">
                {getAssignableTypeLabel(assignment.assignable_type)}
              </CardTitle>
              <CardDescription>
                Assigned to: {getTargetTypeLabel(assignment.target_type)}
                {assignment.due_at && ` • Due: ${format(new Date(assignment.due_at), "PPP")}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{learners.length} learners</span>
            </div>
            {assignment.is_required && (
              <Badge variant="outline">Required</Badge>
            )}
            {overdueCount > 0 && (
              <Badge variant="destructive">{overdueCount} overdue</Badge>
            )}
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
              <div className="text-2xl font-bold text-muted-foreground">
                {notStartedCount}
              </div>
              <div className="text-xs text-muted-foreground">Not Started</div>
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

      {/* Learner Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learner Progress</CardTitle>
          <CardDescription>
            {completedCount} of {learners.length} learners completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learners.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No learners assigned yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.map((learner) => (
                  <TableRow key={learner.userId}>
                    <TableCell>
                      <Link
                        to={`/app/lms/reports/learner/${learner.userId}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{learner.userName}</p>
                          <p className="text-xs text-muted-foreground">{learner.userEmail}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={learner.status} isOverdue={learner.isOverdue} />
                    </TableCell>
                    <TableCell>
                      {learner.completedAt
                        ? format(new Date(learner.completedAt), "PPp")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AssignmentReportPage() {
  return (
    <ModuleGuard moduleKey="lms" moduleName="LMS">
      <AssignmentReportContent />
    </ModuleGuard>
  );
}
