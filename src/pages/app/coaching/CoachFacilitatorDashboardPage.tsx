import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachingDashboardLayout } from "@/components/coaching/CoachingDashboardLayout";
import { CoachingAccessGuard } from "@/components/coaching/CoachingAccessGuard";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { useCoachingOrgs, useCoachingOrgEngagements } from "@/hooks/useCoachingData";
import { useCoachingTerminology } from "@/hooks/useCoachingTerminology";
import { useCoachClients } from "@/hooks/useCoachOrganizations";
import { 
  Users, 
  Building2, 
  Calendar,
  Target,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function CoachDashboardContent() {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: coachingOrgs, isLoading: orgsLoading } = useCoachingOrgs();
  const { data: engagements, isLoading: engagementsLoading } = useCoachingOrgEngagements(activeCoachingOrgId);
  const { getTerm, isLoading: termsLoading } = useCoachingTerminology(activeCoachingOrgId);
  const { data: clients = [], isLoading: clientsLoading } = useCoachClients();

  const isLoading = orgsLoading || termsLoading;
  const activeOrg = coachingOrgs?.[0];

  // Get assigned clients
  const activeEngagements = engagements?.filter((e) => e.status === "active") || [];
  const pendingEngagements = engagements?.filter((e) => 
    (e.status as string) === "pending_acceptance" || e.status === "suspended"
  ) || [];

  // Calculate stats
  const totalClients = clients.length + activeEngagements.length;
  const needsAttention = activeEngagements.filter(
    (e) => e.onboarding?.[0]?.status === "pending"
  ).length;

  return (
    <CoachingDashboardLayout
      title="Coach Dashboard"
      description={`Manage your ${getTerm("member_label")} relationships`}
      programKey={activeOrg?.program_key}
      programVersion={activeOrg?.program_version}
      orgName={activeOrg?.name}
      isLoading={isLoading}
    >
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My {getTerm("member_label")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeEngagements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingEngagements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{needsAttention}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Clients */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  My {getTerm("member_label")}s
                </CardTitle>
                <CardDescription>Organizations you're coaching</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {engagementsLoading || clientsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : activeEngagements.length === 0 && clients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No assigned {getTerm("member_label")}s yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show engagements from coaching org */}
                {activeEngagements.slice(0, 5).map((engagement) => (
                  <div
                    key={engagement.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{engagement.member_company?.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Started {formatDistanceToNow(new Date(engagement.linked_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {engagement.onboarding?.[0]?.status === "pending" && (
                        <Badge variant="outline" className="text-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Onboarding
                        </Badge>
                      )}
                      <Badge variant={engagement.status === "active" ? "default" : "secondary"}>
                        {engagement.status}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/app/coaching/engagements/${engagement.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Show coach_organizations clients */}
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{client.client_company?.name}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {client.relationship_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/app/coaching/clients/${client.client_company_id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming sessions scheduled</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/app/coaching/requests">
                <Users className="mr-2 h-4 w-4" />
                View Requests
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/app/coaching/playbooks">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Playbooks
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </CoachingDashboardLayout>
  );
}

export default function CoachFacilitatorDashboardPage() {
  return (
    <CoachingAccessGuard requiredAccess="coach">
      <CoachDashboardContent />
    </CoachingAccessGuard>
  );
}
