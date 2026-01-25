import { useState } from "react";
import { Package, RefreshCw, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useAvailableProgramPacksWithCounts,
  useOrgProgramStatus,
  useOrgProgramMutations,
} from "@/hooks/useOrgProgramSettings";

interface ProgramPackSettingsProps {
  coachingOrgId: string;
}

/**
 * Program Pack Settings Component
 * 
 * Allows org admins to:
 * - View current program pack
 * - Select and apply a different pack
 * - Reseed workflows from pack templates
 */
export function ProgramPackSettings({ coachingOrgId }: ProgramPackSettingsProps) {
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showReseedConfirm, setShowReseedConfirm] = useState(false);

  const { data: packs, isLoading: packsLoading } = useAvailableProgramPacksWithCounts();
  const { data: orgStatus, isLoading: statusLoading } = useOrgProgramStatus(coachingOrgId);
  const { applyPack, reseedWorkflows } = useOrgProgramMutations(coachingOrgId);

  const isLoading = packsLoading || statusLoading;
  const currentPackKey = orgStatus?.programKey || "generic";
  const effectiveSelection = selectedPackKey || currentPackKey;
  const hasChanges = selectedPackKey !== null && selectedPackKey !== currentPackKey;
  
  const selectedPack = packs?.find((p) => p.key === effectiveSelection);
  const currentPack = packs?.find((p) => p.key === currentPackKey);

  const handleApplyPack = () => {
    if (!selectedPackKey) return;
    applyPack.mutate(
      { packKey: selectedPackKey },
      {
        onSuccess: () => {
          setSelectedPackKey(null);
          setShowApplyConfirm(false);
        },
      }
    );
  };

  const handleReseed = () => {
    reseedWorkflows.mutate(
      { includeProgramPack: true },
      {
        onSuccess: () => {
          setShowReseedConfirm(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle>Program Pack</CardTitle>
        </div>
        <CardDescription>
          Select the program framework that defines your workflows, terminology, and dashboards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <div>
            <p className="text-sm font-medium">Current Pack</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              {currentPack?.name || "Generic"}
              {currentPack?.version && (
                <Badge variant="outline" className="text-xs">
                  v{currentPack.version}
                </Badge>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Org Workflows</p>
            <p className="text-lg font-semibold">{orgStatus?.workflowCount || 0}</p>
          </div>
        </div>

        {/* Pack Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Program Pack</label>
          <Select
            value={effectiveSelection}
            onValueChange={setSelectedPackKey}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a program pack" />
            </SelectTrigger>
            <SelectContent>
              {packs?.map((pack) => (
                <SelectItem key={pack.id} value={pack.key}>
                  <div className="flex items-center gap-2">
                    <span>{pack.name}</span>
                    {pack.version && (
                      <span className="text-xs text-muted-foreground">v{pack.version}</span>
                    )}
                    {pack.key === currentPackKey && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pack Preview */}
          {selectedPack && (
            <div className="mt-3 p-3 rounded-md border border-border/50 bg-background">
              <p className="text-sm text-muted-foreground mb-2">
                {selectedPack.description || "No description available."}
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{selectedPack.workflowCount} workflows</span>
                <span>{selectedPack.termCount} terminology overrides</span>
              </div>
            </div>
          )}
        </div>

        {/* Warning for existing workflows */}
        {hasChanges && orgStatus && orgStatus.workflowCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Existing Workflows</AlertTitle>
            <AlertDescription>
              Your organization has {orgStatus.workflowCount} customized workflows. 
              Changing the program pack does NOT delete your edits. 
              Use "Reseed Workflows" to pull in new pack defaults.
            </AlertDescription>
          </Alert>
        )}

        {/* Info for new orgs */}
        {hasChanges && orgStatus && orgStatus.workflowCount === 0 && (
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle>Ready to Apply</AlertTitle>
            <AlertDescription>
              No workflows yet. Applying this pack will automatically seed 
              {selectedPack ? ` ${selectedPack.workflowCount} workflows` : " workflows"} from the pack.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {/* Apply Pack Button */}
          <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!hasChanges || applyPack.isPending}
              >
                {applyPack.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Apply Pack
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply Program Pack?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This will change your organization's program pack from{" "}
                    <strong>{currentPack?.name || "Generic"}</strong> to{" "}
                    <strong>{selectedPack?.name}</strong>.
                  </p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>Terminology labels will update immediately</li>
                    <li>Dashboard widgets will reflect the new pack</li>
                    {orgStatus && orgStatus.workflowCount === 0 && (
                      <li>Workflows will be seeded from the pack</li>
                    )}
                    {orgStatus && orgStatus.workflowCount > 0 && (
                      <li>Existing workflows will NOT be modified</li>
                    )}
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApplyPack}>
                  Apply Pack
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Reseed Button */}
          <AlertDialog open={showReseedConfirm} onOpenChange={setShowReseedConfirm}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={reseedWorkflows.isPending}
              >
                {reseedWorkflows.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reseeding...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reseed Workflows
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reseed Organization Workflows?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>This will pull in the latest workflow templates from:</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Generic</strong> pack (base workflows)</li>
                    {currentPackKey !== "generic" && (
                      <li><strong>{currentPack?.name}</strong> pack (program-specific)</li>
                    )}
                  </ul>
                  <p className="mt-2">
                    <strong>Note:</strong> Existing workflows will NOT be overwritten. 
                    Only missing workflows will be created. 
                    To restore individual workflows, use "Restore to Default" in the Workflow Builder.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReseed}>
                  Reseed Workflows
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProgramPackSettings;
