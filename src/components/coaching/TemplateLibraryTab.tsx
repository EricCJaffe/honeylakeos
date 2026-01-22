import { useState } from "react";
import { Plus, Link, FileText, Video, File, ClipboardList, MoreVertical, ExternalLink, Archive, Edit, FolderOpen, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTemplateResources,
  useTemplateResourceMutations,
  useTemplateTaskSets,
  useTemplateTaskSetMutations,
  CoachingTemplateResource,
  CoachingTemplateTaskSet,
  getTemplateTypeLabel,
} from "@/hooks/useCoachingAssignmentsUnified";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import type { Database } from "@/integrations/supabase/types";

type TemplateType = Database["public"]["Enums"]["coaching_template_type"];

const templateTypeIcons: Record<TemplateType, React.ElementType> = {
  link: Link,
  file: File,
  video: Video,
  document: FileText,
  worksheet: ClipboardList,
};

interface ResourceFormData {
  title: string;
  description: string;
  template_type: TemplateType;
  url: string;
  tags: string;
  program_key: string;
}

interface TaskSetFormData {
  name: string;
  description: string;
  program_key: string;
}

export function TemplateLibraryTab() {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: resources, isLoading: resourcesLoading } = useTemplateResources(activeCoachingOrgId);
  const { data: taskSets, isLoading: taskSetsLoading } = useTemplateTaskSets(activeCoachingOrgId);
  const { createResource, updateResource, archiveResource } = useTemplateResourceMutations();
  const { createTaskSet, archiveTaskSet } = useTemplateTaskSetMutations();

  const [activeTab, setActiveTab] = useState<"resources" | "task-sets">("resources");
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [taskSetDialogOpen, setTaskSetDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CoachingTemplateResource | null>(null);

  const [resourceForm, setResourceForm] = useState<ResourceFormData>({
    title: "",
    description: "",
    template_type: "link",
    url: "",
    tags: "",
    program_key: "",
  });

  const [taskSetForm, setTaskSetForm] = useState<TaskSetFormData>({
    name: "",
    description: "",
    program_key: "",
  });

  const handleOpenResourceDialog = (resource?: CoachingTemplateResource) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        title: resource.title,
        description: resource.description || "",
        template_type: resource.template_type,
        url: resource.url || "",
        tags: resource.tags?.join(", ") || "",
        program_key: resource.program_key || "",
      });
    } else {
      setEditingResource(null);
      setResourceForm({
        title: "",
        description: "",
        template_type: "link",
        url: "",
        tags: "",
        program_key: "",
      });
    }
    setResourceDialogOpen(true);
  };

  const handleOpenTaskSetDialog = () => {
    setTaskSetForm({ name: "", description: "", program_key: "" });
    setTaskSetDialogOpen(true);
  };

  const handleSaveResource = async () => {
    const tags = resourceForm.tags.split(",").map((t) => t.trim()).filter(Boolean);

    if (editingResource) {
      await updateResource.mutateAsync({
        id: editingResource.id,
        title: resourceForm.title,
        description: resourceForm.description || undefined,
        template_type: resourceForm.template_type,
        url: resourceForm.url || undefined,
        tags: tags.length > 0 ? tags : undefined,
        program_key: resourceForm.program_key || undefined,
      });
    } else {
      await createResource.mutateAsync({
        title: resourceForm.title,
        description: resourceForm.description,
        template_type: resourceForm.template_type,
        url: resourceForm.url,
        tags,
        program_key: resourceForm.program_key,
      });
    }
    setResourceDialogOpen(false);
  };

  const handleSaveTaskSet = async () => {
    await createTaskSet.mutateAsync({
      name: taskSetForm.name,
      description: taskSetForm.description,
      program_key: taskSetForm.program_key,
    });
    setTaskSetDialogOpen(false);
  };

  const isLoading = resourcesLoading || taskSetsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "resources" | "task-sets")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="task-sets">Task Sets</TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            onClick={() =>
              activeTab === "resources" ? handleOpenResourceDialog() : handleOpenTaskSetDialog()
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "resources" ? "Add Resource" : "Add Task Set"}
          </Button>
        </div>

        <TabsContent value="resources" className="mt-4">
          {resources?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No template resources yet. Add your first resource to get started.
                </p>
                <Button className="mt-4" onClick={() => handleOpenResourceDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Resource
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resources?.map((resource) => {
                const IconComponent = templateTypeIcons[resource.template_type] || File;
                return (
                  <Card key={resource.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                          <Badge variant="secondary">{getTemplateTypeLabel(resource.template_type)}</Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenResourceDialog(resource)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {resource.url && (
                              <DropdownMenuItem asChild>
                                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open Link
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => archiveResource.mutate(resource.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-base mt-2">{resource.title}</CardTitle>
                      {resource.description && (
                        <CardDescription className="line-clamp-2">
                          {resource.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {resource.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {resource.program_key && (
                          <Badge variant="secondary" className="text-xs">
                            {resource.program_key}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="task-sets" className="mt-4">
          {taskSets?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No task sets yet. Create a task set to define reusable task templates.
                </p>
                <Button className="mt-4" onClick={handleOpenTaskSetDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task Set
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {taskSets?.map((taskSet) => (
                <Card key={taskSet.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <ListTodo className="h-5 w-5 text-muted-foreground" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => archiveTaskSet.mutate(taskSet.id)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-base mt-2">{taskSet.name}</CardTitle>
                    {taskSet.description && (
                      <CardDescription className="line-clamp-2">
                        {taskSet.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{taskSet.tasks?.length || 0} tasks</span>
                      {taskSet.program_key && (
                        <Badge variant="secondary" className="text-xs">
                          {taskSet.program_key}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
            <DialogDescription>
              {editingResource ? "Update the resource details." : "Add a new template resource."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={resourceForm.title}
                onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                placeholder="Resource title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={resourceForm.template_type}
                onValueChange={(v) =>
                  setResourceForm({ ...resourceForm, template_type: v as TemplateType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="worksheet">Worksheet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={resourceForm.url}
                onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={resourceForm.description}
                onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                placeholder="Brief description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={resourceForm.tags}
                onChange={(e) => setResourceForm({ ...resourceForm, tags: e.target.value })}
                placeholder="tag1, tag2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program_key">Program Key (optional)</Label>
              <Input
                id="program_key"
                value={resourceForm.program_key}
                onChange={(e) => setResourceForm({ ...resourceForm, program_key: e.target.value })}
                placeholder="e.g., eos, c12"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveResource}
              disabled={!resourceForm.title || createResource.isPending || updateResource.isPending}
            >
              {editingResource ? "Save Changes" : "Add Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Set Dialog */}
      <Dialog open={taskSetDialogOpen} onOpenChange={setTaskSetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task Set</DialogTitle>
            <DialogDescription>
              Create a reusable set of tasks that can be assigned to engagements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={taskSetForm.name}
                onChange={(e) => setTaskSetForm({ ...taskSetForm, name: e.target.value })}
                placeholder="Task set name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ts-description">Description</Label>
              <Textarea
                id="ts-description"
                value={taskSetForm.description}
                onChange={(e) => setTaskSetForm({ ...taskSetForm, description: e.target.value })}
                placeholder="Brief description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ts-program_key">Program Key (optional)</Label>
              <Input
                id="ts-program_key"
                value={taskSetForm.program_key}
                onChange={(e) => setTaskSetForm({ ...taskSetForm, program_key: e.target.value })}
                placeholder="e.g., eos, c12"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskSetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTaskSet}
              disabled={!taskSetForm.name || createTaskSet.isPending}
            >
              Create Task Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
