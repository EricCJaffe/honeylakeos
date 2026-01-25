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

interface CoachData {
  id: string;
  user_id: string;
  coaching_org_id: string;
  status: string;
  created_at: string;
  _fullName: string;
  _email: string;
  _orgName: string;
  _activeEngagements: number;
}

export function InspectorCoachesTab() {
  const { data: coaches, isLoading } = useQuery({
    queryKey: ["inspector-all-coaches"],
    queryFn: async (): Promise<CoachData[]> => {
      const { data, error } = await supabase
        .from("coaching_coaches")
        .select("id, user_id, coaching_org_id, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const coachesWithDetails = await Promise.all(
        (data || []).map(async (coach) => {
          // Get profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", coach.user_id)
            .maybeSingle();

          // Get org company name
          const { data: org } = await supabase
            .from("coaching_orgs")
            .select("company_id")
            .eq("id", coach.coaching_org_id)
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

          // Get active engagements count
          const { count: engagementCount } = await supabase
            .from("coach_assignments")
            .select("id", { count: "exact", head: true })
            .eq("coach_user_id", coach.user_id)
            .is("archived_at", null);

          return {
            ...coach,
            _fullName: profile?.full_name || "Unknown",
            _email: profile?.email || "-",
            _orgName: orgName,
            _activeEngagements: engagementCount || 0
          };
        })
      );

      return coachesWithDetails;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaches</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !coaches?.length ? (
          <div className="text-center py-8 text-muted-foreground">No coaches found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Coaching Org</TableHead>
                <TableHead className="text-center">Active Engagements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map((coach) => (
                <TableRow key={coach.id}>
                  <TableCell className="font-medium">
                    {coach._fullName}
                  </TableCell>
                  <TableCell>{coach._email}</TableCell>
                  <TableCell>{coach._orgName}</TableCell>
                  <TableCell className="text-center">{coach._activeEngagements}</TableCell>
                  <TableCell>
                    <Badge variant={coach.status === "active" ? "default" : "secondary"}>
                      {coach.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(coach.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
