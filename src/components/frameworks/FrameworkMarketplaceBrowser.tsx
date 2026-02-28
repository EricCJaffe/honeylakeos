import { useState } from "react";
import { useMarketplaceFrameworks, MarketplaceFramework } from "@/hooks/useFrameworkMarketplace";
import { useFrameworkMutations, useFramework } from "@/hooks/useFrameworks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, Layers, Building2, Check, Eye } from "lucide-react";

interface FrameworkMarketplaceBrowserProps {
  onFrameworkAdopted?: (frameworkId: string) => void;
}

export function FrameworkMarketplaceBrowser({ onFrameworkAdopted }: FrameworkMarketplaceBrowserProps) {
  const { data, isLoading } = useMarketplaceFrameworks();
  const { cloneFramework, adoptFramework } = useFrameworkMutations();
  
  const [cloneDialog, setCloneDialog] = useState<{ open: boolean; framework: MarketplaceFramework | null }>({
    open: false,
    framework: null,
  });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; frameworkId: string | null }>({
    open: false,
    frameworkId: null,
  });
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");

  const handleCloneAndAdopt = async () => {
    if (!cloneDialog.framework || !cloneName.trim()) return;

    try {
      const newFrameworkId = await cloneFramework.mutateAsync({
        sourceFrameworkId: cloneDialog.framework.id,
        newName: cloneName.trim(),
        newDescription: cloneDescription.trim() || undefined,
      });

      await adoptFramework.mutateAsync(newFrameworkId);
      setCloneDialog({ open: false, framework: null });
      setCloneName("");
      setCloneDescription("");
      onFrameworkAdopted?.(newFrameworkId);
    } catch {
      // Error handled in mutation
    }
  };

  const openCloneDialog = (framework: MarketplaceFramework) => {
    setCloneName(`${framework.name} (My Copy)`);
    setCloneDescription(framework.description || "");
    setCloneDialog({ open: true, framework });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { systemTemplates = [], recommended = [] } = data || {};

  return (
    <div className="space-y-6">
      <Tabs defaultValue={recommended.length > 0 ? "recommended" : "system"}>
        <TabsList>
          {recommended.length > 0 && (
            <TabsTrigger value="recommended">
              <Building2 className="h-4 w-4 mr-2" />
              Recommended ({recommended.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="system">
            <Layers className="h-4 w-4 mr-2" />
            System Templates ({systemTemplates.length})
          </TabsTrigger>
        </TabsList>

        {recommended.length > 0 && (
          <TabsContent value="recommended" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommended.map((framework) => (
                <FrameworkCard
                  key={framework.id}
                  framework={framework}
                  showAuthor
                  onClone={() => openCloneDialog(framework)}
                  onPreview={() => setPreviewDialog({ open: true, frameworkId: framework.id })}
                />
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="system" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((framework) => (
              <FrameworkCard
                key={framework.id}
                framework={framework}
                onClone={() => openCloneDialog(framework)}
                onPreview={() => setPreviewDialog({ open: true, frameworkId: framework.id })}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {systemTemplates.length === 0 && recommended.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No frameworks available yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Clone Dialog */}
      <Dialog open={cloneDialog.open} onOpenChange={(open) => !open && setCloneDialog({ open: false, framework: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Framework</DialogTitle>
            <DialogDescription>
              Create your own copy of "{cloneDialog.framework?.name}" that you can customize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">Framework Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter a name for your framework"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-description">Description (optional)</Label>
              <Textarea
                id="clone-description"
                value={cloneDescription}
                onChange={(e) => setCloneDescription(e.target.value)}
                placeholder="Describe your framework"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialog({ open: false, framework: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleCloneAndAdopt}
              disabled={!cloneName.trim() || cloneFramework.isPending || adoptFramework.isPending}
            >
              {cloneFramework.isPending || adoptFramework.isPending ? "Creating..." : "Clone & Adopt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <FrameworkPreviewDialog
        open={previewDialog.open}
        onOpenChange={(open) => !open && setPreviewDialog({ open: false, frameworkId: null })}
        frameworkId={previewDialog.frameworkId}
      />
    </div>
  );
}

// Framework Card Component
function FrameworkCard({
  framework,
  showAuthor = false,
  onClone,
  onPreview,
}: {
  framework: MarketplaceFramework;
  showAuthor?: boolean;
  onClone: () => void;
  onPreview: () => void;
}) {
  return (
    <Card className="relative flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{framework.name}</CardTitle>
            <CardDescription>
              {framework.version_label && (
                <Badge variant="outline" className="mr-2">
                  {framework.version_label}
                </Badge>
              )}
              {showAuthor && framework.owner_company && (
                <span className="text-xs">by {framework.owner_company.name}</span>
              )}
              {!showAuthor && <span className="text-xs">System Template</span>}
            </CardDescription>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
          {framework.short_summary || framework.description || "No description available."}
        </p>
        {framework.tags && framework.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {framework.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button onClick={onPreview} variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button onClick={onClone} size="sm" className="flex-1">
            <Copy className="h-4 w-4 mr-1" />
            Clone & Adopt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Preview Dialog Component
function FrameworkPreviewDialog({
  open,
  onOpenChange,
  frameworkId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string | null;
}) {
  const { data, isLoading } = useFramework(frameworkId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {data?.framework?.name || "Framework Preview"}
          </DialogTitle>
          <DialogDescription>
            {data?.framework?.description || "Review the framework structure before adopting."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : data ? (
            <div className="space-y-6 pr-4">
              {/* Concepts */}
              <div>
                <h4 className="font-medium mb-2">
                  Concepts ({data.concepts.filter(c => c.enabled).length})
                </h4>
                <div className="space-y-2">
                  {data.concepts.filter(c => c.enabled).map((concept) => (
                    <div key={concept.id} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{concept.display_name_singular}</span>
                      {concept.description && (
                        <span className="text-muted-foreground text-xs">
                          — {concept.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Cadences */}
              <div>
                <h4 className="font-medium mb-2">
                  Cadences ({data.cadences.filter(c => c.enabled).length})
                </h4>
                <div className="space-y-2">
                  {data.cadences.filter(c => c.enabled).map((cadence) => (
                    <div key={cadence.id} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{cadence.display_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cadence.frequency_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Dashboards */}
              <div>
                <h4 className="font-medium mb-2">
                  Dashboards ({data.dashboards.filter(d => d.enabled).length})
                </h4>
                <div className="space-y-2">
                  {data.dashboards.filter(d => d.enabled).map((dashboard) => (
                    <div key={dashboard.id} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{dashboard.display_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {dashboard.audience}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health Metrics */}
              {data.metrics.filter(m => m.enabled).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">
                      Health Metrics ({data.metrics.filter(m => m.enabled).length})
                    </h4>
                    <div className="space-y-2">
                      {data.metrics.filter(m => m.enabled).map((metric) => (
                        <div key={metric.id} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{metric.display_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Unable to load framework details.
            </p>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
