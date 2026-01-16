import * as React from "react";
import { FileText, Pencil, Trash2, Plus, MoreHorizontal, Calendar } from "lucide-react";
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
import { useTemplates, useTemplateMutations, Template } from "@/hooks/useTemplates";
import { EmptyState } from "@/components/EmptyState";

interface EventTemplateListProps {
  onCreateFromTemplate: (template: Template) => void;
  onEditTemplate: (template: Template) => void;
  onCreateTemplate: () => void;
}

export function EventTemplateList({
  onCreateFromTemplate,
  onEditTemplate,
  onCreateTemplate,
}: EventTemplateListProps) {
  const { data: templates = [], isLoading } = useTemplates("event");
  const { deleteTemplate } = useTemplateMutations();
  const [templateToDelete, setTemplateToDelete] = React.useState<Template | null>(null);

  const handleDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setTemplateToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={Calendar}
          title="No event templates"
          description="Create a template to quickly create events with preset values."
          actionLabel="Create Template"
          onAction={onCreateTemplate}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </span>
        <Button size="sm" variant="outline" onClick={onCreateTemplate}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>
      <div>
        {templates.map((template) => {
          const payload = template.payload as Record<string, any>;
          return (
            <div
              key={template.id}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors group"
            >
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{template.name}</span>
                  {!template.is_active && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {template.description && (
                    <span className="truncate max-w-[200px]">{template.description}</span>
                  )}
                  {payload?.title && (
                    <span className="truncate">
                      → "{payload.title}"
                    </span>
                  )}
                  {payload?.all_day && (
                    <Badge variant="outline" className="text-xs py-0 h-4">
                      All day
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={() => onCreateFromTemplate(template)}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Use
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditTemplate(template)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Template
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setTemplateToDelete(template)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
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
    </div>
  );
}
