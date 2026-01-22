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
import { ExternalLink, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { InspectorOrgDetail } from "./InspectorOrgDetail";

interface CoachingOrg {
  id: string;
  company_id: string;
  program_pack_id: string | null;
  program_snapshot_version: number | null;
  created_at: string;
  company?: {
    name: string;
  };
  program_pack?: {
    name: string;
  };
  _counts?: {
    managers: number;
    coaches: number;
    activeEngagements: number;
  };
}

export function InspectorOrgsTab() {
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(null);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["inspector-coaching-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_orgs")
        .select(`
          id,
          company_id,
          program_pack_id,
          program_snapshot_version,
          created_at,
          company:companies!coaching_orgs_company_id_fkey(name),
          program_pack:coaching_program_packs(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch counts for each org
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          const [managersResult, coachesResult, engagementsResult] = await Promise.all([
            supabase.from("coaching_managers").select("id", { count: "exact", head: true }).eq("coaching_org_id", org.id).eq("status", "active"),
            supabase.from("coaching_coaches").select("id", { count: "exact", head: true }).eq("coaching_org_id", org.id).eq("status", "active"),
            supabase.from("coaching_org_engagements").select("id", { count: "exact", head: true }).eq("coaching_org_id", org.id).eq("status", "active")
          ]);

          return {
            ...org,
            _counts: {
              managers: managersResult.count || 0,
              coaches: coachesResult.count || 0,
              activeEngagements: engagementsResult.count || 0
            }
          };
        })
      );

      return orgsWithCounts as CoachingOrg[];
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
                    {org.company?.name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {org.program_pack?.name || "No Program"}
                      {org.program_snapshot_version && ` v${org.program_snapshot_version}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{org._counts?.managers || 0}</TableCell>
                  <TableCell className="text-center">{org._counts?.coaches || 0}</TableCell>
                  <TableCell className="text-center">{org._counts?.activeEngagements || 0}</TableCell>
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
