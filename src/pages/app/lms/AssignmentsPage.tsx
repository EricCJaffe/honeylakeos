import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Plus,
  BookOpen,
  GraduationCap,
  FileText,
  AlertTriangle,
  Star,
  Users,
  User,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLmsAssignmentsWithStatus } from "@/hooks/useLmsReporting";
import { useLmsPermissions } from "@/hooks/useModulePermissions";
import { getAssignableTypeLabel, getTargetTypeLabel } from "@/hooks/useLmsAssignments";
import { format } from "date-fns";

const typeIcons: Record<string, React.ElementType> = {
  learning_path: GraduationCap,
  course: BookOpen,
  lesson: FileText,
};

const typeColors: Record<string, string> = {
  learning_path: "text-primary",
  course: "text-blue-500",
  lesson: "text-emerald-500",
};

const targetIcons: Record<string, React.ElementType> = {
  user: User,
  group: Layers,
  all_members: Users,
};

export default function AssignmentsPage() {
  const { data: assignments = [], isLoading } = useLmsAssignmentsWithStatus();
  const permissions = useLmsPermissions();

  // Group assignments by status
  const activeAssignments = assignments.filter(a => !a.isOverdue);
  const overdueAssignments = assignments.filter(a => a.isOverdue);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Assignments"
        description="Manage learning assignments for users and groups"
      >
        {permissions.canCreate && (
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        )}
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Total assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter(a => a.is_required).length}
                </p>
                <p className="text-xs text-muted-foreground">Required</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description="Create assignments to track learning progress for users and groups."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Assignments</CardTitle>
            <CardDescription>Click to view learner progress</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {assignments.map((assignment, index) => {
                const TypeIcon = typeIcons[assignment.assignable_type] || FileText;
                const typeColor = typeColors[assignment.assignable_type] || "text-muted-foreground";
                const TargetIcon = targetIcons[assignment.target_type] || User;

                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Link
                      to={`/app/lms/reports/assignment/${assignment.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className={`h-5 w-5 ${typeColor}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{assignment.assignableTitle}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{getAssignableTypeLabel(assignment.assignable_type)}</span>
                          <span>•</span>
                          <TargetIcon className="h-3 w-3" />
                          <span>{getTargetTypeLabel(assignment.target_type)}</span>
                          {assignment.due_at && (
                            <>
                              <span>•</span>
                              <span>Due {format(new Date(assignment.due_at), "MMM d")}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {assignment.is_required && (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Required
                          </Badge>
                        )}
                        {assignment.isOverdue && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Note */}
      {permissions.canAdmin && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              To create new assignments, use the Reports page or assign content directly from Paths, Courses, or Lessons.
            </p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/app/lms/reports">View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
