import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export function InspectorAssignmentsTab() {
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["inspector-all-coaching-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_assignments")
        .select(`
          id,
          assignment_type,
          template_id,
          title_override,
          status,
          coaching_org_id,
          coaching_engagement_id,
          member_user_id,
          created_at,
          coaching_org:coaching_orgs!coaching_assignments_coaching_org_id_fkey(
            company:companies!coaching_orgs_company_id_fkey(name)
          ),
          engagement:coaching_org_engagements!coaching_assignments_coaching_engagement_id_fkey(
            member_company:companies!coaching_org_engagements_member_company_id_fkey(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get instance counts
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
    }
  });

  if (selectedAssignmentId) {
    return (
      <InspectorAssignmentDetail
        assignmentId={selectedAssignmentId}
        onBack={() => setSelectedAssignmentId(null)}
      />
    );
  }

  const getTargetDisplay = (a: NonNullable<typeof assignments>[0]) => {
    if (a.engagement?.member_company?.name) {
      return `Engagement: ${a.engagement.member_company.name}`;
    }
    if (a.member_user_id) {
      return `User: ${a.member_user_id.substring(0, 8)}...`;
    }
    return "Org-wide";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaching Assignments (Projection Layer)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !assignments?.length ? (
          <div className="text-center py-8 text-muted-foreground">No coaching assignments found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Instances</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAssignmentId(a.id)}
                >
                  <TableCell>
                    <Badge variant="outline">{a.assignment_type}</Badge>
                  </TableCell>
                  <TableCell>{a.title_override || "From Template"}</TableCell>
                  <TableCell>{getTargetDisplay(a)}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "assigned" ? "default" : "secondary"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{a._instanceCount}</TableCell>
                  <TableCell>{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface InspectorAssignmentDetailProps {
  assignmentId: string;
  onBack: () => void;
}

function InspectorAssignmentDetail({ assignmentId, onBack }: InspectorAssignmentDetailProps) {
  const { data: assignment, isLoading } = useQuery({
    queryKey: ["inspector-coaching-assignment-detail", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_assignments")
        .select(`
          id,
          assignment_type,
          template_id,
          title_override,
          status,
          due_at,
          created_at,
          coaching_org:coaching_orgs!coaching_assignments_coaching_org_id_fkey(
            company:companies!coaching_orgs_company_id_fkey(name)
          ),
          engagement:coaching_org_engagements!coaching_assignments_coaching_engagement_id_fkey(
            member_company:companies!coaching_org_engagements_member_company_id_fkey(name)
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: instances } = useQuery({
    queryKey: ["inspector-coaching-assignment-instances", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_assignment_instances")
        .select("id, created_table, created_id, status, created_at")
        .eq("coaching_assignment_id", assignmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId
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
          <h2 className="text-xl font-semibold">{assignment?.title_override || "Assignment"}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{assignment?.assignment_type}</Badge>
            <Badge variant={assignment?.status === "assigned" ? "default" : "secondary"}>
              {assignment?.status}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Assignment ID</dt>
              <dd className="font-mono text-sm">{assignment?.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Template ID</dt>
              <dd className="font-mono text-sm">{assignment?.template_id || "None"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Due At</dt>
              <dd>{assignment?.due_at ? format(new Date(assignment.due_at), "PPP") : "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd>{assignment?.created_at && format(new Date(assignment.created_at), "PPP")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Created Instances ({instances?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances?.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Badge variant="outline">{i.created_table}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{i.created_id}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === "active" ? "default" : "secondary"}>
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(i.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
              {!instances?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No instances created
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
