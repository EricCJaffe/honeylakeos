import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  ChevronRight
} from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useMyAssignments, getAssignableTypeLabel } from "@/hooks/useLmsAssignments";
import { useMyLmsProgress, getProgressStatusLabel, getProgressStatusColor, LmsProgressStatus } from "@/hooks/useLmsProgress";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  learning_path: GraduationCap,
  course: BookOpen,
  lesson: FileText,
};

const typeColors: Record<string, string> = {
  learning_path: "bg-primary/10 text-primary",
  course: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  lesson: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function MyLearningPage() {
  const { data: assignments = [], isLoading: assignmentsLoading } = useMyAssignments();
  const { data: allProgress = [], isLoading: progressLoading } = useMyLmsProgress();

  const isLoading = assignmentsLoading || progressLoading;

  // Build a map of entity progress
  const progressMap = React.useMemo(() => {
    const map = new Map<string, LmsProgressStatus>();
    allProgress.forEach(p => {
      map.set(`${p.entity_type}:${p.entity_id}`, p.status as LmsProgressStatus);
    });
    return map;
  }, [allProgress]);

  // Sort assignments: required + overdue first, then required + upcoming, then optional
  const sortedAssignments = React.useMemo(() => {
    return [...assignments].sort((a, b) => {
      const aProgress = progressMap.get(`${a.assignable_type}:${a.assignable_id}`);
      const bProgress = progressMap.get(`${b.assignable_type}:${b.assignable_id}`);
      
      // Completed items last
      if (aProgress === "completed" && bProgress !== "completed") return 1;
      if (bProgress === "completed" && aProgress !== "completed") return -1;
      
      // Required first
      if (a.is_required && !b.is_required) return -1;
      if (!a.is_required && b.is_required) return 1;
      
      // Overdue first within required
      const aOverdue = a.due_at && isPast(parseISO(a.due_at));
      const bOverdue = b.due_at && isPast(parseISO(b.due_at));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // By due date
      if (a.due_at && b.due_at) {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      }
      if (a.due_at && !b.due_at) return -1;
      if (!a.due_at && b.due_at) return 1;
      
      return 0;
    });
  }, [assignments, progressMap]);

  const getItemLink = (type: string, id: string) => {
    switch (type) {
      case "learning_path": return `/app/lms/paths/${id}`;
      case "course": return `/app/lms/courses/${id}`;
      case "lesson": return `/app/lms/lessons/${id}`;
      default: return `/app/lms`;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title="My Learning" 
        description="Your assigned learning content and progress"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Assigned items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter(a => {
                    const status = progressMap.get(`${a.assignable_type}:${a.assignable_id}`);
                    return status === "in_progress";
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter(a => {
                    const status = progressMap.get(`${a.assignable_type}:${a.assignable_id}`);
                    return status === "completed";
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedAssignments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No assignments yet"
          description="Learning content assigned to you will appear here."
        />
      ) : (
        <div className="space-y-3">
          {sortedAssignments.map((assignment, index) => {
            const Icon = typeIcons[assignment.assignable_type] || FileText;
            const colorClass = typeColors[assignment.assignable_type] || "bg-muted text-muted-foreground";
            const status = progressMap.get(`${assignment.assignable_type}:${assignment.assignable_id}`);
            const isCompleted = status === "completed";
            const isOverdue = assignment.due_at && isPast(parseISO(assignment.due_at)) && !isCompleted;
            const isDueToday = assignment.due_at && isToday(parseISO(assignment.due_at));

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link to={getItemLink(assignment.assignable_type, assignment.assignable_id)}>
                  <Card className={cn(
                    "hover:shadow-md transition-all group cursor-pointer",
                    isCompleted && "opacity-60"
                  )}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : (
                            <Icon className="h-6 w-6" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={cn(
                              "font-medium truncate",
                              isCompleted && "line-through text-muted-foreground"
                            )}>
                              {assignment.assignable?.title || "Untitled"}
                            </h3>
                            {assignment.is_required && (
                              <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400">
                                <Star className="h-3 w-3 mr-1" />
                                Required
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{getAssignableTypeLabel(assignment.assignable_type)}</span>
                            
                            {assignment.assignable?.estimated_hours && (
                              <span>{assignment.assignable.estimated_hours}h</span>
                            )}
                            {assignment.assignable?.estimated_minutes && (
                              <span>{assignment.assignable.estimated_minutes} min</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={getProgressStatusColor(status || null)}>
                              {getProgressStatusLabel(status || null)}
                            </Badge>
                            
                            {isOverdue && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Overdue
                              </Badge>
                            )}
                            
                            {isDueToday && !isOverdue && (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                <Clock className="h-3 w-3 mr-1" />
                                Due today
                              </Badge>
                            )}
                            
                            {assignment.due_at && !isOverdue && !isDueToday && (
                              <span className="text-xs text-muted-foreground">
                                Due {format(parseISO(assignment.due_at), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!isCompleted && (
                            <Button size="sm" variant="ghost" className="gap-1">
                              {status === "in_progress" ? "Continue" : "Start"}
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
