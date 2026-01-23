import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { 
  useOrgWorkflows, 
  useOrgWorkflowMutations,
  OrgWorkflow 
} from "@/hooks/useOrgWorkflows";
import { 
  MoreVertical, 
  Edit, 
  RotateCcw, 
  Lock, 
  Unlock,
  Play,
  Pause,
  Settings2,
  Download,
} from "lucide-react";

interface WorkflowBuilderListProps {
  coachingOrgId: string;
  programKey: string;
  onEditWorkflow: (workflowId: string) => void;
}

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  engagement_lifecycle: "Engagement Lifecycle",
  member_onboarding: "Member Onboarding",
  coach_assignment: "Coach Assignment",
  coaching_cadence: "Coaching Cadence",
  periodic_review: "Periodic Review",
  chair_recruitment: "Chair Recruitment",
  chair_onboarding: "Chair Onboarding",
  forum_launch: "Forum Launch",
  forum_cadence: "Forum Cadence",
  quarterly_review: "Quarterly Review",
  annual_meeting: "Annual Meeting",
  quarterly_meeting: "Quarterly Meeting",
  monthly_meeting: "Monthly Meeting",
  one_on_one: "1:1 Session",
  content_creation: "Content Creation",
  operations: "Operations",
};

export function WorkflowBuilderList({ 
  coachingOrgId, 
  programKey,
  onEditWorkflow 
}: WorkflowBuilderListProps) {
  const { data: workflows, isLoading } = useOrgWorkflows(coachingOrgId);
  const mutations = useOrgWorkflowMutations(coachingOrgId);
  const [restoreWorkflow, setRestoreWorkflow] = React.useState<OrgWorkflow | null>(null);

  // Group by source pack - must be before early return
  const groupedWorkflows = React.useMemo(() => {
    if (!workflows) return {};
    return workflows.reduce((acc, wf) => {
      const key = wf.source_pack_key;
      if (!acc[key]) acc[key] = [];
      acc[key].push(wf);
      return acc;
    }, {} as Record<string, OrgWorkflow[]>);
  }, [workflows]);

  const hasWorkflows = workflows && workflows.length > 0;

  const handleSeedFromPack = async () => {
    // Seed from both generic and the current program pack
    await mutations.seedFromPack.mutateAsync({ packKey: "generic" });
    if (programKey !== "generic") {
      await mutations.seedFromPack.mutateAsync({ packKey: programKey });
    }
  };

  const handleToggleActive = async (workflow: OrgWorkflow) => {
    await mutations.updateWorkflow.mutateAsync({
      workflowId: workflow.id,
      updates: { is_active: !workflow.is_active },
    });
  };

  const handleRestore = async () => {
    if (!restoreWorkflow) return;
    await mutations.restoreFromPack.mutateAsync({ workflowId: restoreWorkflow.id });
    setRestoreWorkflow(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workflow Templates</h2>
          <p className="text-sm text-muted-foreground">
            Manage workflows seeded from program packs
          </p>
        </div>
        <Button 
          onClick={handleSeedFromPack}
          disabled={mutations.seedFromPack.isPending}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          {mutations.seedFromPack.isPending ? "Seeding..." : "Seed from Pack"}
        </Button>
      </div>

      {!hasWorkflows ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No workflows configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Seed workflows from your program pack to get started.
            </p>
            <Button 
              onClick={handleSeedFromPack}
              disabled={mutations.seedFromPack.isPending}
              className="mt-4"
            >
              <Download className="mr-2 h-4 w-4" />
              Seed Workflows
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedWorkflows).map(([packKey, packWorkflows]) => (
            <div key={packKey}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {packKey === "generic" ? "Generic Workflows" : `${packKey.charAt(0).toUpperCase() + packKey.slice(1)} Workflows`}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {packWorkflows.length}
                </Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {packWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onEdit={() => onEditWorkflow(workflow.id)}
                    onToggleActive={() => handleToggleActive(workflow)}
                    onRestore={() => setRestoreWorkflow(workflow)}
                    isUpdating={mutations.updateWorkflow.isPending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreWorkflow} onOpenChange={() => setRestoreWorkflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to Pack Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset "{restoreWorkflow?.name}" to its original pack template, 
              discarding any customizations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore}
              disabled={mutations.restoreFromPack.isPending}
            >
              {mutations.restoreFromPack.isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface WorkflowCardProps {
  workflow: OrgWorkflow;
  onEdit: () => void;
  onToggleActive: () => void;
  onRestore: () => void;
  isUpdating: boolean;
}

function WorkflowCard({ workflow, onEdit, onToggleActive, onRestore, isUpdating }: WorkflowCardProps) {
  const canEdit = !workflow.is_locked && workflow.editable_fields.includes("steps");
  
  return (
    <Card className={!workflow.is_active ? "opacity-60" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {workflow.name}
              {workflow.is_locked && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription>
              {WORKFLOW_TYPE_LABELS[workflow.workflow_type] || workflow.workflow_type}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={workflow.source_pack_key === "generic" ? "secondary" : "default"}
              className="text-xs"
            >
              {workflow.source_pack_key}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Workflow
                </DropdownMenuItem>
                {workflow.source_pack_template_id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onRestore}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore from Pack
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {workflow.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {workflow.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            {workflow.is_locked ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Locked
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Unlock className="h-3.5 w-3.5" />
                Editable
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {workflow.is_active ? (
              <Badge variant="outline" className="text-xs">
                <Play className="mr-1 h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Pause className="mr-1 h-3 w-3" />
                Inactive
              </Badge>
            )}
            <Switch
              checked={workflow.is_active}
              onCheckedChange={onToggleActive}
              disabled={isUpdating || workflow.is_locked}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
