import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDepartments, useDepartmentMutations } from "@/hooks/useDepartments";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/EmptyState";
import { DepartmentFormDialog } from "@/pages/app/departments/DepartmentFormDialog";
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
import { supabase } from "@/integrations/supabase/client";

export default function DepartmentsPanel() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { data: departments, isLoading } = useDepartments();
  const { deleteDepartment } = useDepartmentMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Seed default departments if none exist
  useEffect(() => {
    const seedIfNeeded = async () => {
      if (!activeCompanyId || isLoading || seeding) return;
      if (departments && departments.length === 0) {
        setSeeding(true);
        try {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.rpc("seed_default_departments", {
            p_company_id: activeCompanyId,
            p_created_by: userData.user?.id || null,
          });
          window.location.reload();
        } catch (error) {
          console.error("Failed to seed departments:", error);
        }
        setSeeding(false);
      }
    };
    seedIfNeeded();
  }, [activeCompanyId, departments, isLoading, seeding]);

  const handleEdit = (dept: { id: string; name: string; description: string | null }) => {
    setEditingDept(dept);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteDepartment.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingDept(null);
  };

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Department
        </Button>
      </div>

      {!departments?.length ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create departments to organize your team and resources."
          actionLabel="Create Department"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/app/departments/${dept.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(dept);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(dept.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2">
                  {dept.description || "No description"}
                </CardDescription>
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>View members & resources</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingDepartment={editingDept}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this department and remove all member associations.
              Resources linked to this department will also be deleted.
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
