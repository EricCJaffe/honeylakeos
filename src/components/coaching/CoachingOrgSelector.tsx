import { useActiveCoachingOrg } from "@/hooks/useActiveCoachingOrg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CoachingOrgSelectorProps {
  className?: string;
  showProgramBadge?: boolean;
}

export function CoachingOrgSelector({ 
  className,
  showProgramBadge = true 
}: CoachingOrgSelectorProps) {
  const { 
    availableOrgs, 
    activeOrg, 
    setActiveCoachingOrg, 
    hasMultipleOrgs, 
    isLoading 
  } = useActiveCoachingOrg();

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-48", className)} />;
  }

  if (!activeOrg) {
    return null;
  }

  const programBadgeText = activeOrg.programKey
    ? `${activeOrg.programKey}${activeOrg.programVersion ? ` v${activeOrg.programVersion}` : ""}`
    : null;

  // Single org - just display it
  if (!hasMultipleOrgs) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{activeOrg.name}</span>
        </div>
        {showProgramBadge && programBadgeText && (
          <Badge variant="secondary" className="text-xs">
            {programBadgeText}
          </Badge>
        )}
      </div>
    );
  }

  // Multiple orgs - show dropdown
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="max-w-[150px] truncate">{activeOrg.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {availableOrgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setActiveCoachingOrg(org.id)}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{org.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {org.programKey && (
                  <Badge variant="outline" className="text-xs">
                    {org.programKey}
                  </Badge>
                )}
                {org.id === activeOrg.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {showProgramBadge && programBadgeText && (
        <Badge variant="secondary" className="text-xs">
          {programBadgeText}
        </Badge>
      )}
    </div>
  );
}
