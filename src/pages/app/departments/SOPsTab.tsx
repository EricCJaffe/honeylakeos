import { useState } from "react";
import { Plus, MoreHorizontal, Trash2, Pencil, Eye, Search, FileText, Tag, Filter } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useDepartmentSOPs, useSOPMutations, useSearchSOPs, type SOP } from "@/hooks/useSOPs";
import { useDepartmentMembers } from "@/hooks/useDepartments";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SOPFormDialog } from "./SOPFormDialog";
import { SOPDetailDialog } from "./SOPDetailDialog";
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

interface SOPsTabProps {
  departmentId: string;
}

export function SOPsTab({ departmentId }: SOPsTabProps) {
  const { isCompanyAdmin } = useMembership();
  const { data: members } = useDepartmentMembers(departmentId);
  const { deleteSOP } = useSOPMutations();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Use search hook when there's a query, otherwise use the regular hook
  const { data: allSOPs, isLoading: isLoadingAll } = useDepartmentSOPs(departmentId);
  const { data: searchedSOPs, isLoading: isLoadingSearch } = useSearchSOPs(
    departmentId,
    searchQuery,
    selectedTags
  );

  const sops = searchQuery || selectedTags.length > 0 ? searchedSOPs : allSOPs;
  const isLoading = searchQuery || selectedTags.length > 0 ? isLoadingSearch : isLoadingAll;

  // Get all unique tags from SOPs
  const allTags = [...new Set(allSOPs?.flatMap((sop) => sop.tags || []) || [])];

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
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [viewingSOP, setViewingSOP] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (sop: SOP) => {
    setEditingSOP(sop);
    setFormOpen(true);
  };

  const handleView = (sopId: string) => {
    setViewingSOP(sopId);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteSOP.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSOP(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SOPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create SOP
          </Button>
        )}
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              className="text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* SOP List */}
      {!sops?.length ? (
        <EmptyState
          icon={FileText}
          title="No SOPs yet"
          description={
            canManage
              ? "Create Standard Operating Procedures to document your department's processes."
              : "No Standard Operating Procedures have been added to this department yet."
          }
          actionLabel={canManage ? "Create SOP" : undefined}
          onAction={canManage ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {sops.map((sop) => (
            <Card key={sop.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => handleView(sop.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{sop.title}</p>
                      <Badge variant="outline" className="text-xs">
                        v{sop.current_version}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {sop.owner_role && <span>{sop.owner_role}</span>}
                      {sop.owner_role && sop.updated_at && <span>•</span>}
                      <span>Updated {format(new Date(sop.updated_at), "MMM d, yyyy")}</span>
                    </div>
                    {sop.tags && sop.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {sop.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                        {sop.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs py-0">
                            +{sop.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={sop.visibility === "company_public" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {sop.visibility === "company_public" ? "Public" : "Dept Only"}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleView(sop.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(sop)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingId(sop.id)}
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
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <SOPFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        departmentId={departmentId}
        editingSOP={editingSOP}
      />

      {/* Detail Dialog */}
      {viewingSOP && (
        <SOPDetailDialog
          open={!!viewingSOP}
          onOpenChange={() => setViewingSOP(null)}
          sopId={viewingSOP}
          onEdit={
            canManage
              ? () => {
                  const sop = sops?.find((s) => s.id === viewingSOP);
                  if (sop) {
                    setViewingSOP(null);
                    handleEdit(sop);
                  }
                }
              : undefined
          }
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Standard Operating Procedure and all its revision history.
              This action cannot be undone.
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
