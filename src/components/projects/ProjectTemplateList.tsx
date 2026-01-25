import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Layers,
  ListTodo,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProjectTemplates,
  useProjectTemplateDetails,
  useProjectTemplateMutations,
  ProjectTemplate,
} from "@/hooks/useProjectTemplates";

interface ProjectTemplateListProps {
  onEdit: (template: ProjectTemplate) => void;
  onCreate: () => void;
  onUseTemplate: (template: ProjectTemplate) => void;
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onUseTemplate,
}: {
  template: ProjectTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onUseTemplate: () => void;
}) {
  const { data: details } = useProjectTemplateDetails(template.id);

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{template.emoji}</span>
            <CardTitle className="text-base">{template.name}</CardTitle>
          </div>
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
              <DropdownMenuItem onClick={onUseTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Use Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {template.description}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {details?.phases.length ?? 0} phases
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <ListTodo className="h-3 w-3" />
            {details?.tasks.length ?? 0} tasks
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectTemplateList({
  onEdit,
  onCreate,
  onUseTemplate,
}: ProjectTemplateListProps) {
  const { data: templates = [], isLoading } = useProjectTemplates();
  const { deleteTemplate } = useProjectTemplateMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={onCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No project templates"
            description="Create templates to quickly spin up new projects with predefined phases and tasks."
            actionLabel="Create Template"
            onAction={onCreate}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TemplateCard
                  template={template}
                  onEdit={() => onEdit(template)}
                  onDelete={() => setDeleteId(template.id)}
                  onUseTemplate={() => onUseTemplate(template)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
