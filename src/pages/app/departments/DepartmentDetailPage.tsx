import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Pencil, Users, FileText, FolderKanban, CheckCircle2, StickyNote, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartment, useDepartmentMembers } from "@/hooks/useDepartments";
import { useDepartmentResources } from "@/hooks/useResources";
import { useMembership } from "@/lib/membership";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import { DepartmentMembersTab } from "./DepartmentMembersTab";
import { ResourcesTab } from "./ResourcesTab";
import { DepartmentProjectsTab } from "./DepartmentProjectsTab";
import { DepartmentTasksTab } from "./DepartmentTasksTab";
import { DepartmentNotesTab } from "./DepartmentNotesTab";
import { DepartmentDocumentsTab } from "./DepartmentDocumentsTab";
import { DepartmentFormsTab } from "./DepartmentFormsTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function DepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const { isEnabled } = useCompanyModules();

  const { data: department, isLoading } = useDepartment(departmentId);
  const { data: members } = useDepartmentMembers(departmentId);
  const { data: resources } = useDepartmentResources(departmentId);

  // Get counts for entity tabs
  const { data: projectsCount } = useQuery({
    queryKey: ["department-projects-count", departmentId],
    queryFn: async () => {
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("department_id", departmentId!);
      return count || 0;
    },
    enabled: !!departmentId,
  });

  const { data: tasksCount } = useQuery({
    queryKey: ["department-tasks-count", departmentId],
    queryFn: async () => {
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("department_id", departmentId!);
      return count || 0;
    },
    enabled: !!departmentId,
  });

  const { data: notesCount } = useQuery({
    queryKey: ["department-notes-count", departmentId],
    queryFn: async () => {
      const { count } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("department_id", departmentId!);
      return count || 0;
    },
    enabled: !!departmentId,
  });

  const { data: documentsCount } = useQuery({
    queryKey: ["department-documents-count", departmentId],
    queryFn: async () => {
      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("department_id", departmentId!);
      return count || 0;
    },
    enabled: !!departmentId,
  });

  const { data: formsCount } = useQuery({
    queryKey: ["department-forms-count", departmentId],
    queryFn: async () => {
      const { count } = await supabase
        .from("forms")
        .select("*", { count: "exact", head: true })
        .eq("department_id", departmentId!);
      return count || 0;
    },
    enabled: !!departmentId,
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/app/departments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Departments
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Department not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const managerCount = members?.filter((m) => m.role === "manager").length || 0;
  const memberCount = members?.length || 0;
  const resourceCount = resources?.length || 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/app/departments")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Departments
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{department.name}</h1>
            {department.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{department.description}</p>
            )}
          </div>
        </div>
        {isCompanyAdmin && (
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-1 h-4 w-4" />
            Members ({memberCount})
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="mr-1 h-4 w-4" />
            Resources ({resourceCount})
          </TabsTrigger>
          {isEnabled("projects") && (
            <TabsTrigger value="projects">
              <FolderKanban className="mr-1 h-4 w-4" />
              Projects ({projectsCount || 0})
            </TabsTrigger>
          )}
          {isEnabled("tasks") && (
            <TabsTrigger value="tasks">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Tasks ({tasksCount || 0})
            </TabsTrigger>
          )}
          {isEnabled("notes") && (
            <TabsTrigger value="notes">
              <StickyNote className="mr-1 h-4 w-4" />
              Notes ({notesCount || 0})
            </TabsTrigger>
          )}
          {isEnabled("documents") && (
            <TabsTrigger value="documents">
              <FileText className="mr-1 h-4 w-4" />
              Documents ({documentsCount || 0})
            </TabsTrigger>
          )}
          {isEnabled("forms") && (
            <TabsTrigger value="forms">
              <ClipboardList className="mr-1 h-4 w-4" />
              Forms ({formsCount || 0})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{memberCount}</div>
                <p className="text-xs text-muted-foreground">
                  {managerCount} manager{managerCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resourceCount}</div>
                <p className="text-xs text-muted-foreground">Documents, links, files</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {new Date(department.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {department.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{department.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick managers view */}
          {members && members.filter((m) => m.role === "manager").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Managers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {members
                    .filter((m) => m.role === "manager")
                    .map((m) => (
                      <Badge key={m.id} variant="secondary">
                        {m.full_name || m.email || "Unknown"}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          <DepartmentMembersTab departmentId={departmentId!} />
        </TabsContent>

        <TabsContent value="resources" className="pt-4">
          <ResourcesTab departmentId={departmentId!} />
        </TabsContent>

        <TabsContent value="projects" className="pt-4">
          <DepartmentProjectsTab departmentId={departmentId!} />
        </TabsContent>

        <TabsContent value="tasks" className="pt-4">
          <DepartmentTasksTab departmentId={departmentId!} />
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <DepartmentNotesTab departmentId={departmentId!} />
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <DepartmentDocumentsTab departmentId={departmentId!} />
        </TabsContent>

        <TabsContent value="forms" className="pt-4">
          <DepartmentFormsTab departmentId={departmentId!} />
        </TabsContent>
      </Tabs>

      <DepartmentFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editingDepartment={department}
      />
    </div>
  );
}
