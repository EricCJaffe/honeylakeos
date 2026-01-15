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
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  "employee.invite.created": "Invite Created",
  "employee.invite.resent": "Invite Resent",
  "employee.invite.revoked": "Invite Revoked",
  "employee.invite.accepted": "Invite Accepted",
  "group.created": "Group Created",
  "group.updated": "Group Updated",
  "group.deleted": "Group Deleted",
  "group_member.added": "Added to Group",
  "group_member.removed": "Removed from Group",
  "location.created": "Location Created",
  "location.updated": "Location Updated",
  "location.deleted": "Location Deleted",
  "location.archived": "Location Archived",
  "membership.created": "Membership Created",
  "membership.role_changed": "Role Changed",
  "membership.deleted": "Membership Deleted",
  "company.updated": "Company Updated",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  employee: Briefcase,
  employee_invite: Mail,
  group: Users,
  location: MapPin,
  membership: Shield,
  company: Building2,
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  added: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  updated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  restored: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

function getActionColor(action: string): string {
  const actionType = action.split(".")[1] || "";
  return ACTION_COLORS[actionType] || "bg-muted text-muted-foreground";
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
    case "group.created":
      return `Created group "${meta.name || "Unknown"}"`;
    case "group.deleted":
      return `Deleted group "${meta.name || "Unknown"}"`;
    case "location.created":
      return `Created location "${meta.name || "Unknown"}"`;
    case "company.updated":
      return `Updated company "${meta.name || "Unknown"}"`;
    default:
      return `${log.action} on ${log.entity_type}`;
  }
}

export default function AuditLogPanel() {
  const { activeCompanyId } = useActiveCompany();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
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
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!activeCompanyId,
  });

  const entityTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.entity_type));
    return Array.from(types).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (entityFilter !== "all") {
      result = result.filter((l) => l.entity_type === entityFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const actionLabel = ACTION_LABELS[l.action] || l.action;
        const metaStr = JSON.stringify(l.metadata).toLowerCase();
        return actionLabel.toLowerCase().includes(q) || metaStr.includes(q);
      });
    }

    return result;
  }, [logs, entityFilter, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
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

        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} log entries
      </p>

      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {logs.length === 0 ? "No audit events recorded yet." : "No logs match your filters."}
          </CardContent>
        </Card>
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
                          <p className="text-sm mt-1 truncate">{formatLogSummary(log)}</p>
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
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Entity:</span> {log.entity_type}
                            {log.entity_id && ` (${log.entity_id.slice(0, 8)}...)`}
                          </p>
                          <p>
                            <span className="font-medium">Actor:</span>{" "}
                            {log.actor_user_id?.slice(0, 8) || "System"}...
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
