import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useCoachingOrgEngagements,
  useUpcomingMeetings 
} from "@/hooks/useCoachingData";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { useCoachingTerminology } from "@/hooks/useCoachingTerminology";
import { 
  Building2, 
  Calendar, 
  Target,
  FileText,
  ArrowRight,
  AlertCircle,
  Plus
} from "lucide-react";
import { format } from "date-fns";

export default function CoachDashboardNew() {
  const { activeCoachingOrgId, engagementIds } = useCoachingRole();
  const { getTerm, isLoading: termsLoading } = useCoachingTerminology(activeCoachingOrgId);
  const { data: engagements, isLoading: engagementsLoading } = useCoachingOrgEngagements(activeCoachingOrgId);
  const { data: upcomingMeetings, isLoading: meetingsLoading } = useUpcomingMeetings(engagementIds);

  const [activeTab, setActiveTab] = useState("clients");

  const isLoading = termsLoading;

  // Filter to only this coach's engagements
  const myEngagements = engagements?.filter((e) => 
    engagementIds.includes(e.id)
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${getTerm("coach_label")} Dashboard`}
        description="Manage your client relationships and coaching activities"
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My {getTerm("member_label")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEngagements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Prep
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            My {getTerm("member_label")}s
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            {getTerm("goals_label")}
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          {engagementsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : myEngagements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No {getTerm("member_label")}s assigned to you yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myEngagements.map((engagement) => (
                <Card key={engagement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {engagement.member_company?.name}
                        </CardTitle>
                        <CardDescription>
                          {engagement.program_name_snapshot || getTerm("module_label")}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={engagement.status === "active" ? "default" : "secondary"}
                      >
                        {engagement.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/app/coaching/engagements/${engagement.id}`}>
                          <FileText className="mr-1 h-4 w-4" />
                          Details
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/app/coaching/engagements/${engagement.id}/meeting/new`}>
                          <Plus className="mr-1 h-4 w-4" />
                          Meeting
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>
                Your scheduled {getTerm("one_on_one_label")}s and sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meetingsLoading ? (
                <Skeleton className="h-40" />
              ) : upcomingMeetings?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming meetings scheduled
                </p>
              ) : (
                <ul className="space-y-4">
                  {upcomingMeetings?.map((meeting: any) => (
                    <li key={meeting.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {meeting.engagement?.member_company?.name}
                        </p>
                        {meeting.scheduled_for && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meeting.scheduled_for), "PPp")}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/app/coaching/meetings/${meeting.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {getTerm("goals_label")} overview coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
