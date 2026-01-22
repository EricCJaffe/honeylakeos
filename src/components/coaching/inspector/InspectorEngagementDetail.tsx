import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface InspectorEngagementDetailProps {
  engagementId: string;
  onBack: () => void;
}

interface EngagementData {
  id: string;
  coaching_org_id: string;
  member_company_id: string;
  status: string;
  created_at: string;
  _memberCompanyName: string;
  _orgName: string;
}

interface CoachAssignmentData {
  id: string;
  coach_user_id: string;
  assignment_role: string;
  created_at: string;
  _coachName: string;
  _coachEmail: string;
}

interface CoachingAssignmentData {
  id: string;
  assignment_type: string;
  title_override: string | null;
  status: string;
  created_at: string;
  _instanceCount: number;
}

export function InspectorEngagementDetail({ engagementId, onBack }: InspectorEngagementDetailProps) {
  const { data: engagement, isLoading } = useQuery({
    queryKey: ["inspector-engagement-detail", engagementId],
    queryFn: async (): Promise<EngagementData | null> => {
      const { data, error } = await supabase
        .from("coaching_org_engagements")
        .select("id, coaching_org_id, member_company_id, status, created_at")
        .eq("id", engagementId)
        .single();

      if (error) throw error;

      // Get member company name
      const { data: memberCompany } = await supabase
        .from("companies")
        .select("name")
        .eq("id", data.member_company_id)
        .maybeSingle();

      // Get coaching org company name
      const { data: org } = await supabase
        .from("coaching_orgs")
        .select("company_id")
        .eq("id", data.coaching_org_id)
        .maybeSingle();

      let orgName = "Unknown Org";
      if (org?.company_id) {
        const { data: orgCompany } = await supabase
          .from("companies")
          .select("name")
          .eq("id", org.company_id)
          .maybeSingle();
        orgName = orgCompany?.name || "Unknown Org";
      }

      return {
        ...data,
        _memberCompanyName: memberCompany?.name || "Unknown",
        _orgName: orgName
      };
    }
  });

  const { data: coachAssignments } = useQuery({
    queryKey: ["inspector-engagement-coaches", engagementId],
    queryFn: async (): Promise<CoachAssignmentData[]> => {
      const { data, error } = await supabase
        .from("coach_assignments")
        .select("id, coach_user_id, assignment_role, created_at")
        .eq("engagement_id", engagementId)
        .is("archived_at", null);

      if (error) throw error;

      const assignmentsWithNames = await Promise.all(
        (data || []).map(async (a) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", a.coach_user_id)
            .maybeSingle();

          return {
            ...a,
            _coachName: profile?.full_name || "Unknown",
            _coachEmail: profile?.email || "-"
          };
        })
      );

      return assignmentsWithNames;
    },
    enabled: !!engagementId
  });

  const { data: coachingAssignments } = useQuery({
    queryKey: ["inspector-engagement-coaching-assignments", engagementId],
    queryFn: async (): Promise<CoachingAssignmentData[]> => {
      const { data, error } = await supabase
        .from("coaching_assignments")
        .select("id, assignment_type, title_override, status, created_at")
        .eq("coaching_engagement_id", engagementId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const assignmentsWithCounts = await Promise.all(
        (data || []).map(async (a) => {
          const { count } = await supabase
            .from("coaching_assignment_instances")
            .select("id", { count: "exact", head: true })
            .eq("coaching_assignment_id", a.id);

          return {
            ...a,
            _instanceCount: count || 0
          };
        })
      );

      return assignmentsWithCounts;
    },
    enabled: !!engagementId
  });

  const { data: accessGrants } = useQuery({
    queryKey: ["inspector-engagement-access-grants", engagementId, engagement?.member_company_id],
    queryFn: async () => {
      if (!engagement?.member_company_id) return [];

      const { data, error } = await supabase
        .from("access_grants")
        .select("*")
        .eq("grantor_company_id", engagement.member_company_id)
        .eq("source_type", "coaching_engagement")
        .eq("source_id", engagementId);

      if (error) throw error;
      return data;
    },
    enabled: !!engagement?.member_company_id
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {engagement?._memberCompanyName || "Unknown"} ↔ {engagement?._orgName || "Unknown"}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={engagement?.status === "active" ? "default" : "secondary"}>
              {engagement?.status?.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/app/coaching/dashboard" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Coach Dashboard
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coaches">Coaches ({coachAssignments?.length || 0})</TabsTrigger>
          <TabsTrigger value="coaching-assignments">Coaching Assignments ({coachingAssignments?.length || 0})</TabsTrigger>
          <TabsTrigger value="access-grants">Access Grants ({accessGrants?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Engagement ID</dt>
                  <dd className="font-mono text-sm">{engagement?.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Member Company</dt>
                  <dd>{engagement?._memberCompanyName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Coaching Org</dt>
                  <dd>{engagement?._orgName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd>{engagement?.created_at && format(new Date(engagement.created_at), "PPP")}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coaches">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachAssignments?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a._coachName}</TableCell>
                      <TableCell>{a._coachEmail}</TableCell>
                      <TableCell>
                        <Badge variant={a.assignment_role === "primary_coach" ? "default" : "secondary"}>
                          {a.assignment_role}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {!coachAssignments?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No coaches assigned
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coaching-assignments">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Instances</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachingAssignments?.map((ca) => (
                    <TableRow key={ca.id}>
                      <TableCell>
                        <Badge variant="outline">{ca.assignment_type}</Badge>
                      </TableCell>
                      <TableCell>{ca.title_override || "From Template"}</TableCell>
                      <TableCell>
                        <Badge variant={ca.status === "assigned" ? "default" : "secondary"}>
                          {ca.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{ca._instanceCount}</TableCell>
                      <TableCell>{format(new Date(ca.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {!coachingAssignments?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No coaching assignments
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-grants">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coaching Scoped Only</TableHead>
                    <TableHead>Allow Non-Scoped Create</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessGrants?.map((ag) => (
                    <TableRow key={ag.id}>
                      <TableCell>{ag.module}</TableCell>
                      <TableCell>{ag.role}</TableCell>
                      <TableCell>
                        <Badge variant={ag.status === "active" ? "default" : "secondary"}>
                          {ag.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{ag.coaching_scoped_only ? "Yes" : "No"}</TableCell>
                      <TableCell>{ag.allow_non_scoped_create ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                  {!accessGrants?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No access grants
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
