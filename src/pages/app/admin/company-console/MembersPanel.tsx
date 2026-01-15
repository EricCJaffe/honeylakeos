import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, type MembershipRole } from "@/lib/membership";
import { useAuth } from "@/lib/auth";

interface MemberRow {
  membership_id: string;
  user_id: string;
  company_id: string;
  role: MembershipRole;
  status: string;
  member_type: string;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const roleLabels: Record<MembershipRole, string> = {
  company_admin: "Company Admin",
  location_admin: "Location Admin",
  module_admin: "Module Admin",
  user: "User",
  external: "External",
};

const roleBadgeVariants: Record<MembershipRole, "default" | "secondary" | "outline"> = {
  company_admin: "default",
  location_admin: "secondary",
  module_admin: "secondary",
  user: "outline",
  external: "outline",
};

export default function MembersPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId, activeCompany, refreshMemberships } = useMembership();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("user");
  const [isInviting, setIsInviting] = useState(false);

  const {
    data: members = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["memberships", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("id, user_id, company_id, role, status, member_type, created_at")
        .eq("company_id", activeCompanyId)
        .order("role", { ascending: false })
        .order("created_at", { ascending: true });

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { full_name: p.full_name, email: p.email }])
      );

      return memberships.map((m) => ({
        membership_id: m.id,
        user_id: m.user_id,
        company_id: m.company_id,
        role: m.role as MembershipRole,
        status: m.status,
        member_type: m.member_type,
        created_at: m.created_at,
        profile: profileMap.get(m.user_id) || null,
      })) as MemberRow[];
    },
    enabled: !!activeCompanyId,
  });

  const activeAdminCount = useMemo(() => {
    return members.filter((m) => m.status === "active" && m.role === "company_admin").length;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.profile?.full_name?.toLowerCase().includes(q) ||
        m.profile?.email?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: MembershipRole }) => {
      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      refreshMemberships();
    },
    onError: (error: any) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ membershipId, newStatus }: { membershipId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("memberships")
        .update({ status: newStatus })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      toast.success(`Member ${newStatus === "active" ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      refreshMemberships();
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed successfully");
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      refreshMemberships();
    },
    onError: (error: any) => {
      if (error.message?.includes("last") || error.message?.includes("admin")) {
        toast.error("Cannot remove the last company admin.");
      } else {
        toast.error(`Failed to remove member: ${error.message}`);
      }
    },
  });

  const handleRoleChange = (member: MemberRow, newRole: MembershipRole) => {
    if (
      member.user_id === user?.id &&
      member.role === "company_admin" &&
      newRole !== "company_admin" &&
      activeAdminCount <= 1
    ) {
      toast.error("Cannot demote yourself. You are the last company admin.");
      return;
    }
    updateRoleMutation.mutate({ membershipId: member.membership_id, newRole });
  };

  const handleStatusToggle = (member: MemberRow) => {
    if (
      member.user_id === user?.id &&
      member.role === "company_admin" &&
      member.status === "active" &&
      activeAdminCount <= 1
    ) {
      toast.error("Cannot deactivate yourself. You are the last company admin.");
      return;
    }
    const newStatus = member.status === "active" ? "inactive" : "active";
    updateStatusMutation.mutate({ membershipId: member.membership_id, newStatus });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeCompanyId) return;

    setIsInviting(true);
    try {
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", inviteEmail.trim().toLowerCase())
        .limit(1);

      if (!existingProfiles || existingProfiles.length === 0) {
        toast.error("User not found. They must sign up first before being added.");
        return;
      }

      const targetUserId = existingProfiles[0].user_id;

      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("user_id", targetUserId)
        .limit(1);

      if (existingMembership && existingMembership.length > 0) {
        toast.error("This user is already a member of this company.");
        return;
      }

      const { error: createError } = await supabase.from("memberships").insert({
        company_id: activeCompanyId,
        user_id: targetUserId,
        role: inviteRole,
        status: "active",
        member_type: "internal",
      });

      if (createError) throw createError;

      toast.success(`${existingProfiles[0].full_name || inviteEmail} has been added!`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
    } catch (error: any) {
      toast.error(`Failed to add member: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage members for {activeCompany?.name || "this company"}
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                <strong className="text-foreground">{members.filter((m) => m.status === "active").length}</strong> active
              </span>
              <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Failed to load members
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No members match your search." : "No members yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.membership_id}>
                      <TableCell className="font-medium">
                        {member.profile?.full_name || "—"}
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.profile?.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(member.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            {(Object.keys(roleLabels) as MembershipRole[]).map((role) => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleRoleChange(member, role)}
                                disabled={member.role === role}
                              >
                                {roleLabels[role]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusToggle(member)}>
                              {member.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMembershipMutation.mutate(member.membership_id)}
                              className="text-destructive"
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an existing user to this company. They must have signed up first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MembershipRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as MembershipRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
