import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, FolderKanban, CheckCircle2, Calendar, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LinkDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}

export function LinkDocumentDialog({
  open,
  onOpenChange,
  documentId,
}: LinkDocumentDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");

  // Fetch existing links
  const { data: linkedProjects = [] } = useQuery({
    queryKey: ["document-projects", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("project_id")
        .eq("document_id", documentId);
      if (error) throw error;
      return data.map((d) => d.project_id);
    },
    enabled: open,
  });

  const { data: linkedTasks = [] } = useQuery({
    queryKey: ["document-tasks", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_documents")
        .select("task_id")
        .eq("document_id", documentId);
      if (error) throw error;
      return data.map((d) => d.task_id);
    },
    enabled: open,
  });

  const { data: linkedEvents = [] } = useQuery({
    queryKey: ["document-events", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_documents")
        .select("event_id")
        .eq("document_id", documentId);
      if (error) throw error;
      return data.map((d) => d.event_id);
    },
    enabled: open,
  });

  // Fetch available items
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "lite", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji")
        .eq("company_id", activeCompanyId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && open,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("company_id", activeCompanyId)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && open,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-all", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .eq("company_id", activeCompanyId)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && open,
  });

  const linkProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("project_documents").insert({
        project_id: projectId,
        document_id: documentId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects", documentId] });
      toast.success("Linked to project");
      setSelectedProject("");
    },
  });

  const unlinkProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("project_documents")
        .delete()
        .eq("project_id", projectId)
        .eq("document_id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects", documentId] });
      toast.success("Unlinked from project");
    },
  });

  const linkTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("task_documents").insert({
        task_id: taskId,
        document_id: documentId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tasks", documentId] });
      toast.success("Linked to task");
      setSelectedTask("");
    },
  });

  const unlinkTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("task_documents")
        .delete()
        .eq("task_id", taskId)
        .eq("document_id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tasks", documentId] });
      toast.success("Unlinked from task");
    },
  });

  const linkEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("event_documents").insert({
        event_id: eventId,
        document_id: documentId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-events", documentId] });
      toast.success("Linked to event");
      setSelectedEvent("");
    },
  });

  const unlinkEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("event_documents")
        .delete()
        .eq("event_id", eventId)
        .eq("document_id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-events", documentId] });
      toast.success("Unlinked from event");
    },
  });

  const availableProjects = projects.filter((p) => !linkedProjects.includes(p.id));
  const availableTasks = tasks.filter((t) => !linkedTasks.includes(t.id));
  const availableEvents = events.filter((e) => !linkedEvents.includes(e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Document
          </DialogTitle>
          <DialogDescription>
            Connect this document to projects, tasks, or events.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projects">
              <FolderKanban className="h-4 w-4 mr-1" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="h-4 w-4 mr-1" />
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => linkProject.mutate(selectedProject)}
                disabled={!selectedProject || linkProject.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {linkedProjects.map((pid) => {
                const project = projects.find((p) => p.id === pid);
                return (
                  <div key={pid} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{project?.emoji} {project?.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unlinkProject.mutate(pid)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => linkTask.mutate(selectedTask)}
                disabled={!selectedTask || linkTask.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {linkedTasks.map((tid) => {
                const task = tasks.find((t) => t.id === tid);
                return (
                  <div key={tid} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{task?.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unlinkTask.mutate(tid)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => linkEvent.mutate(selectedEvent)}
                disabled={!selectedEvent || linkEvent.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {linkedEvents.map((eid) => {
                const event = events.find((e) => e.id === eid);
                return (
                  <div key={eid} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{event?.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unlinkEvent.mutate(eid)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
