import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useMembership } from "@/lib/membership";
import { useCoachingRoles } from "@/hooks/useCoachingRoles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type AccessLevel = "org_admin" | "coach" | "member" | "site_admin";

interface CoachingAccessGuardProps {
  requiredAccess: AccessLevel;
  children: ReactNode;
  fallbackPath?: string;
}

export function CoachingAccessGuard({
  requiredAccess,
  children,
  fallbackPath = "/app",
}: CoachingAccessGuardProps) {
  const { isSiteAdmin, isSuperAdmin, isCompanyAdmin, loading: membershipLoading } = useMembership();
  const coachingRoles = useCoachingRoles();

  const isLoading = membershipLoading || coachingRoles.loading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Determine access based on required level
  let hasAccess = false;

  switch (requiredAccess) {
    case "site_admin":
      hasAccess = isSiteAdmin || isSuperAdmin;
      break;
    case "org_admin":
      hasAccess = isSiteAdmin || isSuperAdmin || 
        (coachingRoles.companyHasCoachingOrg && (isCompanyAdmin || coachingRoles.isOrgAdmin));
      break;
    case "coach":
      hasAccess = isSiteAdmin || isSuperAdmin || 
        coachingRoles.isCoachLike || 
        coachingRoles.isOrgAdmin || 
        coachingRoles.isManager ||
        (coachingRoles.companyHasCoachingOrg && isCompanyAdmin);
      break;
    case "member":
      hasAccess = isSiteAdmin || isSuperAdmin ||
        coachingRoles.companyHasCoachingOrg || 
        coachingRoles.isMember;
      break;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to access this page. 
                {requiredAccess === "org_admin" && " Only organization administrators can access this dashboard."}
                {requiredAccess === "coach" && " Only coaches and facilitators can access this dashboard."}
                {requiredAccess === "member" && " Only coaching organization members can access this dashboard."}
                {requiredAccess === "site_admin" && " Only site administrators can access this dashboard."}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to={fallbackPath}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
