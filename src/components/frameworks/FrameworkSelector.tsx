import { useState } from "react";
import { useFrameworks, useFrameworkMutations, Framework } from "@/hooks/useFrameworks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, Layers } from "lucide-react";

interface FrameworkSelectorProps {
  onFrameworkAdopted?: (frameworkId: string) => void;
}

export function FrameworkSelector({ onFrameworkAdopted }: FrameworkSelectorProps) {
  const { data, isLoading } = useFrameworks();
  const { cloneFramework, adoptFramework } = useFrameworkMutations();
  const [cloneDialog, setCloneDialog] = useState<{ open: boolean; framework: Framework | null }>({
    open: false,
    framework: null,
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

  const openCloneDialog = (framework: Framework) => {
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

  const { systemTemplates = [], companyFrameworks = [] } = data || {};

  return (
    <div className="space-y-8">
      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Available Frameworks
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((framework) => (
              <Card key={framework.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{framework.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {framework.version_label && (
                          <Badge variant="outline" className="mr-2">
                            {framework.version_label}
                          </Badge>
                        )}
                        System Template
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {framework.description || "No description available."}
                  </p>
                  <Button
                    onClick={() => openCloneDialog(framework)}
                    className="w-full"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clone & Adopt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Company Frameworks */}
      {companyFrameworks.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Your Frameworks</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companyFrameworks.map((framework) => (
              <Card key={framework.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{framework.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge
                          variant={framework.status === "published" ? "default" : "secondary"}
                        >
                          {framework.status}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {framework.description || "No description available."}
                  </p>
                  <Button
                    onClick={() => adoptFramework.mutate(framework.id)}
                    className="w-full"
                    disabled={adoptFramework.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Adopt This Framework
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {systemTemplates.length === 0 && companyFrameworks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No frameworks available yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Clone Dialog */}
      <Dialog open={cloneDialog.open} onOpenChange={(open) => setCloneDialog({ open, framework: null })}>
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
    </div>
  );
}
