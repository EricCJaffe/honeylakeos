import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Circle,
  Play,
  ChevronRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLmsLearningPath, getPathStatusColor, getPathStatusLabel } from "@/hooks/useLmsLearningPaths";
import { usePathCoursesProgress, useLmsProgressMutations, getProgressStatusLabel, getProgressStatusColor, LmsProgressStatus } from "@/hooks/useLmsProgress";
import { cn } from "@/lib/utils";

export default function PathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const { data: path, isLoading: pathLoading } = useLmsLearningPath(pathId);
  const { data: coursesData, isLoading: coursesLoading } = usePathCoursesProgress(pathId);
  const { startLearning } = useLmsProgressMutations();

  const isLoading = pathLoading || coursesLoading;

  // Calculate progress
  const completedCourses = coursesData?.progress.filter(p => p.status === "completed").length || 0;
  const totalCourses = coursesData?.courses.length || 0;
  const progressPercent = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

  // Find next incomplete course
  const getNextCourse = () => {
    if (!coursesData) return null;
    const completedIds = new Set(coursesData.progress.filter(p => p.status === "completed").map(p => p.entity_id));
    return coursesData.courses.find(c => !completedIds.has(c.course_id));
  };
  
  const nextCourse = getNextCourse();

  const getCourseStatus = (courseId: string): LmsProgressStatus | null => {
    const progress = coursesData?.progress.find(p => p.entity_id === courseId);
    return progress?.status as LmsProgressStatus || null;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={GraduationCap}
          title="Learning path not found"
          description="This learning path may have been deleted or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title={path.title}
        description={path.description || undefined}
        backHref="/app/lms/paths"
      >
        <Badge className={getPathStatusColor(path.status)}>
          {getPathStatusLabel(path.status)}
        </Badge>
      </PageHeader>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Path Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedCourses} of {totalCourses} courses
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            
            {path.estimated_hours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{path.estimated_hours}h estimated</span>
              </div>
            )}
            
            {nextCourse && (
              <Button asChild>
                <Link to={`/app/lms/courses/${nextCourse.course_id}`}>
                  <Play className="h-4 w-4 mr-2" />
                  Continue Learning
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Courses in this Path</CardTitle>
          <CardDescription>Complete courses in order to finish the learning path</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {coursesData?.courses.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Courses will be added to this learning path soon."
              />
            </div>
          ) : (
            <div className="divide-y">
              {coursesData?.courses.map((item, index) => {
                const course = item.course as any;
                const status = getCourseStatus(item.course_id);
                const isCompleted = status === "completed";
                const isNext = nextCourse?.course_id === item.course_id;
                
                return (
                  <Link
                    key={item.course_id}
                    to={`/app/lms/courses/${item.course_id}`}
                    className={cn(
                      "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group",
                      isCompleted && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                      isCompleted 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : isNext
                          ? "border-primary text-primary"
                          : "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "font-medium",
                        isCompleted && "line-through text-muted-foreground"
                      )}>
                        {course?.title || "Untitled Course"}
                      </h4>
                      {course?.estimated_hours && (
                        <p className="text-sm text-muted-foreground">{course.estimated_hours}h</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getProgressStatusColor(status)}>
                        {getProgressStatusLabel(status)}
                      </Badge>
                      {isNext && (
                        <Badge variant="outline" className="text-primary border-primary">
                          Up Next
                        </Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
