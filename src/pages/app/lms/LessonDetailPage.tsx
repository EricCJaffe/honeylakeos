import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  FileText, 
  CheckCircle2, 
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Video,
  Type
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLmsLesson, getLessonStatusColor, getLessonStatusLabel } from "@/hooks/useLmsLessons";
import { useLmsEntityProgress, useLmsProgressMutations, getProgressStatusLabel, getProgressStatusColor } from "@/hooks/useLmsProgress";
import { cn } from "@/lib/utils";

// Lazy load rich text display
const RichTextDisplay = React.lazy(() => import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay })));

export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { data: lesson, isLoading } = useLmsLesson(lessonId);
  const { data: progress } = useLmsEntityProgress("lesson", lessonId);
  const { markComplete, markIncomplete, startLearning } = useLmsProgressMutations();

  const isCompleted = progress?.status === "completed";

  // Mark as started on view
  React.useEffect(() => {
    if (lesson && !progress && lessonId) {
      startLearning.mutate({ entityType: "lesson", entityId: lessonId });
    }
  }, [lesson, progress, lessonId]);

  const handleToggleComplete = () => {
    if (!lessonId) return;
    if (isCompleted) {
      markIncomplete.mutate({ entityType: "lesson", entityId: lessonId });
    } else {
      markComplete.mutate({ entityType: "lesson", entityId: lessonId });
    }
  };

  // Convert YouTube URL to embed URL
  const getYouTubeEmbedUrl = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    }
    return url;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video w-full" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={FileText}
          title="Lesson not found"
          description="This lesson may have been deleted or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title={lesson.title}
        backHref="/app/lms/lessons"
      >
        <div className="flex items-center gap-2">
          <Badge className={getLessonStatusColor(lesson.status)}>
            {getLessonStatusLabel(lesson.status)}
          </Badge>
          {lesson.estimated_minutes && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {lesson.estimated_minutes} min
            </span>
          )}
        </div>
      </PageHeader>

      {/* Content Area */}
      <Card>
        <CardContent className="p-0">
          {lesson.content_type === "youtube" && lesson.youtube_url && (
            <div className="aspect-video w-full">
              <iframe
                src={getYouTubeEmbedUrl(lesson.youtube_url) || ""}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          
          {lesson.content_type === "file_asset" && lesson.file_asset_path && (
            <div className="p-6">
              <Button asChild variant="outline" className="gap-2">
                <a href={lesson.file_asset_path} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View Document
                </a>
              </Button>
            </div>
          )}
          
          {lesson.content_type === "external_link" && lesson.external_url && (
            <div className="p-6">
              <Button asChild variant="outline" className="gap-2">
                <a href={lesson.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open External Content
                </a>
              </Button>
            </div>
          )}
          
          {lesson.content_type === "rich_text" && lesson.rich_text_body && (
            <div className="p-6 prose dark:prose-invert max-w-none">
              <React.Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <RichTextDisplay content={lesson.rich_text_body} />
              </React.Suspense>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {lesson.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About this lesson</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{lesson.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Completion Controls */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={getProgressStatusColor(progress?.status || null)}>
                {getProgressStatusLabel(progress?.status || null)}
              </Badge>
              {isCompleted && (
                <span className="text-sm text-muted-foreground">
                  Great job completing this lesson!
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleToggleComplete}
              variant={isCompleted ? "outline" : "default"}
              className="gap-2"
              disabled={markComplete.isPending || markIncomplete.isPending}
            >
              {isCompleted ? (
                <>Mark Incomplete</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Complete
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
