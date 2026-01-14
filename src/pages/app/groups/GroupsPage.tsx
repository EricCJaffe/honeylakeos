import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, MoreHorizontal, Pencil, Trash2, UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { GroupFormDialog } from "./GroupFormDialog";
import { GroupMembersDialog } from "./GroupMembersDialog";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;

interface GroupWithMembers extends Group {
  group_members: { user_id: string; role: string }[];
}

export default function GroupsPage() {
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [membersGroup, setMembersGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_members(user_id, role)
        `)
        .eq("company_id", activeCompanyId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as GroupWithMembers[];
    },
    enabled: !!activeCompanyId,
  });

  // Check if current user is a manager of a specific group
  const isGroupManager = (group: GroupWithMembers) => {
    if (!user) return false;
    return group.group_members?.some(
      (m) => m.user_id === user.id && m.role === "manager"
    );
  };

  // Can manage members if company admin OR group manager
  const canManageMembers = (group: GroupWithMembers) => {
    return isCompanyAdmin || isGroupManager(group);
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g =>
      (g.name || "").toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group deleted");
    },
    onError: () => {
      toast.error("Failed to delete group");
    },
  });

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setIsFormDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setIsFormDialogOpen(true);
  };

  const handleManageMembers = (group: Group) => {
    setMembersGroup(group);
  };

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          title="No company selected"
          description="Please select a company to view groups."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Groups"
        description="Manage your teams and groups"
        actionLabel="New Group"
        onAction={handleCreate}
        showAction={isCompanyAdmin}
      />

      {/* Search Input */}
      {groups.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description={
            isCompanyAdmin
              ? "Create your first group to organize your team members."
              : "No groups have been created for this company yet."
          }
          actionLabel={isCompanyAdmin ? "Create Group" : undefined}
          onAction={isCompanyAdmin ? handleCreate : undefined}
        />
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching groups"
          description="Try a different search term."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {group.group_type || "team"}
                        </Badge>
                      </div>
                    </div>
                    {(isCompanyAdmin || canManageMembers(group)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManageMembers(group) && (
                            <DropdownMenuItem onClick={() => handleManageMembers(group)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Manage Members
                            </DropdownMenuItem>
                          )}
                          {isCompanyAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(group)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteGroup.mutate(group.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {(group as any).group_members?.length || 0} members
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <GroupFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        group={editingGroup}
      />

      <GroupMembersDialog
        open={!!membersGroup}
        onOpenChange={(open) => !open && setMembersGroup(null)}
        group={membersGroup}
      />
    </div>
  );
}
