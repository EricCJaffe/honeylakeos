import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Filter,
  User,
  Users,
  MapPin,
  Mail,
  Shield,
  Briefcase,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog {
  id: string;
  company_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "employee.created": "Employee Created",
  "employee.updated": "Employee Updated",
  "employee.archived": "Employee Archived",
  "employee.restored": "Employee Restored",
  "employee.linked": "Employee Linked to User",
  "employee.deleted": "Employee Deleted",
  "group_member.added": "Added to Group",
  "group_member.removed": "Removed from Group",
  "group_member.role_changed": "Group Role Changed",
  "location_member.added": "Added to Location",
  "location_member.removed": "Removed from Location",
  "location_member.role_changed": "Location Role Changed",
  "membership.created": "Membership Created",
  "membership.role_changed": "Role Changed",
  "membership.status_changed": "Membership Status Changed",
  "membership.deleted": "Membership Deleted",
  "invite.sent": "Invitation Sent",
  "invite.accepted": "Invitation Accepted",
  "invite.revoked": "Invitation Revoked",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  employee: Briefcase,
  group_member: Users,
  location_member: MapPin,
  membership: Shield,
  invite: Mail,
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  added: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  updated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  role_changed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  status_changed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  restored: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  linked: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function getActionColor(action: string): string {
  const actionType = action.split(".")[1] || "";
  return ACTION_COLORS[actionType] || "bg-muted text-muted-foreground";
}

export default function AuditLogPage() {
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!activeCompanyId && isCompanyAdmin,
  });

  // Get unique entity types and actions for filters
  const entityTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.entity_type));
    return Array.from(types).sort();
  }, [logs]);

  const actionTypes = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return Array.from(actions).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (entityFilter !== "all") {
      result = result.filter((l) => l.entity_type === entityFilter);
    }

    if (actionFilter !== "all") {
      result = result.filter((l) => l.action === actionFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const actionLabel = ACTION_LABELS[l.action] || l.action;
        const metaStr = JSON.stringify(l.metadata).toLowerCase();
        return (
          actionLabel.toLowerCase().includes(q) ||
          l.entity_type.toLowerCase().includes(q) ||
          metaStr.includes(q)
        );
      });
    }

    return result;
  }, [logs, entityFilter, actionFilter, search]);

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="No company selected"
          description="Please select a company to view audit logs."
        />
      </div>
    );
  }

  if (!isCompanyAdmin) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need to be a company admin to view audit logs."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log"
        description="Track all changes and actions in your organization"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actionTypes.map((action) => (
              <SelectItem key={action} value={action}>
                {ACTION_LABELS[action] || action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredLogs.length} of {logs.length} log entries
      </p>

      {/* Log entries */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No logs found"
          description={
            logs.length === 0
              ? "No audit events have been recorded yet."
              : "Try adjusting your filters."
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const Icon = ENTITY_ICONS[log.entity_type] || User;
            const isExpanded = expandedId === log.id;

            return (
              <Collapsible
                key={log.id}
                open={isExpanded}
                onOpenChange={(open) => setExpandedId(open ? log.id : null)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getActionColor(log.action)}`}
                            >
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>

                          <p className="text-sm mt-1 truncate">
                            {formatLogSummary(log)}
                          </p>
                        </div>

                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">
                        <h4 className="font-medium mb-2">Details</h4>
                        <pre className="text-xs overflow-auto whitespace-pre-wrap text-muted-foreground">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Entity:</span>{" "}
                            {log.entity_type}
                            {log.entity_id && ` (${log.entity_id.slice(0, 8)}...)`}
                          </p>
                          <p>
                            <span className="font-medium">Actor:</span>{" "}
                            {log.actor_user_id?.slice(0, 8) || "System"}...
                          </p>
                          <p>
                            <span className="font-medium">Log ID:</span>{" "}
                            {log.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatLogSummary(log: AuditLog): string {
  const meta = log.metadata as Record<string, unknown>;

  switch (log.action) {
    case "employee.created":
      return `Created employee "${meta.full_name || "Unknown"}"`;
    case "employee.updated":
      return `Updated employee "${meta.full_name || "Unknown"}"`;
    case "employee.archived":
      return `Archived employee "${meta.full_name || "Unknown"}"`;
    case "employee.restored":
      return `Restored employee "${meta.full_name || "Unknown"}"`;
    case "employee.linked":
      return `Linked employee "${meta.full_name || "Unknown"}" to user account`;
    case "employee.deleted":
      return `Deleted employee "${meta.full_name || "Unknown"}"`;

    case "group_member.added":
      return `Added user to group "${meta.group_name || "Unknown"}" as ${meta.role}`;
    case "group_member.removed":
      return `Removed user from group "${meta.group_name || "Unknown"}"`;
    case "group_member.role_changed":
      return `Changed role in "${meta.group_name || "Unknown"}" from ${meta.from_role} to ${meta.to_role}`;

    case "location_member.added":
      return `Added user to location "${meta.location_name || "Unknown"}" as ${meta.role}`;
    case "location_member.removed":
      return `Removed user from location "${meta.location_name || "Unknown"}"`;
    case "location_member.role_changed":
      return `Changed role in "${meta.location_name || "Unknown"}" from ${meta.from_role} to ${meta.to_role}`;

    case "membership.created":
      return `Created membership with role "${meta.role}"`;
    case "membership.role_changed":
      return `Changed role from "${meta.from_role}" to "${meta.to_role}"`;
    case "membership.status_changed":
      return `Changed status from "${meta.from_status}" to "${meta.to_status}"`;
    case "membership.deleted":
      return `Deleted membership with role "${meta.role}"`;

    case "invite.sent":
      return `Sent invitation to "${meta.email}" with role "${meta.role}"`;
    case "invite.accepted":
      return `Invitation accepted by "${meta.email}"`;
    case "invite.revoked":
      return `Revoked invitation for "${meta.email}"`;

    default:
      return log.action;
  }
}
