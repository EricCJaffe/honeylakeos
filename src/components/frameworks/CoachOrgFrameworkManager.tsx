import { useState } from "react";
import { 
  useCoachOrgFrameworks, 
  useFrameworkPublishingMutations, 
  useFrameworkValidation,
  MarketplaceFramework 
} from "@/hooks/useFrameworkMarketplace";
import { useFramework } from "@/hooks/useFrameworks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Layers, 
  MoreVertical, 
  Globe, 
  Lock, 
  Archive, 
  Copy, 
  AlertTriangle,
  CheckCircle,
  Users,
  Edit
} from "lucide-react";

export function CoachOrgFrameworkManager() {
  const { data: frameworks, isLoading } = useCoachOrgFrameworks();
  const { 
    publishFramework, 
    updateMarketplaceVisibility, 
    createNewVersion, 
    archiveFramework,
    updateFrameworkMetadata 
  } = useFrameworkPublishingMutations();

  const [publishDialog, setPublishDialog] = useState<{ open: boolean; framework: MarketplaceFramework | null }>({
    open: false,
    framework: null,
  });
  const [versionDialog, setVersionDialog] = useState<{ open: boolean; framework: MarketplaceFramework | null }>({
    open: false,
    framework: null,
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; framework: MarketplaceFramework | null }>({
    open: false,
    framework: null,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const draftFrameworks = (frameworks || []).filter(f => f.status === "draft");
  const publishedFrameworks = (frameworks || []).filter(f => f.status === "published");

  return (
    <div className="space-y-8">
      {/* Published Frameworks */}
      {publishedFrameworks.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Published Frameworks
          </h3>
          <div className="space-y-4">
            {publishedFrameworks.map((framework) => (
              <FrameworkManagerCard
                key={framework.id}
                framework={framework}
                onChangeVisibility={(visibility) => 
                  updateMarketplaceVisibility.mutate({ frameworkId: framework.id, visibility })
                }
                onCreateVersion={() => setVersionDialog({ open: true, framework })}
                onArchive={() => archiveFramework.mutate(framework.id)}
                onEdit={() => setEditDialog({ open: true, framework })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Draft Frameworks */}
      {draftFrameworks.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Draft Frameworks
          </h3>
          <div className="space-y-4">
            {draftFrameworks.map((framework) => (
              <FrameworkManagerCard
                key={framework.id}
                framework={framework}
                onPublish={() => setPublishDialog({ open: true, framework })}
                onArchive={() => archiveFramework.mutate(framework.id)}
                onEdit={() => setEditDialog({ open: true, framework })}
              />
            ))}
          </div>
        </section>
      )}

      {(!frameworks || frameworks.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No frameworks yet. Create a framework to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Publish Dialog */}
      <PublishFrameworkDialog
        open={publishDialog.open}
        framework={publishDialog.framework}
        onOpenChange={(open) => !open && setPublishDialog({ open: false, framework: null })}
        onPublish={async (visibility, summary, tags) => {
          if (publishDialog.framework) {
            await publishFramework.mutateAsync({
              frameworkId: publishDialog.framework.id,
              visibility,
              shortSummary: summary,
              tags,
            });
            setPublishDialog({ open: false, framework: null });
          }
        }}
        isPending={publishFramework.isPending}
      />

      {/* Version Dialog */}
      <CreateVersionDialog
        open={versionDialog.open}
        framework={versionDialog.framework}
        onOpenChange={(open) => !open && setVersionDialog({ open: false, framework: null })}
        onCreateVersion={async (versionLabel) => {
          if (versionDialog.framework) {
            await createNewVersion.mutateAsync({
              sourceFrameworkId: versionDialog.framework.id,
              newVersionLabel: versionLabel,
            });
            setVersionDialog({ open: false, framework: null });
          }
        }}
        isPending={createNewVersion.isPending}
      />

      {/* Edit Metadata Dialog */}
      <EditMetadataDialog
        open={editDialog.open}
        framework={editDialog.framework}
        onOpenChange={(open) => !open && setEditDialog({ open: false, framework: null })}
        onSave={async (summary, tags) => {
          if (editDialog.framework) {
            await updateFrameworkMetadata.mutateAsync({
              frameworkId: editDialog.framework.id,
              shortSummary: summary,
              tags,
            });
            setEditDialog({ open: false, framework: null });
          }
        }}
        isPending={updateFrameworkMetadata.isPending}
      />
    </div>
  );
}

// Framework Manager Card
function FrameworkManagerCard({
  framework,
  onPublish,
  onChangeVisibility,
  onCreateVersion,
  onArchive,
  onEdit,
}: {
  framework: MarketplaceFramework;
  onPublish?: () => void;
  onChangeVisibility?: (visibility: "private" | "coach_org_clients") => void;
  onCreateVersion?: () => void;
  onArchive: () => void;
  onEdit: () => void;
}) {
  const isPublished = framework.status === "published";
  const isSharedToClients = framework.marketplace_visibility === "coach_org_clients";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {framework.name}
              {framework.version_label && (
                <Badge variant="outline">{framework.version_label}</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge variant={isPublished ? "default" : "secondary"}>
                {framework.status}
              </Badge>
              {isPublished && (
                <Badge variant={isSharedToClients ? "default" : "outline"} className="flex items-center gap-1">
                  {isSharedToClients ? (
                    <>
                      <Users className="h-3 w-3" />
                      Shared to Clients
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      Private
                    </>
                  )}
                </Badge>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              {!isPublished && onPublish && (
                <DropdownMenuItem onClick={onPublish}>
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}
              {isPublished && onChangeVisibility && (
                <>
                  {isSharedToClients ? (
                    <DropdownMenuItem onClick={() => onChangeVisibility("private")}>
                      <Lock className="h-4 w-4 mr-2" />
                      Make Private
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onChangeVisibility("coach_org_clients")}>
                      <Users className="h-4 w-4 mr-2" />
                      Share to Clients
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {isPublished && onCreateVersion && (
                <DropdownMenuItem onClick={onCreateVersion}>
                  <Copy className="h-4 w-4 mr-2" />
                  Create New Version
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive} className="text-destructive">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {framework.short_summary && (
          <p className="text-sm text-muted-foreground mt-2">{framework.short_summary}</p>
        )}
        {framework.tags && framework.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {framework.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

// Publish Framework Dialog
function PublishFrameworkDialog({
  open,
  framework,
  onOpenChange,
  onPublish,
  isPending,
}: {
  open: boolean;
  framework: MarketplaceFramework | null;
  onOpenChange: (open: boolean) => void;
  onPublish: (visibility: "private" | "coach_org_clients", summary: string, tags: string[]) => Promise<void>;
  isPending: boolean;
}) {
  const [visibility, setVisibility] = useState<"private" | "coach_org_clients">("private");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  
  const { data: validation, isLoading: validating } = useFrameworkValidation(framework?.id || null);

  const handlePublish = () => {
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    onPublish(visibility, summary, tags);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Framework</DialogTitle>
          <DialogDescription>
            Make "{framework?.name}" available for use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Validation */}
          {validating ? (
            <Skeleton className="h-16 w-full" />
          ) : validation && !validation.isValid ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validation.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Framework is ready to publish ({validation?.conceptCount} concepts, {validation?.dashboardCount} dashboards)
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "private" | "coach_org_clients")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private (internal use only)
                  </div>
                </SelectItem>
                <SelectItem value="coach_org_clients">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Share to Clients
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary (1-2 lines)</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description for marketplace display"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., EOS, Leadership, Weekly"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPending || (validation && !validation.isValid)}
          >
            {isPending ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Version Dialog
function CreateVersionDialog({
  open,
  framework,
  onOpenChange,
  onCreateVersion,
  isPending,
}: {
  open: boolean;
  framework: MarketplaceFramework | null;
  onOpenChange: (open: boolean) => void;
  onCreateVersion: (versionLabel: string) => Promise<void>;
  isPending: boolean;
}) {
  const [versionLabel, setVersionLabel] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>
            Create a new version of "{framework?.name}" that you can modify without affecting the current version.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version">Version Label</Label>
            <Input
              id="version"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g., v2.0, 2024 Update"
            />
            <p className="text-xs text-muted-foreground">
              Current version: {framework?.version_label || "No label"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreateVersion(versionLabel)}
            disabled={isPending || !versionLabel.trim()}
          >
            {isPending ? "Creating..." : "Create Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Metadata Dialog
function EditMetadataDialog({
  open,
  framework,
  onOpenChange,
  onSave,
  isPending,
}: {
  open: boolean;
  framework: MarketplaceFramework | null;
  onOpenChange: (open: boolean) => void;
  onSave: (summary: string, tags: string[]) => Promise<void>;
  isPending: boolean;
}) {
  const [summary, setSummary] = useState(framework?.short_summary || "");
  const [tagsInput, setTagsInput] = useState(framework?.tags?.join(", ") || "");

  // Update state when framework changes
  useState(() => {
    if (framework) {
      setSummary(framework.short_summary || "");
      setTagsInput(framework.tags?.join(", ") || "");
    }
  });

  const handleSave = () => {
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    onSave(summary, tags);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Framework Details</DialogTitle>
          <DialogDescription>
            Update the marketplace metadata for "{framework?.name}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-summary">Summary</Label>
            <Textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description for marketplace display"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags (comma separated)</Label>
            <Input
              id="edit-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., EOS, Leadership, Weekly"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
