import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, ExternalLink, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useMembership } from "@/lib/membership";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentFormsTabProps {
  departmentId: string;
}

export function DepartmentFormsTab({ departmentId }: DepartmentFormsTabProps) {
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();

  const { data: forms, isLoading } = useQuery({
    queryKey: ["department-forms", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("department_id", departmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!departmentId,
  });

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {isCompanyAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => navigate(`/app/forms/new?department=${departmentId}`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </div>
      )}

      {!forms?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No forms in this department"
          description={
            isCompanyAdmin
              ? "Create a form and assign it to this department."
              : "No forms have been assigned to this department yet."
          }
          actionLabel={isCompanyAdmin ? "New Form" : undefined}
          onAction={isCompanyAdmin ? () => navigate(`/app/forms/new?department=${departmentId}`) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {forms.map((form) => (
            <Card key={form.id} className="cursor-pointer hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3" onClick={() => navigate(`/app/forms/${form.id}`)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{form.name}</p>
                    {form.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={form.status === "published" ? "default" : "secondary"}>
                    {form.status === "published" ? "Published" : "Draft"}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/app/forms/${form.id}`)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Form
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
