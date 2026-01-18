import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, Pencil, ExternalLink, FolderKanban } from "lucide-react";
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

interface DepartmentProjectsTabProps {
  departmentId: string;
}

export function DepartmentProjectsTab({ departmentId }: DepartmentProjectsTabProps) {
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["department-projects", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
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
          <Button onClick={() => navigate(`/app/projects/new?department=${departmentId}`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      )}

      {!projects?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects in this department"
          description={
            isCompanyAdmin
              ? "Create a project and assign it to this department."
              : "No projects have been assigned to this department yet."
          }
          actionLabel={isCompanyAdmin ? "New Project" : undefined}
          onAction={isCompanyAdmin ? () => navigate(`/app/projects/new?department=${departmentId}`) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3" onClick={() => navigate(`/app/projects/${project.id}`)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {project.status || "active"}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/app/projects/${project.id}`)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {isCompanyAdmin && (
                        <DropdownMenuItem onClick={() => navigate(`/app/projects/${project.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
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
