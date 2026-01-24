import * as React from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Globe, 
  Workflow, 
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Pin,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { supabase } from "@/integrations/supabase/client";
import { getDeferredTasksCount } from "./admin/DeferredTasksPage";
import { TaskFormDialog } from "./tasks/TaskFormDialog";

const modules = [
  { icon: LayoutDashboard, name: "Projects", href: "/app/projects", description: "Manage your projects" },
  { icon: CheckCircle2, name: "Tasks", href: "/app/tasks", description: "Track your tasks" },
  { icon: Calendar, name: "Calendar", href: "/app/calendar", description: "View your schedule" },
  { icon: FileText, name: "Documents", href: "/app/documents", description: "Organize files" },
  { icon: MessageSquare, name: "Notes", href: "/app/notes", description: "Capture ideas" },
  { icon: Globe, name: "Forms", href: "/app/forms", description: "Build forms" },
  { icon: Workflow, name: "Workflows", href: "/app/workflows", description: "Automate processes" },
  { icon: BookOpen, name: "LMS", href: "/app/lms", description: "Learning management" },
];

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
};

// Helper function to fetch dashboard tasks
async function fetchDashboardTasks(companyId: string, userId: string): Promise<Task[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  
  const { data, error } = await client
    .from("tasks")
    .select("id, title, status, priority, due_date, is_pinned, pinned_at")
    .eq("company_id", companyId)
    .eq("assigned_to_user_id", userId)
    .neq("status", "archived")
    .limit(50);
  
  if (error) throw error;
  
  // Filter and sort client-side
  const filtered = ((data ?? []) as Task[]).filter(t => 
    ["to_do", "in_progress", "blocked"].includes(t.status)
  );
  
  return filtered.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (a.is_pinned && b.is_pinned) {
      const aTime = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
      const bTime = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
      return bTime - aTime;
    }
    const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return aDate - bDate;
  });
}

function TaskRow({ 
  task, 
  category, 
  onClick 
}: { 
  task: Task; 
  category: "pinned" | "past_due" | "due_today"; 
  onClick: () => void;
}) {
  const categoryConfig = {
    pinned: { icon: Pin, color: "text-primary", bgColor: "bg-primary/10" },
    past_due: { icon: Clock, color: "text-destructive", bgColor: "bg-destructive/10" },
    due_today: { icon: CalendarClock, color: "text-warning", bgColor: "bg-warning/10" },
  };
  
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left group"
    >
      <div className={`w-8 h-8 rounded-md ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs capitalize">
            {task.status?.replace("_", " ")}
          </Badge>
          {task.due_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

export default function AppDashboard() {
  const { user } = useAuth();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const firstName = user?.user_metadata?.first_name || "User";
  
  const isAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const deferredCount = getDeferredTasksCount();

  // State for task dialog
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false);

  // Fetch tasks for dashboard using helper function
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks", activeCompanyId, user?.id],
    queryFn: () => fetchDashboardTasks(activeCompanyId!, user!.id),
    enabled: !!activeCompanyId && !!user?.id,
  });

  // Categorize tasks
  const today = startOfDay(new Date());
  
  const pinnedTasks = tasks.filter(t => t.is_pinned);
  
  const pastDueTasks = tasks.filter(t => {
    if (!t.due_date || t.is_pinned) return false;
    const dueDate = startOfDay(new Date(t.due_date));
    return isBefore(dueDate, today);
  });
  
  const dueTodayTasks = tasks.filter(t => {
    if (!t.due_date || t.is_pinned) return false;
    return isToday(new Date(t.due_date));
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleTaskDialogClose = (open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) {
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
    }
  };

  const hasAnyTasks = pinnedTasks.length > 0 || pastDueTasks.length > 0 || dueTodayTasks.length > 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Admin Deferred Tasks Banner */}
      {isAdmin && deferredCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  You have {deferredCount} deferred task{deferredCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Items requiring follow-up action
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <Link to="/app/admin/deferred">View Tasks</Link>
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here's an overview of your workspace.
        </p>
      </motion.div>

      {/* Quick Stats - removed Documents and Team Members */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {[
          { label: "Active Projects", value: "12" },
          { label: "Pending Tasks", value: "24" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tasks Overview Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your Tasks</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !hasAnyTasks ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No pinned, past due, or due today tasks. You're all caught up!
              </p>
            ) : (
              <>
                {/* Pinned Tasks */}
                {pinnedTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Pin className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium text-foreground">Pinned</h3>
                      <Badge variant="secondary" className="text-xs">{pinnedTasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {pinnedTasks.map(task => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          category="pinned" 
                          onClick={() => handleTaskClick(task)} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Due Tasks */}
                {pastDueTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-destructive" />
                      <h3 className="text-sm font-medium text-foreground">Past Due</h3>
                      <Badge variant="destructive" className="text-xs">{pastDueTasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {pastDueTasks.map(task => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          category="past_due" 
                          onClick={() => handleTaskClick(task)} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Due Today Tasks */}
                {dueTodayTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarClock className="h-4 w-4 text-warning" />
                      <h3 className="text-sm font-medium text-foreground">Due Today</h3>
                      <Badge className="text-xs bg-warning/20 text-warning-foreground border-warning/30">{dueTodayTasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {dueTodayTasks.map(task => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          category="due_today" 
                          onClick={() => handleTaskClick(task)} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modules Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <motion.div
              key={module.name}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={module.href}>
                <Card className="h-full border-border hover:border-primary/50 hover:shadow-sm transition-all group cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/15 transition-colors">
                      <module.icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm flex items-center justify-between">
                      {module.name}
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No recent activity to display. Start by exploring the modules above.
          </p>
        </CardContent>
      </Card>

      {/* Task Edit Dialog */}
      <TaskFormDialog
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogClose}
        task={selectedTask}
      />
    </div>
  );
}
