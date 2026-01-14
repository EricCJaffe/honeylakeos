import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X, Users, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface LocationMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Tables<"locations"> | null;
}

export function LocationMembersDialog({
  open,
  onOpenChange,
  location,
}: LocationMembersDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [memberToRemove, setMemberToRemove] = useState<MemberWithProfile | null>(null);

  // Fetch location members with profile info and role
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["location-members", location?.id],
    queryFn: async (): Promise<MemberWithProfile[]> => {
      if (!location) return [];
      
      const { data, error } = await supabase
        .from("location_members")
        .select("user_id, role")
        .eq("location_id", location.id);

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", data.map(m => m.user_id));
      
      return data.map(member => ({
        user_id: member.user_id,
        role: member.role,
        profile: profiles?.find(p => p.user_id === member.user_id),
      }));
    },
    enabled: !!location && open,
  });

  // Fetch company members for adding
  const { data: companyMembers = [] } = useQuery({
    queryKey: ["company-members", activeCompanyId],
    queryFn: async (): Promise<Omit<MemberWithProfile, "role">[]> => {
      if (!activeCompanyId) return [];
      
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("company_id", activeCompanyId)
        .eq("status", "active");

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", data.map(m => m.user_id));
      
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

  // Check if current user can manage this location
  const canManage = useMemo(() => {
    // Admin access always allows management
    if (isCompanyAdmin || isSiteAdmin || isSuperAdmin) return true;
    
    // Check if current user is a location manager
    if (user?.id) {
      const currentUserMembership = members.find(m => m.user_id === user.id);
      if (currentUserMembership?.role === "manager") return true;
    }
    
    return false;
  }, [isCompanyAdmin, isSiteAdmin, isSuperAdmin, user?.id, members]);

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!location) throw new Error("No location");
      const { error } = await supabase.from("location_members").insert({
        location_id: location.id,
        user_id: userId,
        role: "member",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-members", location?.id] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Member added");
      setSelectedUserId("");
    },
    onError: (error: any) => {
      if (error?.code === "42501" || error?.message?.includes("policy")) {
        toast.error("You don't have permission to add members");
      } else {
        toast.error("Failed to add member");
      }
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!location) throw new Error("No location");
      const { error } = await supabase
        .from("location_members")
        .delete()
        .eq("location_id", location.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-members", location?.id] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Member removed");
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      if (error?.code === "42501" || error?.message?.includes("policy")) {
        toast.error("Cannot remove the last manager from this location");
      } else {
        toast.error("Failed to remove member");
      }
      setMemberToRemove(null);
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      if (!location) throw new Error("No location");
      const { error } = await supabase
        .from("location_members")
        .update({ role: newRole })
        .eq("location_id", location.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-members", location?.id] });
      toast.success("Role updated");
    },
    onError: (error: any) => {
      if (error?.code === "42501" || error?.message?.includes("policy")) {
        toast.error("Cannot demote the last manager in this location");
      } else {
        toast.error("Failed to update role");
      }
    },
  });

  // Check if this member is the last manager (for disabling controls)
  const isLastManager = (member: MemberWithProfile) => 
    member.role === "manager" && managerCount <= 1;

  const handleRoleChange = (userId: string, currentRole: string, newRole: string) => {
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

  const handleRemoveClick = (member: MemberWithProfile) => {
    setMemberToRemove(member);
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      removeMember.mutate(memberToRemove.user_id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {canManage ? "Manage Members" : "Location Members"} - {location?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Add Member - only shown if user can manage */}
          {canManage && (
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a member to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available members
                    </div>
                  ) : (
                    availableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profile?.full_name || member.profile?.email || member.user_id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button onClick={handleAddMember} disabled={!selectedUserId || addMember.isPending}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Read-only notice for non-managers */}
          {!canManage && (
            <Alert variant="default" className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You can view location members but only managers can make changes.
              </AlertDescription>
            </Alert>
          )}

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
                description={canManage ? "Add members to this location." : "This location has no members."}
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
                  
                  {canManage ? (
                    <>
                      {/* Role Dropdown - editable */}
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => handleRoleChange(member.user_id, member.role, newRole)}
                        disabled={updateRole.isPending || isLastManager(member)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member" disabled={isLastManager(member)}>
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
                        onClick={() => handleRemoveClick(member)}
                        disabled={removeMember.isPending || isLastManager(member)}
                        title={isLastManager(member) ? "Cannot remove the last manager" : "Remove member"}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    /* Read-only badge */
                    <Badge variant={member.role === "manager" ? "default" : "secondary"}>
                      {member.role === "manager" ? "Manager" : "Member"}
                    </Badge>
                  )}
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

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.profile?.full_name || memberToRemove?.profile?.email || "this member"}</strong>{" "}
              from the location?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
