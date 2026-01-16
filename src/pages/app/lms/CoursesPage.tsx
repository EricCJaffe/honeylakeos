import * as React from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Eye,
  Send
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
import { useLmsCourses, useLmsCourseMutations, getStatusLabel, getStatusColor, CourseStatus, Visibility } from "@/hooks/useLmsCourses";
import { useLmsPermissions } from "@/hooks/useModulePermissions";
import { CourseFormDialog } from "./CourseFormDialog";

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "1");
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  
  const permissions = useLmsPermissions();
  const { data: courses = [], isLoading } = useLmsCourses({ 
    status: statusFilter, 
    search: search || undefined 
  });
  const { archiveCourse, deleteCourse, publishCourse } = useLmsCourseMutations();

  const handleOpenNew = () => {
    setEditingCourse(null);
    setDialogOpen(true);
    setSearchParams({});
  };

  const handleEdit = (courseId: string) => {
    setEditingCourse(courseId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setSearchParams({});
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title="Courses" 
        description="Create and manage courses with lessons"
      >
        {permissions.canCreate && (
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Course
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CourseStatus | "all")}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to start building your learning content."
          actionLabel={permissions.canCreate ? "Create Course" : undefined}
          onAction={permissions.canCreate ? handleOpenNew : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{course.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(course.status)}>
                          {getStatusLabel(course.status)}
                        </Badge>
                        {course.estimated_hours && (
                          <span className="text-xs text-muted-foreground">
                            {course.estimated_hours}h
                          </span>
                        )}
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
                          <Link to={`/app/lms/courses/${course.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {permissions.canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(course.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {permissions.canPublish && course.status === "draft" && (
                          <DropdownMenuItem onClick={() => publishCourse.mutate(course.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {permissions.canArchive && course.status !== "archived" && (
                          <DropdownMenuItem onClick={() => archiveCourse.mutate(course.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {permissions.canDelete && (
                          <DropdownMenuItem 
                            onClick={() => deleteCourse.mutate(course.id)}
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
                    {course.description || "No description"}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CourseFormDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        courseId={editingCourse}
      />
    </div>
  );
}
