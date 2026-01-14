import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, X, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "note" | "document" | "folder";
  entityId: string;
  entityName: string;
}

interface ACLEntry {
  id: string;
  grantee_type: string;
  grantee_id: string;
  permission: string;
  profile?: { full_name: string | null; email: string | null };
  group?: { name: string };
}

export function ShareDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
}: ShareDialogProps) {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [granteeType, setGranteeType] = useState<"user" | "group">("user");
  const [granteeId, setGranteeId] = useState<string>("");
  const [permission, setPermission] = useState<string>("read");

  // Fetch existing ACL entries
  const { data: aclEntries = [], isLoading: loadingACL } = useQuery({
    queryKey: ["entity-acl", entityType, entityId],
    queryFn: async (): Promise<ACLEntry[]> => {
      const { data, error } = await supabase
        .from("entity_acl")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);

      if (error) throw error;
      
      // Fetch profile/group info for each entry
      const entries: ACLEntry[] = [];
      for (const entry of data || []) {
        if (entry.grantee_type === "user") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", entry.grantee_id)
            .maybeSingle();
          entries.push({ ...entry, profile: profile || undefined });
        } else {
          const { data: group } = await supabase
            .from("groups")
            .select("name")
            .eq("id", entry.grantee_id)
            .maybeSingle();
          entries.push({ ...entry, group: group || undefined });
        }
      }
      return entries;
    },
    enabled: open,
  });

  // Fetch users/groups for adding
  const { data: companyMembers = [] } = useQuery({
    queryKey: ["company-members-share", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("company_id", activeCompanyId)
        .eq("status", "active");

      if (error) throw error;
      
      if (data.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", data.map(m => m.user_id));
        
        return data.map(m => ({
          user_id: m.user_id,
          profile: profiles?.find(p => p.user_id === m.user_id),
        }));
      }
      return [];
    },
    enabled: !!activeCompanyId && open && granteeType === "user",
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups-share", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && open && granteeType === "group",
  });

  const addACL = useMutation({
    mutationFn: async () => {
      if (!user || !granteeId) throw new Error("Missing data");
      
      const { error } = await supabase.from("entity_acl").insert({
        entity_type: entityType,
        entity_id: entityId,
        grantee_type: granteeType,
        grantee_id: granteeId,
        permission,
        granted_by: user.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-acl", entityType, entityId] });
      toast.success("Access granted");
      setGranteeId("");
    },
    onError: () => {
      toast.error("Failed to grant access");
    },
  });

  const removeACL = useMutation({
    mutationFn: async (aclId: string) => {
      const { error } = await supabase
        .from("entity_acl")
        .delete()
        .eq("id", aclId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-acl", entityType, entityId] });
      toast.success("Access removed");
    },
    onError: () => {
      toast.error("Failed to remove access");
    },
  });

  const getPermissionLabel = (perm: string) => {
    switch (perm) {
      case "read": return "Can view";
      case "write": return "Can edit";
      case "manage": return "Full access";
      default: return perm;
    }
  };

  if (!isCompanyAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {entityName}</DialogTitle>
            <DialogDescription>
              Only company administrators can manage sharing permissions.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{entityName}"
          </DialogTitle>
          <DialogDescription>
            Grant access to users or groups in your company.
          </DialogDescription>
        </DialogHeader>

        {/* Add new share */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={granteeType} onValueChange={(v) => { setGranteeType(v as "user" | "group"); setGranteeId(""); }}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={granteeId} onValueChange={setGranteeId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={`Select ${granteeType}`} />
              </SelectTrigger>
              <SelectContent>
                {granteeType === "user"
                  ? companyMembers
                      .filter((m) => !aclEntries.some((a) => a.grantee_id === m.user_id))
                      .map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name || m.profile?.email || m.user_id}
                        </SelectItem>
                      ))
                  : groups
                      .filter((g) => !aclEntries.some((a) => a.grantee_id === g.id))
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Can view</SelectItem>
                <SelectItem value="write">Can edit</SelectItem>
                <SelectItem value="manage">Full access</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => addACL.mutate()} disabled={!granteeId || addACL.isPending}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current shares */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {loadingACL ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-10 bg-muted rounded" />)}
            </div>
          ) : aclEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No one has been granted access yet.
            </p>
          ) : (
            aclEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {entry.grantee_type === "user"
                        ? entry.profile?.full_name || entry.profile?.email || "User"
                        : entry.group?.name || "Group"}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {getPermissionLabel(entry.permission)}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeACL.mutate(entry.id)}
                  disabled={removeACL.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
