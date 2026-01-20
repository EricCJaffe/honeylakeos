import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FolderKanban, 
  Users, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  MessageSquare,
  LayoutList,
  LayoutGrid,
  Plus,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Copy,
  FileDown,
  Archive,
  ArchiveRestore
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TaskFormDialog } from "../tasks/TaskFormDialog";
import { NoteFormDialog } from "../notes/NoteFormDialog";
import { EventFormDialog } from "../calendar/EventFormDialog";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { PhasesManager } from "@/components/projects/PhasesManager";
import { PhaseGroupedTaskList } from "@/components/projects/PhaseGroupedTaskList";
import { TaskBoardView } from "@/components/projects/TaskBoardView";
import { QuickAddButtons } from "@/components/projects/QuickAddButtons";
import { SaveAsTemplateDialog } from "@/components/projects/SaveAsTemplateDialog";
import { DuplicateProjectDialog } from "@/components/projects/DuplicateProjectDialog";
import { AttachmentsPanel } from "@/components/attachments";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEnabled } = useCompanyModules();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<"list" | "board">("list");
  const [editingTask, setEditingTask] = useState<any>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignees(user_id)")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["project-notes", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, created_at, is_pinned, color")
        .eq("project_id", projectId)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isEnabled("notes"),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, mime_type, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isEnabled("documents"),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["project-events", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, all_day")
        .eq("project_id", projectId)
        .gte("start_at", now)
        .order("start_at", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isEnabled("calendar"),
  });

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleCloseTaskDialog = (open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) setEditingTask(null);
  };

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from("projects")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project moved to trash");
      navigate("/app/projects");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  const archiveProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Project archived");
    },
    onError: () => {
      toast.error("Failed to archive project");
    },
  });

  const unarchiveProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ status: "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Project restored to active");
    },
    onError: () => {
      toast.error("Failed to restore project");
    },
  });

  const canEdit = project && (isCompanyAdmin || project.owner_user_id === user?.id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderKanban}
          title="Project not found"
          description="This project may have been deleted or you don't have access."
        />
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const calculatedProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const now = new Date();
  const overdueTasks = tasks.filter((t) => 
    t.status !== "done" && t.due_date && new Date(t.due_date) < now
  ).length;

  // Calculate upcoming events count
  const upcomingEventsCount = events.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isArchived = project?.status === "archived";

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link to="/app/projects" className="text-muted-foreground hover:text-foreground">
              ← Back
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.emoji} {project.name}</h1>
            <Badge variant="secondary" className={getStatusColor(project.status || "active")}>
              {(project.status || "active").replace("_", " ")}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSaveTemplateOpen(true)}>
                <FileDown className="h-4 w-4 mr-2" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDuplicateOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchived ? (
                <DropdownMenuItem onClick={() => unarchiveProject.mutate(projectId!)}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore from Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => archiveProject.mutate(projectId!)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Project
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="mb-6">
        <QuickAddButtons
          onAddTask={isEnabled("tasks") ? () => setIsTaskDialogOpen(true) : undefined}
          onAddEvent={isEnabled("calendar") ? () => setIsEventDialogOpen(true) : undefined}
          onAddNote={isEnabled("notes") ? () => setIsNoteDialogOpen(true) : undefined}
          onUploadDocument={isEnabled("documents") ? () => window.location.href = "/app/documents" : undefined}
          onAddPhase={() => setIsAddingPhase(true)}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground">Overdue tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Team members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(calculatedProgress)}%</span>
              </div>
              <Progress value={calculatedProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({tasks.length})
          </TabsTrigger>
          {isEnabled("notes") && (
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          )}
          {isEnabled("documents") && (
            <TabsTrigger value="documents">Docs ({documents.length})</TabsTrigger>
          )}
          {isEnabled("calendar") && (
            <TabsTrigger value="events">
              Events ({upcomingEventsCount > 0 ? `${upcomingEventsCount} upcoming` : "0"})
            </TabsTrigger>
          )}
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tasks by Phase Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tasks by Phase</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <PhaseGroupedTaskList
                    tasks={tasks}
                    projectId={projectId!}
                    onAddTask={() => setIsTaskDialogOpen(true)}
                    onEditTask={handleEditTask}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Phases Management */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Manage Phases</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhasesManager projectId={projectId!} />
                </CardContent>
              </Card>

              {/* Recent Notes Section */}
              {isEnabled("notes") && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Recent Notes</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setIsNoteDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    ) : (
                      <div className="space-y-2">
                        {notes.slice(0, 3).map((note: any) => (
                          <Link
                            key={note.id}
                            to={`/app/notes/${note.id}`}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            {note.color && (
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: note.color }}
                              />
                            )}
                            <span className="text-sm truncate">{note.title}</span>
                          </Link>
                        ))}
                        {notes.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-2">
                            +{notes.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Links Section */}
              {projectId && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Related Items</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <EntityLinksPanel entityType="project" entityId={projectId} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          {projectId && (
            <div className="mt-6">
              <AttachmentsPanel entityType="project" entityId={projectId} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Project Tasks</CardTitle>
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={taskViewMode}
                    onValueChange={(value) => value && setTaskViewMode(value as "list" | "board")}
                    size="sm"
                  >
                    <ToggleGroupItem value="list" aria-label="List view">
                      <LayoutList className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="board" aria-label="Board view">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button size="sm" onClick={() => setIsTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {taskViewMode === "list" ? (
                <PhaseGroupedTaskList
                  tasks={tasks}
                  projectId={projectId!}
                  onAddTask={() => setIsTaskDialogOpen(true)}
                  onEditTask={handleEditTask}
                />
              ) : (
                <TaskBoardView
                  tasks={tasks}
                  projectId={projectId!}
                  onAddTask={() => setIsTaskDialogOpen(true)}
                  onEditTask={handleEditTask}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="notes">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Project Notes</CardTitle>
                <Button size="sm" onClick={() => setIsNoteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-6">
              {notes.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No notes yet"
                  description="Create a note to capture ideas, meeting notes, or project documentation."
                  actionLabel="Create First Note"
                  onAction={() => setIsNoteDialogOpen(true)}
                />
              ) : (
                <div className="space-y-2">
                  {notes.map((note: any) => (
                    <Link
                      key={note.id}
                      to={`/app/notes/${note.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {note.color && (
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: note.color }}
                          />
                        )}
                        <div>
                          <span className="text-sm font-medium">{note.title}</span>
                          {note.is_pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">Pinned</Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "MMM d, yyyy")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Project Documents</CardTitle>
                <Button size="sm" asChild>
                  <Link to="/app/documents">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-6">
              {documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents yet"
                  description="Upload documents to share files with your team."
                  actionLabel="Upload Document"
                  onAction={() => window.location.href = "/app/documents"}
                />
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <Link
                      key={doc.id}
                      to={`/app/documents/${doc.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{doc.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming Events</CardTitle>
                <Button size="sm" onClick={() => setIsEventDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-6">
              {events.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming events"
                  description="Schedule events for meetings, milestones, or deadlines."
                  actionLabel="Add Project Event"
                  onAction={() => setIsEventDialogOpen(true)}
                />
              ) : (
                <div className="space-y-2">
                  {events.map((event: any) => (
                    <Link
                      key={event.id}
                      to={`/app/calendar/${event.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{event.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.all_day
                          ? format(new Date(event.start_at), "MMM d, yyyy")
                          : format(new Date(event.start_at), "MMM d, h:mm a")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="py-6">
              {members.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  description="Add team members to collaborate on this project."
                />
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <span className="text-sm font-medium">{member.user_id}</span>
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskFormDialog
        open={isTaskDialogOpen}
        onOpenChange={handleCloseTaskDialog}
        projectId={projectId}
        task={editingTask}
      />

      <NoteFormDialog
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
        projectId={projectId}
      />

      <EventFormDialog
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        defaultDate={new Date()}
        projectId={projectId}
      />

      <ProjectFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        project={project}
      />

      <SaveAsTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        project={project}
      />

      <DuplicateProjectDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        project={project}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This project will be moved to trash and can be recovered within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProject.mutate(projectId!)}
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
