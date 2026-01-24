import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  Circle,
  Play,
  ChevronRight,
  Clock,
  Download,
  Image
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLmsCourse, getStatusColor, getStatusLabel } from "@/hooks/useLmsCourses";
import { useCourseLessonsProgress, useLmsProgressMutations, getProgressStatusLabel, getProgressStatusColor, LmsProgressStatus } from "@/hooks/useLmsProgress";
import { cn } from "@/lib/utils";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading: courseLoading } = useLmsCourse(courseId);
  const { data: lessonsData, isLoading: lessonsLoading } = useCourseLessonsProgress(courseId);
  const { startLearning } = useLmsProgressMutations();

  const isLoading = courseLoading || lessonsLoading;

  // Calculate progress
  const completedLessons = lessonsData?.progress.filter(p => p.status === "completed").length || 0;
  const totalLessons = lessonsData?.lessons.length || 0;
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Find next incomplete lesson
  const getNextLesson = () => {
    if (!lessonsData) return null;
    const completedIds = new Set(lessonsData.progress.filter(p => p.status === "completed").map(p => p.entity_id));
    return lessonsData.lessons.find(l => !completedIds.has(l.lesson_id));
  };
  
  const nextLesson = getNextLesson();

  const getLessonStatus = (lessonId: string): LmsProgressStatus | null => {
    const progress = lessonsData?.progress.find(p => p.entity_id === lessonId);
    return progress?.status as LmsProgressStatus || null;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={BookOpen}
          title="Course not found"
          description="This course may have been deleted or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title={course.title}
        backHref="/app/lms/courses"
      >
        <Badge className={getStatusColor(course.status)}>
          {getStatusLabel(course.status)}
        </Badge>
      </PageHeader>

      {/* Hero Card with Cover */}
      <Card className="overflow-hidden">
        {course.cover_image_url && (
          <div className="w-full h-48 bg-muted relative">
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className={cn("pt-6", !course.cover_image_url && "pt-6")}>
          <div className="space-y-4">
            {course.description && (
              <p className="text-muted-foreground">{course.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-4">
              {course.estimated_hours && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{course.estimated_hours}h estimated</span>
                </div>
              )}
              
              {course.syllabus_asset_path && (
                <Button variant="outline" size="sm" asChild>
                  <a href={course.syllabus_asset_path} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download Syllabus
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Course Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedLessons} of {totalLessons} lessons
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            
            {nextLesson && (
              <Button asChild>
                <Link to={`/app/lms/lessons/${nextLesson.lesson_id}`}>
                  <Play className="h-4 w-4 mr-2" />
                  {completedLessons === 0 ? "Start Learning" : "Continue"}
                </Link>
              </Button>
            )}
            
            {!nextLesson && totalLessons > 0 && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Course Complete
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lessons List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lessons</CardTitle>
          <CardDescription>Complete lessons in order to finish the course</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {lessonsData?.lessons.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={FileText}
                title="No lessons yet"
                description="Lessons will be added to this course soon."
              />
            </div>
          ) : (
            <div className="divide-y">
              {lessonsData?.lessons.map((item, index) => {
                const lesson = item.lesson as any;
                const status = getLessonStatus(item.lesson_id);
                const isCompleted = status === "completed";
                const isNext = nextLesson?.lesson_id === item.lesson_id;
                
                return (
                  <Link
                    key={item.lesson_id}
                    to={`/app/lms/lessons/${item.lesson_id}`}
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
                        {lesson?.title || "Untitled Lesson"}
                      </h4>
                      {lesson?.estimated_minutes && (
                        <p className="text-sm text-muted-foreground">{lesson.estimated_minutes} min</p>
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
