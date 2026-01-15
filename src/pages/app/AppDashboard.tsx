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
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { getDeferredTasksCount } from "./admin/DeferredTasksPage";

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

export default function AppDashboard() {
  const { user } = useAuth();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const firstName = user?.user_metadata?.first_name || "User";
  
  const isAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const deferredCount = getDeferredTasksCount();

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

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Projects", value: "12" },
          { label: "Pending Tasks", value: "24" },
          { label: "Documents", value: "156" },
          { label: "Team Members", value: "8" },
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
    </div>
  );
}
