import { UserCheck, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDetachFromCoaching } from "@/hooks/useCoachingAssignmentsUnified";

type SourceType = "internal" | "coaching_template" | "coaching_manual";

interface ProvenanceBadgeProps {
  sourceType?: SourceType | null;
  coachingEngagementId?: string | null;
  detachedFromCoachingAt?: string | null;
  className?: string;
}

export function ProvenanceBadge({
  sourceType,
  coachingEngagementId,
  detachedFromCoachingAt,
  className,
}: ProvenanceBadgeProps) {
  if (!sourceType || sourceType === "internal") {
    if (detachedFromCoachingAt) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={className}>
              <Unlink className="h-3 w-3 mr-1" />
              Detached
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Previously assigned by coach, now internal
          </TooltipContent>
        </Tooltip>
      );
    }
    return null;
  }

  if (sourceType === "coaching_template" || sourceType === "coaching_manual") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={className}>
            <UserCheck className="h-3 w-3 mr-1" />
            Assigned by Coach
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {sourceType === "coaching_template"
            ? "Created from a coaching template"
            : "Manually created by coach"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}

interface DetachButtonProps {
  table: "tasks" | "projects" | "notes";
  id: string;
  sourceType?: SourceType | null;
  coachingEngagementId?: string | null;
  isAdmin?: boolean;
}

export function DetachFromCoachingButton({
  table,
  id,
  sourceType,
  coachingEngagementId,
  isAdmin = false,
}: DetachButtonProps) {
  const detachMutation = useDetachFromCoaching();

  // Only show for coaching-scoped items to admins
  if (!isAdmin) return null;
  if (!sourceType || sourceType === "internal") return null;
  if (!coachingEngagementId) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Unlink className="h-4 w-4 mr-1" />
          Convert to Internal
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to Internal Item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will detach the item from coaching. The coach will no longer have
            visibility unless they have broader access grants. The item will become
            a regular internal {table.slice(0, -1)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => detachMutation.mutate({ table, id })}
            disabled={detachMutation.isPending}
          >
            Convert to Internal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SourceFilterProps {
  value: "all" | "internal" | "coaching";
  onChange: (value: "all" | "internal" | "coaching") => void;
}

export function SourceFilter({ value, onChange }: SourceFilterProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Button
        variant={value === "all" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onChange("all")}
      >
        All
      </Button>
      <Button
        variant={value === "internal" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onChange("internal")}
      >
        Internal
      </Button>
      <Button
        variant={value === "coaching" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onChange("coaching")}
      >
        <UserCheck className="h-3 w-3 mr-1" />
        Coaching
      </Button>
    </div>
  );
}
