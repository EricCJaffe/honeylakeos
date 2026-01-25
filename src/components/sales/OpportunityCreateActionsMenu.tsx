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

interface OpportunityCreateActionsMenuProps {
  opportunityId: string;
  opportunityName: string;
}

export function OpportunityCreateActionsMenu({
  opportunityId,
  opportunityName,
}: OpportunityCreateActionsMenuProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { isEnabled } = useCompanyModules();
  const queryClient = useQueryClient();
  const { createLink } = useEntityLinks("sales_opportunity", opportunityId);

  // Check module enablement
  const tasksEnabled = isEnabled("tasks");
  const notesEnabled = isEnabled("notes");
  const calendarEnabled = isEnabled("calendar");
  const projectsEnabled = isEnabled("projects");

  // Track created entity to auto-link after form closes
  const linkCreatedEntity = async (entityType: string, entityId: string) => {
    try {
      await createLink.mutateAsync({
        toType: entityType as any,
        toId: entityId,
        linkType: "related",
      });
    } catch (error) {
      console.error("Failed to auto-link entity:", error);
    }
  };

  // Create task with auto-link
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          company_id: activeCompanyId,
          created_by: user.id,
          title: `Follow up: ${opportunityName}`,
          status: "to_do",
          priority: "medium",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await linkCreatedEntity("task", data.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      toast.success("Task created and linked");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  // Create note with auto-link
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const { data, error } = await supabase
        .from("notes")
        .insert({
          company_id: activeCompanyId,
          created_by: user.id,
          title: `Notes - ${opportunityName}`,
          content: "",
          access_level: "company",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await linkCreatedEntity("note", data.id);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      toast.success("Note created and linked");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create note");
    },
  });

  // Create event with auto-link
  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const startAt = new Date();
      startAt.setHours(startAt.getHours() + 1, 0, 0, 0);
      const endAt = new Date(startAt);
      endAt.setHours(endAt.getHours() + 1);

      const { data, error } = await supabase
        .from("events")
        .insert({
          company_id: activeCompanyId,
          created_by: user.id,
          title: `Meeting: ${opportunityName}`,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          all_day: false,
          timezone: "America/New_York",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await linkCreatedEntity("event", data.id);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      toast.success("Event created and linked");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create event");
    },
  });

  // Create project with auto-link
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          company_id: activeCompanyId,
          created_by: user.id,
          owner_user_id: user.id,
          name: `Project: ${opportunityName}`,
          status: "active",
          emoji: "💼",
          color: "#2563eb",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await linkCreatedEntity("project", data.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      toast.success("Project created and linked");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const isPending =
    createTaskMutation.isPending ||
    createNoteMutation.isPending ||
    createEventMutation.isPending ||
    createProjectMutation.isPending;

  // No modules enabled - hide the menu
  if (!tasksEnabled && !notesEnabled && !calendarEnabled && !projectsEnabled) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {isPending ? "Creating..." : "Create & Link"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Create & Auto-Link</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {tasksEnabled ? (
          <DropdownMenuItem onClick={() => createTaskMutation.mutate()}>
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
          <DropdownMenuItem onClick={() => createNoteMutation.mutate()}>
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
          <DropdownMenuItem onClick={() => createEventMutation.mutate()}>
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
          <DropdownMenuItem onClick={() => createProjectMutation.mutate()}>
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
  );
}
