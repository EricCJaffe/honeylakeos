import * as React from "react";
import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useTemplates, useTemplateMutations, Template, TemplateType } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TemplateFormDialog } from "@/components/templates/TemplateFormDialog";

const templateTypes: { value: TemplateType; label: string }[] = [
  { value: "task", label: "Tasks" },
  { value: "project", label: "Projects" },
  { value: "note", label: "Notes" },
  { value: "event", label: "Events" },
  { value: "document", label: "Documents" },
];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateType>("task");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useTemplates(activeTab);
  const { updateTemplate, deleteTemplate } = useTemplateMutations();

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const handleToggleActive = (template: Template) => {
    updateTemplate.mutate({
      id: template.id,
      isActive: !template.is_active,
    });
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteTemplate.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const renderTemplateCard = (template: Template) => (
    <Card key={template.id} className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{template.name}</h3>
              <Badge variant={template.is_active ? "default" : "secondary"}>
                {template.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              {Object.keys(template.payload).length} default field(s)
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(template)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                {template.is_active ? (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteConfirm(template)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Templates"
        description="Create reusable templates for tasks, projects, notes, and more"
        actionLabel="New Template"
        onAction={handleCreate}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
        <TabsList className="mb-4">
          {templateTypes.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {templateTypes.map((type) => (
          <TabsContent key={type.value} value={type.value}>
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="h-16 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={`No ${type.label.toLowerCase()} templates`}
                description={`Create a template to quickly fill in common ${type.label.toLowerCase()}.`}
                actionLabel="Create Template"
                onAction={handleCreate}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map(renderTemplateCard)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <TemplateFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={editingTemplate}
        defaultType={activeTab}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
