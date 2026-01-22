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

export function InspectorWorkflowAssignmentsTab() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["inspector-all-workflow-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_workflow_assignments")
        .select(`
          id,
          engagement_id,
          template_id,
          cadence,
          status,
          next_run_at,
          created_at,
          template:coaching_workflow_templates!coaching_workflow_assignments_template_id_fkey(name),
          engagement:coaching_org_engagements!coaching_workflow_assignments_engagement_id_fkey(
            member_company:companies!coaching_org_engagements_member_company_id_fkey(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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
                  <TableCell>{a.engagement?.member_company?.name || "Unknown"}</TableCell>
                  <TableCell>{a.template?.name || "Unknown"}</TableCell>
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
