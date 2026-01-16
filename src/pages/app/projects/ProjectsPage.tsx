import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FolderKanban, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectTemplateList } from "@/components/projects/ProjectTemplateList";
import { ProjectTemplateFormDialog } from "@/components/projects/ProjectTemplateFormDialog";
import { CreateFromTemplateDialog } from "@/components/projects/CreateFromTemplateDialog";
import type { Tables } from "@/integrations/supabase/types";
import type { ProjectTemplate } from "@/hooks/useProjectTemplates";

type Project = Tables<"projects">;

export default function ProjectsPage() {
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [templateToUse, setTemplateToUse] = useState<ProjectTemplate | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!activeCompanyId,
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const canEdit = (project: Project) => {
    return isCompanyAdmin || project.owner_user_id === user?.id;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderKanban}
          title="No company selected"
          description="Please select a company to view projects."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Projects"
        description="Manage your team's projects"
        actionLabel="New Project"
        onAction={handleCreate}
      />

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          {isCompanyAdmin && <TabsTrigger value="templates">Templates</TabsTrigger>}
        </TabsList>

        <TabsContent value="projects">
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to get started organizing your work."
              actionLabel="Create Project"
              onAction={handleCreate}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Link to={`/app/projects/${project.id}`} className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{project.emoji}</span>
                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                          </div>
                        </Link>
                        {canEdit(project) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(project)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteProject.mutate(project.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <Badge variant="secondary" className={getStatusColor(project.status)}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{Number(project.progress)}%</span>
                        </div>
                        <Progress value={Number(project.progress)} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {isCompanyAdmin && (
          <TabsContent value="templates">
            <ProjectTemplateList
              onCreate={() => {
                setEditingTemplate(null);
                setTemplateDialogOpen(true);
              }}
              onEdit={(template) => {
                setEditingTemplate(template);
                setTemplateDialogOpen(true);
              }}
              onUseTemplate={(template) => setTemplateToUse(template)}
            />
          </TabsContent>
        )}
      </Tabs>

      <ProjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        project={editingProject}
      />

      <ProjectTemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
      />

      <CreateFromTemplateDialog
        open={!!templateToUse}
        onOpenChange={(open) => !open && setTemplateToUse(null)}
        template={templateToUse}
        onSuccess={(projectId) => navigate(`/app/projects/${projectId}`)}
      />
    </div>
  );
}
