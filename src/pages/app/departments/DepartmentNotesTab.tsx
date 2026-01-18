import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, ExternalLink, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentNotesTabProps {
  departmentId: string;
}

export function DepartmentNotesTab({ departmentId }: DepartmentNotesTabProps) {
  const navigate = useNavigate();

  const { data: notes, isLoading } = useQuery({
    queryKey: ["department-notes", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("department_id", departmentId)
        .order("updated_at", { ascending: false });

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
      <div className="flex justify-end">
        <Button onClick={() => navigate(`/app/notes/new?department=${departmentId}`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {!notes?.length ? (
        <EmptyState
          icon={StickyNote}
          title="No notes in this department"
          description="Create a note and assign it to this department."
          actionLabel="New Note"
          onAction={() => navigate(`/app/notes/new?department=${departmentId}`)}
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className="cursor-pointer hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3" onClick={() => navigate(`/app/notes/${note.id}`)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <StickyNote className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{note.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Updated {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/app/notes/${note.id}`)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
