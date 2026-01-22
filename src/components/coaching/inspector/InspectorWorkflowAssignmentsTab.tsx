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
import { format } from "date-fns";

interface WorkflowAssignmentData {
  id: string;
  coaching_engagement_id: string;
  coaching_workflow_template_id: string;
  cadence: string;
  status: string;
  next_run_at: string | null;
  created_at: string;
  _memberCompanyName: string;
  _templateName: string;
}

export function InspectorWorkflowAssignmentsTab() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["inspector-all-workflow-assignments"],
    queryFn: async (): Promise<WorkflowAssignmentData[]> => {
      const { data, error } = await supabase
        .from("coaching_workflow_assignments")
        .select("id, coaching_engagement_id, coaching_workflow_template_id, cadence, status, next_run_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const assignmentsWithDetails = await Promise.all(
        (data || []).map(async (a) => {
          // Get template name
          const { data: template } = await supabase
            .from("coaching_workflow_templates")
            .select("name")
            .eq("id", a.coaching_workflow_template_id)
            .maybeSingle();

          // Get engagement member company name
          const { data: engagement } = await supabase
            .from("coaching_org_engagements")
            .select("member_company_id")
            .eq("id", a.coaching_engagement_id)
            .maybeSingle();

          let memberCompanyName = "Unknown";
          if (engagement?.member_company_id) {
            const { data: company } = await supabase
              .from("companies")
              .select("name")
              .eq("id", engagement.member_company_id)
              .maybeSingle();
            memberCompanyName = company?.name || "Unknown";
          }

          return {
            ...a,
            _memberCompanyName: memberCompanyName,
            _templateName: template?.name || "Unknown"
          };
        })
      );

      return assignmentsWithDetails;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !assignments?.length ? (
          <div className="text-center py-8 text-muted-foreground">No workflow assignments found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Engagement</TableHead>
                <TableHead>Workflow Template</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Run At</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a._memberCompanyName}</TableCell>
                  <TableCell>{a._templateName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.cadence}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.next_run_at ? format(new Date(a.next_run_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
