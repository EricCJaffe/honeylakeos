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

export function InspectorWorkflowRunsTab() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["inspector-all-workflow-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_workflow_runs")
        .select(`
          id,
          workflow_assignment_id,
          run_for_period_start,
          status,
          created_at,
          assignment:coaching_workflow_assignments!coaching_workflow_runs_workflow_assignment_id_fkey(
            template:coaching_workflow_templates!coaching_workflow_assignments_template_id_fkey(name),
            engagement:coaching_org_engagements!coaching_workflow_assignments_engagement_id_fkey(
              member_company:companies!coaching_org_engagements_member_company_id_fkey(name)
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
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
                  <TableCell>{r.assignment?.template?.name || "Unknown"}</TableCell>
                  <TableCell>{r.assignment?.engagement?.member_company?.name || "Unknown"}</TableCell>
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
