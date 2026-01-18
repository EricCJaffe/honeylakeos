import { useState } from "react";
import { Plus, MoreHorizontal, Shield, User, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useDepartmentMembers, useDepartmentMutations } from "@/hooks/useDepartments";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { AddMemberDialog } from "./AddMemberDialog";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentMembersTabProps {
  departmentId: string;
}

export function DepartmentMembersTab({ departmentId }: DepartmentMembersTabProps) {
  const { isCompanyAdmin } = useMembership();
  const { data: members, isLoading } = useDepartmentMembers(departmentId);
  const { updateMemberRole, removeMember } = useDepartmentMutations();

  // Check if current user is a manager of this department
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  
  const isManager = members?.some(
    (m) => m.user_id === currentUser?.id && m.role === "manager"
  );
  
  // Company admin or department manager can manage members
  const canManageMembers = isCompanyAdmin || isManager;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const handleToggleRole = async (memberId: string, currentRole: "member" | "manager") => {
    const newRole = currentRole === "manager" ? "member" : "manager";
    await updateMemberRole.mutateAsync({ memberId, departmentId, role: newRole });
  };

  const handleRemove = async () => {
    if (removingMember) {
      await removeMember.mutateAsync({ memberId: removingMember, departmentId });
      setRemovingMember(null);
    }
  };

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {canManageMembers && (
        <div className="flex justify-end">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      )}

      {!members?.length ? (
        <EmptyState
          icon={User}
          title="No members yet"
          description={
            canManageMembers
              ? "Add team members to this department."
              : "This department has no members yet."
          }
          actionLabel={canManageMembers ? "Add Member" : undefined}
          onAction={canManageMembers ? () => setAddDialogOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {member.role === "manager" ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.full_name || member.email || "Unknown User"}
                    </p>
                    {member.email && member.full_name && (
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={member.role === "manager" ? "default" : "secondary"}>
                    {member.role === "manager" ? "Manager" : "Member"}
                  </Badge>

                  {canManageMembers && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Only company admin can promote/demote, not just managers */}
                        {isCompanyAdmin && (
                          <DropdownMenuItem
                            onClick={() => handleToggleRole(member.id, member.role)}
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            {member.role === "manager" ? "Demote to Member" : "Promote to Manager"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setRemovingMember(member.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        departmentId={departmentId}
        existingMemberIds={members?.map((m) => m.user_id) || []}
      />

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from this department. They can be added back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
