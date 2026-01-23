import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { useProgramKey } from "@/hooks/useProgramKey";
import { useMembership } from "@/lib/membership";
import { ProgramPackSettings } from "@/components/coaching/ProgramPackSettings";
import { ProgramKeyIndicator } from "@/components/coaching/ProgramKeyIndicator";
import { 
  Settings, 
  Languages, 
  Workflow, 
  Shield,
  ArrowLeft,
  AlertCircle
} from "lucide-react";

export default function OrgSettingsPage() {
  const { activeCoachingOrgId, isLoading: roleLoading } = useCoachingRole();
  const { terminology, isLoading: packLoading } = useProgramKey(activeCoachingOrgId);
  const { isCompanyAdmin } = useMembership();

  const isLoading = roleLoading || packLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!activeCoachingOrgId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Organization Settings"
          description="No active coaching organization"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Available</AlertTitle>
          <AlertDescription>
            You need to be part of a coaching organization to access these settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isCompanyAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Organization Settings"
          description="Access restricted"
        />
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            Only organization administrators can access these settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/coaching/org">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Organization Settings"
          description={`Configure your ${terminology.getTerm("module_label", "Coaching")} organization`}
        />
      </div>

      {/* Program Pack Settings */}
      <ProgramPackSettings coachingOrgId={activeCoachingOrgId} />

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Terminology */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Terminology</CardTitle>
            </div>
            <CardDescription>
              Customize labels and terms used throughout the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link to="/app/coaching/org/terminology">
                Manage Terminology
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Workflows */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Workflows</CardTitle>
            </div>
            <CardDescription>
              Customize onboarding, review, and engagement workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link to="/app/coaching/org/workflows">
                Manage Workflows
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">General</CardTitle>
            </div>
            <CardDescription>
              Organization name, contact information, and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled className="w-full">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info (for admins) */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Coaching Org ID: {activeCoachingOrgId}</p>
          <p>Terminology Source: {terminology.sourcePackKey}</p>
          <p>
            Sample Terms: {terminology.getTerm("coach_label")}, {terminology.getTerm("member_label")}, {terminology.getTerm("group_label")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
