import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  ShieldCheck,
  ShieldX,
  UserCog,
  Loader2,
  AlertCircle,
  UserMinus,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, type MembershipRole } from "@/lib/membership";
import { useAuth } from "@/lib/auth";

/**
 * DEV NOTE: Invite Strategy
 * -------------------------
 * The current schema does NOT have:
 * - An invitations table
 * - An invite_email column on memberships
 * 
 * Therefore, we implement the simplest safe path:
 * - Only allow adding users who already have a profile in the system
 * - Users must sign up first before they can be added to a company
 * - We search profiles by email and create a membership if found
 * 
 * Future enhancement: Add an invitations table with email + token + expiry
 * to support inviting users who haven't signed up yet.
 */

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

export default function MembersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    activeCompanyId,
    activeCompany,
    isCompanyAdmin,
    isSiteAdmin,
    isSuperAdmin,
    refreshMemberships,
  } = useMembership();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("user");
  const [isInviting, setIsInviting] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberRow | null>(null);

  const hasAdminAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Fetch members with profiles
  const {
    data: members = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["memberships", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // Fetch memberships for the active company
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("id, user_id, company_id, role, status, member_type, created_at")
        .eq("company_id", activeCompanyId)
        .order("role", { ascending: false })
        .order("created_at", { ascending: true });

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      // Fetch profiles for all user_ids
      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
      }

      // Map into combined rows
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

  // Count of active admins (for self-demotion protection)
  const activeAdminCount = useMemo(() => {
    return members.filter(
      (m) => m.status === "active" && m.role === "company_admin"
    ).length;
  }, [members]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.profile?.full_name?.toLowerCase().includes(q) ||
        m.profile?.email?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Update role mutation
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
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to manage members.");
      } else {
        toast.error(`Failed to update role: ${error.message}`);
      }
    },
  });

  // Update status mutation (activate/deactivate)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ membershipId, newStatus }: { membershipId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("memberships")
        .update({ status: newStatus })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      toast.success(`Member ${newStatus === "active" ? "activated" : "deactivated"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      refreshMemberships();
    },
    onError: (error: any) => {
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to manage members.");
      } else {
        toast.error(`Failed to update status: ${error.message}`);
      }
    },
  });

  // Delete membership mutation
  const deleteMembershipMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed successfully");
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      refreshMemberships();
    },
    onError: (error: any) => {
      if (error.code === "42501" || error.message?.includes("policy")) {
        // Check if it's the last admin protection
        if (error.message?.includes("last") || error.message?.includes("admin")) {
          toast.error("Cannot remove the last company admin.");
        } else {
          toast.error("You don't have permission to remove members.");
        }
      } else {
        toast.error(`Failed to remove member: ${error.message}`);
      }
    },
  });

  // Handle remove member
  const handleRemoveClick = (member: MemberRow) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      deleteMembershipMutation.mutate(memberToRemove.membership_id);
    }
  };

  // Handle role change with self-demotion protection
  const handleRoleChange = (member: MemberRow, newRole: MembershipRole) => {
    // Check if user is demoting themselves as the last admin
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

  // Handle status toggle
  const handleStatusToggle = (member: MemberRow) => {
    // Prevent deactivating self if last admin
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

  // Invite member handler
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeCompanyId) return;

    setIsInviting(true);
    try {
      // Search for existing profile by email
      const { data: existingProfiles, error: searchError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", inviteEmail.trim().toLowerCase())
        .limit(1);

      if (searchError) throw searchError;

      if (!existingProfiles || existingProfiles.length === 0) {
        toast.error("User not found. They must sign up first before being added.");
        return;
      }

      const targetUserId = existingProfiles[0].user_id;

      // Check if already a member
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

      // Create membership
      const { error: createError } = await supabase.from("memberships").insert({
        company_id: activeCompanyId,
        user_id: targetUserId,
        role: inviteRole,
        status: "active",
        member_type: "internal",
      });

      if (createError) throw createError;

      toast.success(`${existingProfiles[0].full_name || inviteEmail} has been added to the company!`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
    } catch (error: any) {
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to add members.");
      } else if (error.code === "23505") {
        toast.error("This user is already a member of this company.");
      } else {
        toast.error(`Failed to add member: ${error.message}`);
      }
    } finally {
      setIsInviting(false);
    }
  };

  // No access state
  if (!hasAdminAccess) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-md mx-auto border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to manage members. Only company administrators can view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // No active company
  if (!activeCompanyId) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>
              Please select a company to manage its members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage members for {activeCompany?.name || "this company"}
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Search & Stats */}
      <Card className="mb-6">
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
              <span>
                <strong className="text-foreground">{members.filter((m) => m.status !== "active").length}</strong> inactive
              </span>
              <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
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
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.membership_id}>
                        <TableCell className="font-medium">
                          {member.profile?.full_name || "Unknown"}
                          {member.user_id === user?.id && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              You
                            </Badge>
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
                          <Badge
                            variant={member.status === "active" ? "secondary" : "outline"}
                            className={
                              member.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(member.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <MemberActionsMenu
                            member={member}
                            currentUserId={user?.id}
                            activeAdminCount={activeAdminCount}
                            onRoleChange={handleRoleChange}
                            onStatusToggle={handleStatusToggle}
                            onRemove={handleRemoveClick}
                            isUpdating={updateRoleMutation.isPending || updateStatusMutation.isPending || deleteMembershipMutation.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredMembers.map((member) => (
                  <Card key={member.membership_id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.profile?.full_name || "Unknown"}
                          {member.user_id === user?.id && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.profile?.email || "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={roleBadgeVariants[member.role]} className="text-xs">
                            {roleLabels[member.role]}
                          </Badge>
                          <Badge
                            variant={member.status === "active" ? "secondary" : "outline"}
                            className={
                              member.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
                                : "bg-muted text-muted-foreground text-xs"
                            }
                          >
                            {member.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Joined {format(new Date(member.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <MemberActionsMenu
                        member={member}
                        currentUserId={user?.id}
                        activeAdminCount={activeAdminCount}
                        onRoleChange={handleRoleChange}
                        onStatusToggle={handleStatusToggle}
                        onRemove={handleRemoveClick}
                        isUpdating={updateRoleMutation.isPending || updateStatusMutation.isPending || deleteMembershipMutation.isPending}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add an existing user to this company by their email address. They must have an account first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MembershipRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="company_admin">Company Admin</SelectItem>
                  <SelectItem value="location_admin">Location Admin</SelectItem>
                  <SelectItem value="module_admin">Module Admin</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={(open) => {
        setRemoveDialogOpen(open);
        if (!open) setMemberToRemove(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.profile?.full_name || memberToRemove?.profile?.email || "this member"}</strong>{" "}
              from the company? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={deleteMembershipMutation.isPending}
            >
              {deleteMembershipMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Actions dropdown component
function MemberActionsMenu({
  member,
  currentUserId,
  activeAdminCount,
  onRoleChange,
  onStatusToggle,
  onRemove,
  isUpdating,
}: {
  member: MemberRow;
  currentUserId: string | undefined;
  activeAdminCount: number;
  onRoleChange: (member: MemberRow, newRole: MembershipRole) => void;
  onStatusToggle: (member: MemberRow) => void;
  onRemove: (member: MemberRow) => void;
  isUpdating: boolean;
}) {
  const isSelf = member.user_id === currentUserId;
  const isLastAdmin = member.role === "company_admin" && member.status === "active" && activeAdminCount <= 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isUpdating}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
        {(["user", "company_admin", "location_admin", "module_admin", "external"] as MembershipRole[]).map(
          (role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => onRoleChange(member, role)}
              disabled={member.role === role || (isLastAdmin && role !== "company_admin")}
              className="flex items-center gap-2"
            >
              <UserCog className="h-4 w-4" />
              {roleLabels[role]}
              {member.role === role && <ShieldCheck className="h-3 w-3 ml-auto text-primary" />}
            </DropdownMenuItem>
          )
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onStatusToggle(member)}
          disabled={isLastAdmin && member.status === "active"}
          className="flex items-center gap-2"
        >
          {member.status === "active" ? (
            <>
              <UserMinus className="h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Reactivate
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isLastAdmin ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem disabled className="text-muted-foreground opacity-50">
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Member
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Cannot remove the last company admin</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuItem
            onClick={() => onRemove(member)}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <UserMinus className="h-4 w-4" />
            Remove Member
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
