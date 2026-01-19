import { useNavigate } from "react-router-dom";
import { Building2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserDepartmentMembership } from "@/hooks/useUserDepartmentMembership";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/EmptyState";

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const { data: userMemberships, isLoading } = useUserDepartmentMembership();

  const departments = userMemberships?.map(m => m.department) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Departments"
        description="View the departments you're a member of and access their resources."
      />

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : !departments?.length ? (
        <EmptyState
          icon={Building2}
          title="No departments"
          description="You haven't been added to any departments yet. Contact your administrator to request access."
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
    </div>
  );
}
