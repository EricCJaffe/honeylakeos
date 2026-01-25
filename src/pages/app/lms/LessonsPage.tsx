import * as React from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Eye,
  Send,
  Video,
  Link as LinkIcon,
  Type
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLmsLessons, useLmsLessonMutations, getLessonStatusLabel, getLessonStatusColor, getContentTypeLabel, LessonStatus, ContentType } from "@/hooks/useLmsLessons";
import { useLmsPermissions } from "@/hooks/useModulePermissions";
import { LessonFormDialog } from "./LessonFormDialog";

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  youtube: Video,
  file_asset: FileText,
  external_link: LinkIcon,
  rich_text: Type,
};

export default function LessonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LessonStatus | "all">("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "1");
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  
  const permissions = useLmsPermissions();
  const { data: lessons = [], isLoading } = useLmsLessons({ 
    status: statusFilter, 
    content_type: contentTypeFilter,
    search: search || undefined 
  });
  const { archiveLesson, deleteLesson, publishLesson } = useLmsLessonMutations();

  const handleOpenNew = () => {
    setEditingLesson(null);
    setDialogOpen(true);
    setSearchParams({});
  };

  const handleEdit = (lessonId: string) => {
    setEditingLesson(lessonId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingLesson(null);
    setSearchParams({});
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title="Lessons" 
        description="Create and manage individual learning content"
      >
        {permissions.canCreate && (
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Lesson
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LessonStatus | "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={contentTypeFilter} onValueChange={(v) => setContentTypeFilter(v as ContentType | "all")}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="file_asset">File/PDF</SelectItem>
            <SelectItem value="external_link">External Link</SelectItem>
            <SelectItem value="rich_text">Rich Text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lesson Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No lessons yet"
          description="Create your first lesson to start building your learning content."
          actionLabel={permissions.canCreate ? "Create Lesson" : undefined}
          onAction={permissions.canCreate ? handleOpenNew : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.map((lesson, index) => {
            const ContentIcon = contentTypeIcons[lesson.content_type];
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ContentIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <CardTitle className="text-base truncate">{lesson.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getLessonStatusColor(lesson.status)}>
                            {getLessonStatusLabel(lesson.status)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getContentTypeLabel(lesson.content_type)}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/app/lms/lessons/${lesson.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          {permissions.canEdit && (
                            <DropdownMenuItem onClick={() => handleEdit(lesson.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {permissions.canPublish && lesson.status === "draft" && (
                            <DropdownMenuItem onClick={() => publishLesson.mutate(lesson.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {permissions.canArchive && lesson.status !== "archived" && (
                            <DropdownMenuItem onClick={() => archiveLesson.mutate(lesson.id)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <DropdownMenuItem 
                              onClick={() => deleteLesson.mutate(lesson.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-2">
                      {lesson.description || "No description"}
                    </CardDescription>
                    {lesson.estimated_minutes && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {lesson.estimated_minutes} min
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <LessonFormDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        lessonId={editingLesson}
      />
    </div>
  );
}
