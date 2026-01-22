import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useMemberEngagement,
  useCoachingPlans,
  useCoachingMeetings,
  useCoachingHealthChecks,
  useEndEngagement
} from "@/hooks/useCoachingData";
import { useEngagementTerminology } from "@/hooks/useCoachingTerminology";
import { useMembership } from "@/lib/membership";
import { AccessWizard } from "@/components/coaching/AccessWizard";
import { 
  Calendar, 
  Target,
  Heart,
  UserCheck,
  AlertCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MemberDashboard() {
  const { isCompanyAdmin } = useMembership();
  const { data: engagement, isLoading: engagementLoading } = useMemberEngagement();
  const { getTerm, isLoading: termsLoading } = useEngagementTerminology(engagement?.id);
  const { data: plans } = useCoachingPlans(engagement?.id);
  const { data: meetings } = useCoachingMeetings(engagement?.id);
  const { data: healthChecks } = useCoachingHealthChecks(engagement?.id);
  const endEngagement = useEndEngagement();

  const [showEndDialog, setShowEndDialog] = useState(false);

  const isLoading = engagementLoading || termsLoading;

  // Check if onboarding wizard should be shown
  const showOnboardingWizard = 
    engagement?.onboarding?.[0]?.status === "pending" && 
    isCompanyAdmin;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // No active engagement
  if (!engagement) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={getTerm("module_label")}
          description="Your coaching relationship"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Coaching Relationship</h3>
            <p className="text-muted-foreground">
              You don't have an active coaching engagement. Contact your administrator 
              or coaching organization to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show onboarding wizard
  if (showOnboardingWizard) {
    return (
      <AccessWizard 
        engagement={engagement}
        onboardingId={engagement.onboarding?.[0]?.id}
      />
    );
  }

  // Get assigned coach info - coach data comes from coaching_coaches table
  const primaryAssignment = engagement.assignments?.find((a: any) => a.role === "primary");
  const primaryCoach = primaryAssignment?.coach as { id: string; user_id: string; profile?: { full_name?: string; email?: string; avatar_url?: string } } | undefined;
  // Profile is attached via separate query in useCoachingData
  const coachName = primaryCoach?.profile?.full_name || "Your Coach";
  const coachEmail = primaryCoach?.profile?.email || "";
  const coachInitial = coachName?.[0] || "C";
  
  // Upcoming meetings
  const upcomingMeetings = meetings?.filter(
    (m: any) => m.status === "scheduled" && new Date(m.scheduled_for) > new Date()
  ).slice(0, 3) || [];

  // Active goals
  const activeGoals = plans?.flatMap((p: any) => 
    p.goals?.filter((g: any) => g.status === "active") || []
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title={`${getTerm("module_label")} Dashboard`}
          description={`Your coaching relationship with ${engagement.coaching_org?.name}`}
        />
        {isCompanyAdmin && (
          <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                End Relationship
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Coaching Relationship?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end your coaching engagement with {engagement.coaching_org?.name}. 
                  Your coach will no longer have access to your company data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    endEngagement.mutate({
                      engagementId: engagement.id,
                      reason: "member_requested",
                    });
                    setShowEndDialog(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  End Relationship
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Coach Info */}
      {primaryCoach && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Your {getTerm("coach_label")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                {coachInitial}
              </div>
              <div>
                <p className="font-medium">{coachName}</p>
                <p className="text-sm text-muted-foreground">{coachEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active {getTerm("goals_label")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getTerm("health_check_label")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthChecks?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming meetings
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingMeetings.map((meeting: any) => (
                  <li key={meeting.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.scheduled_for), "PPp")}
                      </p>
                    </div>
                    <Badge variant="outline">{meeting.meeting_type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {getTerm("goals_label")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active {getTerm("goals_label").toLowerCase()}
              </p>
            ) : (
              <ul className="space-y-3">
                {activeGoals.slice(0, 5).map((goal: any) => (
                  <li key={goal.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      {goal.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Due: {format(new Date(goal.due_date), "PP")}
                        </p>
                      )}
                    </div>
                    <Badge variant={goal.status === "achieved" ? "default" : "outline"}>
                      {goal.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Health Checks */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              {getTerm("health_check_label")}s
            </CardTitle>
            <CardDescription>
              Track your organizational health over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!healthChecks || healthChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No {getTerm("health_check_label").toLowerCase()}s completed yet
              </p>
            ) : (
              <ul className="space-y-3">
                {healthChecks.slice(0, 5).map((check: any) => (
                  <li key={check.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">
                        {check.subject_type} - {check.assessment_period}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(check.created_at), "PP")}
                      </p>
                    </div>
                    <Badge variant={check.status === "reviewed" ? "default" : "outline"}>
                      {check.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
