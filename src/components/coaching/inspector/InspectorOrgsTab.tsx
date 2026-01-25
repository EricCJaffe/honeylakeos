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
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { InspectorOrgDetail } from "./InspectorOrgDetail";

interface CoachingOrgData {
  id: string;
  company_id: string;
  program_name: string;
  program_version: string | null;
  created_at: string;
  _companyName: string;
  _counts: {
    managers: number;
    coaches: number;
    activeEngagements: number;
  };
}

export function InspectorOrgsTab() {
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(null);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["inspector-coaching-orgs"],
    queryFn: async (): Promise<CoachingOrgData[]> => {
      const { data, error } = await supabase
        .from("coaching_orgs")
        .select("id, company_id, program_name, program_version, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch company names and counts for each org
      const orgsWithDetails = await Promise.all(
        (data || []).map(async (org) => {
          // Get company name
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", org.company_id)
            .maybeSingle();

          // Fetch counts
          const [managersResult, coachesResult, engagementsResult] = await Promise.all([
            supabase.from("coaching_managers").select("id", { count: "exact", head: true }).eq("coaching_org_id", org.id).eq("status", "active"),
            supabase.from("coaching_coaches").select("id", { count: "exact", head: true }).eq("coaching_org_id", org.id).eq("status", "active"),
            supabase.from("coaching_org_engagements").select("id", { count: "exact", head: true }).eq("coaching_org_id", org.id).eq("status", "active")
          ]);

          return {
            id: org.id,
            company_id: org.company_id,
            program_name: org.program_name,
            program_version: org.program_version,
            created_at: org.created_at,
            _companyName: company?.name || "Unknown",
            _counts: {
              managers: managersResult.count || 0,
              coaches: coachesResult.count || 0,
              activeEngagements: engagementsResult.count || 0
            }
          };
        })
      );

      return orgsWithDetails;
    }
  });

  if (selectedOrgId) {
    return (
      <InspectorOrgDetail 
        orgId={selectedOrgId} 
        onBack={() => setSelectedOrgId(null)} 
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaching Organizations</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !orgs?.length ? (
          <div className="text-center py-8 text-muted-foreground">No coaching organizations found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Org Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="text-center"># Managers</TableHead>
                <TableHead className="text-center"># Coaches</TableHead>
                <TableHead className="text-center"># Active Engagements</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow 
                  key={org.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedOrgId(org.id)}
                >
                  <TableCell className="font-medium">
                    {org._companyName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {org.program_name || "No Program"}
                      {org.program_version && ` v${org.program_version}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{org._counts.managers}</TableCell>
                  <TableCell className="text-center">{org._counts.coaches}</TableCell>
                  <TableCell className="text-center">{org._counts.activeEngagements}</TableCell>
                  <TableCell>{format(new Date(org.created_at), "MMM d, yyyy")}</TableCell>
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
