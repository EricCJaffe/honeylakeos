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

interface ManagerData {
  id: string;
  user_id: string;
  coaching_org_id: string;
  status: string;
  created_at: string;
  _fullName: string;
  _email: string;
  _orgName: string;
  _coachCount: number;
}

export function InspectorManagersTab() {
  const { data: managers, isLoading } = useQuery({
    queryKey: ["inspector-all-managers"],
    queryFn: async (): Promise<ManagerData[]> => {
      const { data, error } = await supabase
        .from("coaching_managers")
        .select("id, user_id, coaching_org_id, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const managersWithDetails = await Promise.all(
        (data || []).map(async (manager) => {
          // Get profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", manager.user_id)
            .maybeSingle();

          // Get org company name
          const { data: org } = await supabase
            .from("coaching_orgs")
            .select("company_id")
            .eq("id", manager.coaching_org_id)
            .maybeSingle();

          let orgName = "Unknown Org";
          if (org?.company_id) {
            const { data: company } = await supabase
              .from("companies")
              .select("name")
              .eq("id", org.company_id)
              .maybeSingle();
            orgName = company?.name || "Unknown Org";
          }

          // Get coach count
          const { count } = await supabase
            .from("coaching_manager_assignments")
            .select("id", { count: "exact", head: true })
            .eq("manager_id", manager.id)
            .eq("status", "active");

          return {
            ...manager,
            _fullName: profile?.full_name || "Unknown",
            _email: profile?.email || "-",
            _orgName: orgName,
            _coachCount: count || 0
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
                    {manager._fullName}
                  </TableCell>
                  <TableCell>{manager._email}</TableCell>
                  <TableCell>{manager._orgName}</TableCell>
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
