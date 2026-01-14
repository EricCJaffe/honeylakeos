import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import type { Tables } from "@/integrations/supabase/types";

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Tables<"groups"> | null;
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  group,
}: GroupMembersDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch group members with profile info
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["group-members", group?.id],
    queryFn: async (): Promise<Array<{ user_id: string; created_at: string; profile?: { user_id: string; full_name: string | null; email: string | null } }>> => {
      if (!group) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          user_id,
          created_at
        `)
        .eq("group_id", group.id);

      if (error) throw error;
      
      // Fetch profiles for members
      if (data.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", data.map(m => m.user_id));
        
        return data.map(member => ({
          ...member,
          profile: profiles?.find(p => p.user_id === member.user_id),
        }));
      }
      
      return data;
    },
    enabled: !!group && open,
  });

  // Fetch company members for adding
  const { data: companyMembers = [] } = useQuery({
    queryKey: ["company-members", activeCompanyId],
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
        
        return data.map(member => ({
          ...member,
          profile: profiles?.find(p => p.user_id === member.user_id),
        }));
      }
      
      return data;
    },
    enabled: !!activeCompanyId && open,
  });

  // Filter out existing members
  const availableMembers = companyMembers.filter(
    (cm) => !members.some((m) => m.user_id === cm.user_id)
  );

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!group) throw new Error("No group");
      const { error } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Member added");
      setSelectedUserId("");
    },
    onError: () => {
      toast.error("Failed to add member");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!group) throw new Error("No group");
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Member removed");
    },
    onError: () => {
      toast.error("Failed to remove member");
    },
  });

  const handleAddMember = () => {
    if (selectedUserId) {
      addMember.mutate(selectedUserId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Members - {group?.name}</DialogTitle>
        </DialogHeader>

        {/* Add Member */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a member to add" />
            </SelectTrigger>
            <SelectContent>
              {availableMembers.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name || member.profile?.email || member.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddMember} disabled={!selectedUserId || addMember.isPending}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {/* Member List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loadingMembers ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members"
              description="Add members to this group."
            />
          ) : (
            members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="text-sm font-medium">
                    {member.profile?.full_name || "Unnamed User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.profile?.email || member.user_id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember.mutate(member.user_id)}
                  disabled={removeMember.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
