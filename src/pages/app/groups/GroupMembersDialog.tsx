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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import type { Tables } from "@/integrations/supabase/types";

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface MemberWithProfile {
  user_id: string;
  role: string;
  profile?: Profile;
}

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

  // Fetch group members with profile info and role
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["group-members", group?.id],
    queryFn: async (): Promise<MemberWithProfile[]> => {
      if (!group) return [];
      
      // 1) Fetch group_members selecting user_id and role
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, role")
        .eq("group_id", group.id);

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // 2) Fetch profiles for those user_ids
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", data.map(m => m.user_id));
      
      // 3) Merge into array with profile object and role
      return data.map(member => ({
        user_id: member.user_id,
        role: member.role,
        profile: profiles?.find(p => p.user_id === member.user_id),
      }));
    },
    enabled: !!group && open,
  });

  // Fetch company members for adding
  const { data: companyMembers = [] } = useQuery({
    queryKey: ["company-members", activeCompanyId],
    queryFn: async (): Promise<Omit<MemberWithProfile, "role">[]> => {
      if (!activeCompanyId) return [];
      
      // 1) Fetch memberships selecting only user_id
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("company_id", activeCompanyId)
        .eq("status", "active");

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // 2) Fetch profiles for those user_ids
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", data.map(m => m.user_id));
      
      // 3) Merge into array with profile object
      return data.map(member => ({
        user_id: member.user_id,
        profile: profiles?.find(p => p.user_id === member.user_id),
      }));
    },
    enabled: !!activeCompanyId && open,
  });

  // Filter out existing members
  const availableMembers = companyMembers.filter(
    (cm) => !members.some((m) => m.user_id === cm.user_id)
  );

  // Count managers for safety check
  const managerCount = members.filter(m => m.role === "manager").length;

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!group) throw new Error("No group");
      const { error } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
        role: "member",
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

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      if (!group) throw new Error("No group");
      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] });
      toast.success("Role updated");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });

  const handleRoleChange = (userId: string, currentRole: string, newRole: string) => {
    // Safety: prevent demoting the last manager
    if (currentRole === "manager" && newRole === "member" && managerCount <= 1) {
      toast.error("Cannot demote the last manager");
      return;
    }
    updateRole.mutate({ userId, newRole });
  };

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
                className="flex items-center justify-between p-3 rounded-lg border gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.profile?.full_name || "Unnamed User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profile?.email || member.user_id}
                  </p>
                </div>
                
                {/* Role Dropdown */}
                <Select
                  value={member.role}
                  onValueChange={(newRole) => handleRoleChange(member.user_id, member.role, newRole)}
                  disabled={updateRole.isPending}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <Badge variant="secondary" className="font-normal">Member</Badge>
                    </SelectItem>
                    <SelectItem value="manager">
                      <Badge variant="default" className="font-normal">Manager</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>

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
