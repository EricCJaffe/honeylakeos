import * as React from "react";
import { Shield, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancePermissions } from "@/hooks/useFinancePermissions";

export function FinancePermissionsCard() {
  const { memberships, isLoading, toggleFinanceAccess, isUpdating } = useFinancePermissions();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Finance Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out company admins (they always have access)
  const nonAdminMembers = memberships.filter(m => m.role !== "company_admin");
  const adminMembers = memberships.filter(m => m.role === "company_admin");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          Finance Permissions
        </CardTitle>
        <CardDescription>
          Control which team members can access finance features. Company Admins always have access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Admin members - always have access */}
        {adminMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Company Admins (always have access)</p>
            {adminMembers.map((member) => (
              <div 
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.profile?.display_name || member.profile?.email || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                  </div>
                </div>
                <Badge variant="secondary">Admin</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Non-admin members - can toggle access */}
        {nonAdminMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Team Members</p>
            {nonAdminMembers.map((member) => (
              <div 
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    member.can_access_finance 
                      ? "bg-primary/10" 
                      : "bg-muted"
                  }`}>
                    {member.can_access_finance ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.profile?.display_name || member.profile?.email || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                  </div>
                </div>
                <Switch
                  checked={member.can_access_finance}
                  onCheckedChange={(enabled) => 
                    toggleFinanceAccess({ 
                      membershipId: member.id, 
                      userId: member.user_id,
                      enabled 
                    })
                  }
                  disabled={isUpdating}
                />
              </div>
            ))}
          </div>
        )}

        {memberships.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
