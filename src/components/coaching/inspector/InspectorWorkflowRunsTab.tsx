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

interface WorkflowRunData {
  id: string;
  coaching_workflow_assignment_id: string;
  run_for_period_start: string;
  status: string;
  created_at: string;
  _templateName: string;
  _memberCompanyName: string;
}

export function InspectorWorkflowRunsTab() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["inspector-all-workflow-runs"],
    queryFn: async (): Promise<WorkflowRunData[]> => {
      const { data, error } = await supabase
        .from("coaching_workflow_runs")
        .select("id, coaching_workflow_assignment_id, run_for_period_start, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const runsWithDetails = await Promise.all(
        (data || []).map(async (r) => {
          // Get assignment info
          const { data: assignment } = await supabase
            .from("coaching_workflow_assignments")
            .select("coaching_workflow_template_id, coaching_engagement_id")
            .eq("id", r.coaching_workflow_assignment_id)
            .maybeSingle();

          let templateName = "Unknown";
          let memberCompanyName = "Unknown";

          if (assignment) {
            // Get template name
            const { data: template } = await supabase
              .from("coaching_workflow_templates")
              .select("name")
              .eq("id", assignment.coaching_workflow_template_id)
              .maybeSingle();
            templateName = template?.name || "Unknown";

            // Get engagement member company name
            const { data: engagement } = await supabase
              .from("coaching_org_engagements")
              .select("member_company_id")
              .eq("id", assignment.coaching_engagement_id)
              .maybeSingle();

            if (engagement?.member_company_id) {
              const { data: company } = await supabase
                .from("companies")
                .select("name")
                .eq("id", engagement.member_company_id)
                .maybeSingle();
              memberCompanyName = company?.name || "Unknown";
            }
          }

          return {
            ...r,
            _templateName: templateName,
            _memberCompanyName: memberCompanyName
          };
        })
      );

      return runsWithDetails;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Runs (Last 100)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !runs?.length ? (
          <div className="text-center py-8 text-muted-foreground">No workflow runs found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Period Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Run At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r._templateName}</TableCell>
                  <TableCell>{r._memberCompanyName}</TableCell>
                  <TableCell>
                    {r.run_for_period_start 
                      ? format(new Date(r.run_for_period_start), "MMM d, yyyy")
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        r.status === "completed" ? "default" : 
                        r.status === "in_progress" ? "secondary" : 
                        "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(r.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
