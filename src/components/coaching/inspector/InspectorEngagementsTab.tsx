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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { InspectorEngagementDetail } from "./InspectorEngagementDetail";

interface EngagementData {
  id: string;
  coaching_org_id: string;
  member_company_id: string;
  status: string;
  created_at: string;
  _memberCompanyName: string;
  _orgName: string;
  _primaryCoach: string;
}

export function InspectorEngagementsTab() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedEngagementId, setSelectedEngagementId] = React.useState<string | null>(null);

  const { data: engagements, isLoading } = useQuery({
    queryKey: ["inspector-all-engagements", statusFilter],
    queryFn: async (): Promise<EngagementData[]> => {
      const { data, error } = await supabase
        .from("coaching_org_engagements")
        .select("id, coaching_org_id, member_company_id, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter by status in memory since we need typed data
      let filteredData = data || [];
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(e => e.status === statusFilter);
      }

      const engagementsWithDetails = await Promise.all(
        filteredData.map(async (eng) => {
          // Get member company name
          const { data: memberCompany } = await supabase
            .from("companies")
            .select("name")
            .eq("id", eng.member_company_id)
            .maybeSingle();

          // Get coaching org company name
          const { data: org } = await supabase
            .from("coaching_orgs")
            .select("company_id")
            .eq("id", eng.coaching_org_id)
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

          // Get primary coach
          const { data: coachAssignment } = await supabase
            .from("coach_assignments")
            .select("coach_user_id")
            .eq("engagement_id", eng.id)
            .eq("assignment_role", "primary_coach")
            .is("archived_at", null)
            .maybeSingle();

          let coachName = "Unassigned";
          if (coachAssignment?.coach_user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", coachAssignment.coach_user_id)
              .maybeSingle();
            coachName = profile?.full_name || "Unknown";
          }

          return {
            ...eng,
            _memberCompanyName: memberCompany?.name || "Unknown",
            _orgName: orgName,
            _primaryCoach: coachName
          };
        })
      );

      return engagementsWithDetails;
    }
  });

  if (selectedEngagementId) {
    return (
      <InspectorEngagementDetail
        engagementId={selectedEngagementId}
        onBack={() => setSelectedEngagementId(null)}
      />
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "suspended":
        return "secondary";
      case "ended":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Engagements</CardTitle>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !engagements?.length ? (
          <div className="text-center py-8 text-muted-foreground">No engagements found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Company</TableHead>
                <TableHead>Coaching Org</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary Coach</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engagements.map((eng) => (
                <TableRow
                  key={eng.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedEngagementId(eng.id)}
                >
                  <TableCell className="font-medium">
                    {eng._memberCompanyName}
                  </TableCell>
                  <TableCell>{eng._orgName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(eng.status)}>
                      {eng.status?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{eng._primaryCoach}</TableCell>
                  <TableCell>{format(new Date(eng.created_at), "MMM d, yyyy")}</TableCell>
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
