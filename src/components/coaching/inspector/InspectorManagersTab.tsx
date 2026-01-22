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

export function InspectorManagersTab() {
  const { data: managers, isLoading } = useQuery({
    queryKey: ["inspector-all-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_managers")
        .select(`
          id,
          user_id,
          coaching_org_id,
          status,
          created_at,
          coaching_org:coaching_orgs!coaching_managers_coaching_org_id_fkey(
            company:companies!coaching_orgs_company_id_fkey(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profile names and coach counts for each manager
      const managersWithDetails = await Promise.all(
        (data || []).map(async (manager) => {
          // Get profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", manager.user_id)
            .maybeSingle();

          // Get coach count
          const { count } = await supabase
            .from("coaching_manager_assignments")
            .select("id", { count: "exact", head: true })
            .eq("manager_id", manager.id)
            .eq("status", "active");

          return {
            ...manager,
            _profile: profile,
            _coachCount: count || 0,
            _activeEngagements: 0
          };
        })
      );

      return managersWithDetails;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Managers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !managers?.length ? (
          <div className="text-center py-8 text-muted-foreground">No managers found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Coaching Org</TableHead>
                <TableHead className="text-center"># Coaches Managed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="font-medium">
                    {manager._profile?.full_name || "Unknown"}
                  </TableCell>
                  <TableCell>{manager._profile?.email || "-"}</TableCell>
                  <TableCell>{manager.coaching_org?.company?.name || "Unknown Org"}</TableCell>
                  <TableCell className="text-center">{manager._coachCount}</TableCell>
                  <TableCell>
                    <Badge variant={manager.status === "active" ? "default" : "secondary"}>
                      {manager.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(manager.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
