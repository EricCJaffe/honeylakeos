import { User, Calendar, Building2, Users, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

interface OwnershipInfo {
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  scopeType: "site" | "company" | "group";
}

interface DefinitionOwnershipPanelProps {
  ownership: OwnershipInfo;
  className?: string;
}

const SCOPE_ICONS = {
  site: Globe,
  company: Building2,
  group: Users,
};

const SCOPE_LABELS = {
  site: "Site-wide",
  company: "Company",
  group: "Group",
};

export function DefinitionOwnershipPanel({
  ownership,
  className,
}: DefinitionOwnershipPanelProps) {
  const ScopeIcon = SCOPE_ICONS[ownership.scopeType];

  return (
    <div className={`rounded-lg border bg-muted/30 p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <ScopeIcon className="h-4 w-4 text-muted-foreground" />
        <span>Definition Info</span>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Scope</span>
          <Badge variant="outline" className="capitalize gap-1">
            <ScopeIcon className="h-3 w-3" />
            {SCOPE_LABELS[ownership.scopeType]}
          </Badge>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> Owner
          </span>
          <span className="font-medium text-xs">
            {ownership.createdBy ? ownership.createdBy.slice(0, 8) : "Unknown"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Created
          </span>
          <span className="text-xs">
            {formatDistanceToNow(new Date(ownership.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last Modified</span>
          <span className="text-xs">
            {formatDistanceToNow(new Date(ownership.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {ownership.publishedAt && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Published</span>
              <span className="text-xs">
                {formatDistanceToNow(new Date(ownership.publishedAt), { addSuffix: true })}
              </span>
            </div>
            {ownership.publishedBy && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Published By</span>
                <span className="text-xs font-medium">
                  {ownership.publishedBy.slice(0, 8)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
