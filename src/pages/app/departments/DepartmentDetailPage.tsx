import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Pencil, Users, FileText, Link2, Video, File, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartment, useDepartmentMembers, useDepartmentMutations } from "@/hooks/useDepartments";
import { useDepartmentResources } from "@/hooks/useResources";
import { useMembership } from "@/lib/membership";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import { DepartmentMembersTab } from "./DepartmentMembersTab";
import { ResourcesTab } from "./ResourcesTab";

export default function DepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();

  const { data: department, isLoading } = useDepartment(departmentId);
  const { data: members } = useDepartmentMembers(departmentId);
  const { data: resources } = useDepartmentResources(departmentId);

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

      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            {department.name}
          </div>
        }
        description={department.description || "No description"}
        actions={
          isCompanyAdmin && (
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-1 h-4 w-4" />
            Members ({memberCount})
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="mr-1 h-4 w-4" />
            Resources ({resourceCount})
          </TabsTrigger>
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
                        {m.profile?.full_name || m.profile?.email || "Unknown"}
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
      </Tabs>

      <DepartmentFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editingDepartment={department}
      />
    </div>
  );
}
