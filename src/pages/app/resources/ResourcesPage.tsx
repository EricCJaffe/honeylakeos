import { useState } from "react";
import { Plus, MoreHorizontal, Trash2, Pencil, ExternalLink, FileText, Link2, Video, File, Globe } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUniversalResources, useResourceMutations, type Resource } from "@/hooks/useResources";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ResourceFormDialog } from "./ResourceFormDialog";
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

const resourceTypeIcons = {
  document: FileText,
  link: Link2,
  file: File,
  video: Video,
};

export default function ResourcesPage() {
  const { isCompanyAdmin } = useMembership();
  const { data: resources, isLoading } = useUniversalResources();
  const { deleteResource } = useResourceMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteResource.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingResource(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Company-wide resources, documents, and links accessible to all team members."
        actionLabel={isCompanyAdmin ? "Add Resource" : undefined}
        onAction={isCompanyAdmin ? () => setFormOpen(true) : undefined}
      />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : !resources?.length ? (
        <EmptyState
          icon={Globe}
          title="No universal resources yet"
          description={
            isCompanyAdmin
              ? "Add company-wide documents, links, or files for your team."
              : "No company-wide resources have been added yet."
          }
          actionLabel={isCompanyAdmin ? "Add Resource" : undefined}
          onAction={isCompanyAdmin ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const Icon = resourceTypeIcons[resource.resource_type] || FileText;

            return (
              <Card key={resource.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{resource.title}</p>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {resource.description}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-2 capitalize">
                          {resource.resource_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {(resource.resource_type === "link" || resource.resource_type === "video") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(resource.content_ref, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}

                      {isCompanyAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(resource)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingId(resource.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ResourceFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        departmentId={null}
        editingResource={editingResource}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resource. This action cannot be undone.
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
