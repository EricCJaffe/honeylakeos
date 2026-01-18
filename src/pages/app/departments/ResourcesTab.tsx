import { useState } from "react";
import { Plus, MoreHorizontal, Trash2, Pencil, ExternalLink, FileText, Link2, Video, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useDepartmentResources, useResourceMutations, type Resource } from "@/hooks/useResources";
import { useDepartmentMembers } from "@/hooks/useDepartments";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ResourceFormDialog } from "../resources/ResourceFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

interface ResourcesTabProps {
  departmentId: string;
}

const resourceTypeIcons = {
  document: FileText,
  link: Link2,
  file: File,
  video: Video,
};

export function ResourcesTab({ departmentId }: ResourcesTabProps) {
  const { isCompanyAdmin } = useMembership();
  const { data: resources, isLoading } = useDepartmentResources(departmentId);
  const { data: members } = useDepartmentMembers(departmentId);
  const { deleteResource } = useResourceMutations();

  // Check if current user is a manager
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  const isManager = members?.some(
    (m) => m.user_id === currentUser?.id && m.role === "manager"
  );
  const canManage = isCompanyAdmin || isManager;

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

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
        </div>
      )}

      {!resources?.length ? (
        <EmptyState
          icon={FileText}
          title="No resources yet"
          description={
            canManage
              ? "Add documents, links, or files for this department."
              : "No resources have been added to this department yet."
          }
          actionLabel={canManage ? "Add Resource" : undefined}
          onAction={canManage ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => {
            const Icon = resourceTypeIcons[resource.resource_type] || FileText;

            return (
              <Card key={resource.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{resource.title}</p>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {resource.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {resource.resource_type}
                    </Badge>

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

                    {canManage && (
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ResourceFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        departmentId={departmentId}
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
