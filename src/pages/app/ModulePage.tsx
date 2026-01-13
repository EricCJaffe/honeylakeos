import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FolderKanban,
  CheckCircle2,
  Calendar,
  FileText,
  MessageSquare,
  Globe,
  Workflow,
  BookOpen,
  Settings,
  Construction,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const moduleConfig: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  "/app/projects": { icon: FolderKanban, title: "Projects", description: "Plan, track, and deliver projects with visual boards and timelines." },
  "/app/tasks": { icon: CheckCircle2, title: "Tasks", description: "Manage to-dos with assignments, due dates, and progress tracking." },
  "/app/calendar": { icon: Calendar, title: "Calendar", description: "Schedule events, meetings, and deadlines across your organization." },
  "/app/documents": { icon: FileText, title: "Documents", description: "Store, organize, and collaborate on files with version control." },
  "/app/notes": { icon: MessageSquare, title: "Notes", description: "Capture ideas and meeting notes with rich text editing." },
  "/app/forms": { icon: Globe, title: "Forms", description: "Build custom forms and surveys with conditional logic." },
  "/app/workflows": { icon: Workflow, title: "Workflows", description: "Automate processes with customizable approval workflows." },
  "/app/lms": { icon: BookOpen, title: "LMS", description: "Create courses and training programs for your team." },
  "/app/settings": { icon: Settings, title: "Settings", description: "Manage your account and preferences." },
};

export default function ModulePage() {
  const location = useLocation();
  const config = moduleConfig[location.pathname] || {
    icon: Construction,
    title: "Module",
    description: "This module is under construction.",
  };

  const Icon = config.icon;

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{config.title}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </motion.div>

      <Card className="border-border/50 border-dashed">
        <CardContent className="py-16 text-center">
          <Construction className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            This module is currently under development. Check back soon for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
