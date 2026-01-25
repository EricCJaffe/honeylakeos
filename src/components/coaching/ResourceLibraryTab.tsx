import { useState } from "react";
import { Plus, Link, FileText, Video, File, ClipboardList, MoreVertical, ExternalLink, Archive, Edit, FolderOpen } from "lucide-react";
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
  useCoachingResources,
  useCoachingResourceMutations,
  useCoachingCollections,
  useCoachingCollectionMutations,
  CoachingResource,
  CoachingResourceCollection,
  getResourceTypeLabel,
} from "@/hooks/useCoachingResources";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import type { Database } from "@/integrations/supabase/types";

type ResourceType = Database["public"]["Enums"]["coaching_resource_type"];

const resourceTypeIcons: Record<ResourceType, React.ElementType> = {
  link: Link,
  file: File,
  video: Video,
  document: FileText,
  worksheet: ClipboardList,
};

interface ResourceFormData {
  title: string;
  description: string;
  resource_type: ResourceType;
  url: string;
  tags: string;
  program_key: string;
}

interface CollectionFormData {
  name: string;
  description: string;
  program_key: string;
}

export function ResourceLibraryTab() {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: resources, isLoading: resourcesLoading } = useCoachingResources(activeCoachingOrgId);
  const { data: collections, isLoading: collectionsLoading } = useCoachingCollections(activeCoachingOrgId);
  const { createResource, updateResource, archiveResource } = useCoachingResourceMutations();
  const { createCollection, updateCollection, archiveCollection } = useCoachingCollectionMutations();

  const [activeTab, setActiveTab] = useState<"resources" | "collections">("resources");
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CoachingResource | null>(null);
  const [editingCollection, setEditingCollection] = useState<CoachingResourceCollection | null>(null);

  const [resourceForm, setResourceForm] = useState<ResourceFormData>({
    title: "",
    description: "",
    resource_type: "link",
    url: "",
    tags: "",
    program_key: "",
  });

  const [collectionForm, setCollectionForm] = useState<CollectionFormData>({
    name: "",
    description: "",
    program_key: "",
  });

  const handleOpenResourceDialog = (resource?: CoachingResource) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        title: resource.title,
        description: resource.description || "",
        resource_type: resource.resource_type,
        url: resource.url || "",
        tags: resource.tags?.join(", ") || "",
        program_key: resource.program_key || "",
      });
    } else {
      setEditingResource(null);
      setResourceForm({
        title: "",
        description: "",
        resource_type: "link",
        url: "",
        tags: "",
        program_key: "",
      });
    }
    setResourceDialogOpen(true);
  };

  const handleOpenCollectionDialog = (collection?: CoachingResourceCollection) => {
    if (collection) {
      setEditingCollection(collection);
      setCollectionForm({
        name: collection.name,
        description: collection.description || "",
        program_key: collection.program_key || "",
      });
    } else {
      setEditingCollection(null);
      setCollectionForm({
        name: "",
        description: "",
        program_key: "",
      });
    }
    setCollectionDialogOpen(true);
  };

  const handleSaveResource = async () => {
    const tags = resourceForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingResource) {
      await updateResource.mutateAsync({
        id: editingResource.id,
        title: resourceForm.title,
        description: resourceForm.description || null,
        resource_type: resourceForm.resource_type,
        url: resourceForm.url || null,
        tags: tags.length > 0 ? tags : null,
        program_key: resourceForm.program_key || null,
      });
    } else {
      await createResource.mutateAsync({
        title: resourceForm.title,
        description: resourceForm.description,
        resource_type: resourceForm.resource_type,
        url: resourceForm.url,
        tags,
        program_key: resourceForm.program_key,
      });
    }
    setResourceDialogOpen(false);
  };

  const handleSaveCollection = async () => {
    if (editingCollection) {
      await updateCollection.mutateAsync({
        id: editingCollection.id,
        name: collectionForm.name,
        description: collectionForm.description || null,
        program_key: collectionForm.program_key || null,
      });
    } else {
      await createCollection.mutateAsync({
        name: collectionForm.name,
        description: collectionForm.description,
        program_key: collectionForm.program_key,
      });
    }
    setCollectionDialogOpen(false);
  };

  const isLoading = resourcesLoading || collectionsLoading;

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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "resources" | "collections")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            onClick={() =>
              activeTab === "resources"
                ? handleOpenResourceDialog()
                : handleOpenCollectionDialog()
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "resources" ? "Add Resource" : "Add Collection"}
          </Button>
        </div>

        <TabsContent value="resources" className="mt-4">
          {resources?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No resources yet. Add your first resource to get started.
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
                const IconComponent = resourceTypeIcons[resource.resource_type] || File;
                return (
                  <Card key={resource.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                          <Badge variant="secondary">{getResourceTypeLabel(resource.resource_type)}</Badge>
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

        <TabsContent value="collections" className="mt-4">
          {collections?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No collections yet. Create a collection to group related resources.
                </p>
                <Button className="mt-4" onClick={() => handleOpenCollectionDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections?.map((collection) => (
                <Card key={collection.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenCollectionDialog(collection)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => archiveCollection.mutate(collection.id)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-base mt-2">{collection.name}</CardTitle>
                    {collection.description && (
                      <CardDescription className="line-clamp-2">
                        {collection.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{collection.items?.length || 0} resources</span>
                      {collection.program_key && (
                        <Badge variant="secondary" className="text-xs">
                          {collection.program_key}
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
              {editingResource
                ? "Update the resource details."
                : "Add a new resource to your library."}
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
                value={resourceForm.resource_type}
                onValueChange={(v) =>
                  setResourceForm({ ...resourceForm, resource_type: v as ResourceType })
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
                placeholder="Brief description of the resource"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={resourceForm.tags}
                onChange={(e) => setResourceForm({ ...resourceForm, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
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

      {/* Collection Dialog */}
      <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCollection ? "Edit Collection" : "Create Collection"}</DialogTitle>
            <DialogDescription>
              {editingCollection
                ? "Update the collection details."
                : "Create a new collection to group related resources."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={collectionForm.name}
                onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                placeholder="Collection name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="col-description">Description</Label>
              <Textarea
                id="col-description"
                value={collectionForm.description}
                onChange={(e) =>
                  setCollectionForm({ ...collectionForm, description: e.target.value })
                }
                placeholder="Brief description of the collection"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="col-program_key">Program Key (optional)</Label>
              <Input
                id="col-program_key"
                value={collectionForm.program_key}
                onChange={(e) =>
                  setCollectionForm({ ...collectionForm, program_key: e.target.value })
                }
                placeholder="e.g., eos, c12"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCollection}
              disabled={
                !collectionForm.name || createCollection.isPending || updateCollection.isPending
              }
            >
              {editingCollection ? "Save Changes" : "Create Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
