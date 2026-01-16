import * as React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  GraduationCap, 
  FileText, 
  ClipboardList,
  Plus,
  ChevronRight,
  Library
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useLmsCourses } from "@/hooks/useLmsCourses";
import { useLmsLearningPaths } from "@/hooks/useLmsLearningPaths";
import { useLmsLessons } from "@/hooks/useLmsLessons";
import { useLmsPermissions } from "@/hooks/useModulePermissions";

const quickLinks = [
  {
    title: "Learning Paths",
    description: "Structured sequences of courses",
    icon: GraduationCap,
    href: "/app/lms/paths",
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Courses",
    description: "Collections of lessons",
    icon: BookOpen,
    href: "/app/lms/courses",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Lessons",
    description: "Individual learning content",
    icon: FileText,
    href: "/app/lms/lessons",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Assignments",
    description: "Track assigned learning",
    icon: ClipboardList,
    href: "/app/lms/assignments",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

export default function LmsPage() {
  const { data: courses = [], isLoading: coursesLoading } = useLmsCourses({ status: "all" });
  const { data: paths = [], isLoading: pathsLoading } = useLmsLearningPaths({ status: "all" });
  const { data: lessons = [], isLoading: lessonsLoading } = useLmsLessons({ status: "all" });
  const permissions = useLmsPermissions();

  const publishedCourses = courses.filter(c => c.status === "published");
  const publishedPaths = paths.filter(p => p.status === "published");
  const publishedLessons = lessons.filter(l => l.status === "published");

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeader 
        title="Learning Management" 
        description="Create and manage learning content for your organization"
      />

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link, index) => (
          <motion.div
            key={link.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={link.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg ${link.color} flex items-center justify-center mb-2`}>
                    <link.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {link.title}
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learning Paths</CardDescription>
            <CardTitle className="text-2xl">
              {pathsLoading ? "..." : publishedPaths.length}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                published
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {pathsLoading ? "..." : paths.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Courses</CardDescription>
            <CardTitle className="text-2xl">
              {coursesLoading ? "..." : publishedCourses.length}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                published
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {coursesLoading ? "..." : courses.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lessons</CardDescription>
            <CardTitle className="text-2xl">
              {lessonsLoading ? "..." : publishedLessons.length}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                published
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {lessonsLoading ? "..." : lessons.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {permissions.canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Create new learning content</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/app/lms/paths?new=1">
                <Plus className="h-4 w-4 mr-2" />
                New Learning Path
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/lms/courses?new=1">
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/lms/lessons?new=1">
                <Plus className="h-4 w-4 mr-2" />
                New Lesson
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses yet</p>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <Link 
                    key={course.id} 
                    to={`/app/lms/courses/${course.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{course.title}</span>
                    </div>
                    <Badge variant={course.status === "published" ? "default" : "secondary"}>
                      {course.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            {lessonsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons yet</p>
            ) : (
              <div className="space-y-3">
                {lessons.slice(0, 5).map((lesson) => (
                  <Link 
                    key={lesson.id} 
                    to={`/app/lms/lessons/${lesson.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{lesson.title}</span>
                    </div>
                    <Badge variant={lesson.status === "published" ? "default" : "secondary"}>
                      {lesson.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
