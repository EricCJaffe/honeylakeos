import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useEntityLinks } from "@/hooks/useEntityLinks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CheckSquare,
  FileText,
  CalendarDays,
  FolderKanban,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

// Import form dialogs
import { TaskFormDialog } from "@/pages/app/tasks/TaskFormDialog";
import { NoteFormDialog } from "@/pages/app/notes/NoteFormDialog";
import { EventFormDialog } from "@/pages/app/calendar/EventFormDialog";
import { ProjectFormDialog } from "@/pages/app/projects/ProjectFormDialog";

interface CrmCreateActionsMenuProps {
  crmClientId: string;
  clientName: string;
}

type CreateMode = "task" | "note" | "event" | "project" | null;

export function CrmCreateActionsMenu({
  crmClientId,
  clientName,
}: CrmCreateActionsMenuProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { isEnabled } = useCompanyModules();
  const queryClient = useQueryClient();
  const { createLink } = useEntityLinks("crm_client", crmClientId);

  const [createMode, setCreateMode] = React.useState<CreateMode>(null);

  // Check module enablement
  const tasksEnabled = isEnabled("tasks");
  const notesEnabled = isEnabled("notes");
  const calendarEnabled = isEnabled("calendar");
  const projectsEnabled = isEnabled("projects");

  // Handle successful entity creation with auto-linking
  const handleTaskSuccess = async (taskId: string) => {
    // Link is created in TaskFormDialog
    queryClient.invalidateQueries({ queryKey: ["crm-hub-links"] });
    queryClient.invalidateQueries({ queryKey: ["crm-hub-tasks"] });
    setCreateMode(null);
  };

  const handleNoteSuccess = async (noteId: string) => {
    // Link is created in NoteFormDialog
    queryClient.invalidateQueries({ queryKey: ["crm-hub-links"] });
    queryClient.invalidateQueries({ queryKey: ["crm-hub-notes"] });
    setCreateMode(null);
  };

  const handleProjectSuccess = async (projectId: string) => {
    // Link is created in ProjectFormDialog
    queryClient.invalidateQueries({ queryKey: ["crm-hub-links"] });
    queryClient.invalidateQueries({ queryKey: ["crm-hub-projects"] });
    setCreateMode(null);
  };

  // No modules enabled - hide the menu
  if (!tasksEnabled && !notesEnabled && !calendarEnabled && !projectsEnabled) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create & Link
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Create & Auto-Link</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {tasksEnabled ? (
            <DropdownMenuItem onClick={() => setCreateMode("task")}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Task
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Lock className="h-4 w-4 mr-2" />
              Task (disabled)
            </DropdownMenuItem>
          )}

          {notesEnabled ? (
            <DropdownMenuItem onClick={() => setCreateMode("note")}>
              <FileText className="h-4 w-4 mr-2" />
              Note
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Lock className="h-4 w-4 mr-2" />
              Note (disabled)
            </DropdownMenuItem>
          )}

          {calendarEnabled ? (
            <DropdownMenuItem onClick={() => setCreateMode("event")}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar Event
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Lock className="h-4 w-4 mr-2" />
              Event (disabled)
            </DropdownMenuItem>
          )}

          {projectsEnabled ? (
            <DropdownMenuItem onClick={() => setCreateMode("project")}>
              <FolderKanban className="h-4 w-4 mr-2" />
              Project
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Lock className="h-4 w-4 mr-2" />
              Project (disabled)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Task Form Dialog with pre-filled client */}
      <TaskFormDialog
        open={createMode === "task"}
        onOpenChange={(open) => !open && setCreateMode(null)}
        crmClientId={crmClientId}
        onSuccess={handleTaskSuccess}
      />

      {/* Note Form Dialog with pre-filled client */}
      <NoteFormDialog
        open={createMode === "note"}
        onOpenChange={(open) => !open && setCreateMode(null)}
        crmClientId={crmClientId}
        onSuccess={handleNoteSuccess}
      />

      {/* Project Form Dialog with pre-filled client */}
      <ProjectFormDialog
        open={createMode === "project"}
        onOpenChange={(open) => !open && setCreateMode(null)}
        crmClientId={crmClientId}
        onSuccess={handleProjectSuccess}
      />
    </>
  );
}
