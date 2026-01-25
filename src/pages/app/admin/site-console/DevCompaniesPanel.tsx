import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  status: string;
  site_id: string;
  created_at: string;
  created_by: string | null;
}

export default function DevCompaniesPanel() {
  const { user } = useAuth();
  const { activeCompanyId, refreshMemberships } = useMembership();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const fetchCompanies = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,status,site_id,created_at,created_by")
      .order("created_at", { ascending: true });

    if (!error) {
      setCompanies(data || []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function getDefaultSiteId(): Promise<string | null> {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_default_site_id");
    if (!rpcError && rpcData) return rpcData as string;
    if (companies.length > 0) return companies[0].site_id;
    return null;
  }

  async function handleCreateTestCompany() {
    if (!user?.id) {
      toast.error("Not authenticated");
      return;
    }

    setCreating(true);

    try {
      const siteId = await getDefaultSiteId();
      if (!siteId) {
        toast.error("Could not determine site ID");
        setCreating(false);
        return;
      }

      const timestamp = Date.now();
      const companyName = `Test Company ${timestamp}`;

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          description: "Dev test company",
          site_id: siteId,
          status: "active",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (companyError) {
        toast.error(`Company insert failed: ${companyError.message}`);
        setCreating(false);
        return;
      }

      const newCompanyId = companyData.id;

      const { error: membershipError } = await supabase.from("memberships").insert({
        company_id: newCompanyId,
        user_id: user.id,
        role: "company_admin",
        status: "active",
        member_type: "internal",
      });

      if (membershipError) {
        toast.error(`Membership insert failed: ${membershipError.message}`);
        setCreating(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active_company_id: newCompanyId })
        .eq("user_id", user.id);

      if (profileError) {
        toast.error(`Profile update failed: ${profileError.message}`);
        setCreating(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      if (activeCompanyId) {
        queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      }
      queryClient.invalidateQueries({ queryKey: ["active-company"] });

      await refreshMemberships();
      await fetchCompanies();

      toast.success(`Created: ${companyName}`);
    } catch {
      toast.error("Unexpected error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies (Dev)
            <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 ml-2">
              DEV
            </Badge>
          </CardTitle>
          <Button onClick={handleCreateTestCompany} disabled={creating || !user?.id} size="sm" className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Test Company
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4 space-y-1">
          <div>User: <code className="bg-muted px-1 rounded">{user?.id?.slice(0, 8) || "N/A"}...</code></div>
          <div>Active Company: <code className="bg-muted px-1 rounded">{activeCompanyId?.slice(0, 8) || "None"}...</code></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No companies found.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {company.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <Badge variant={company.status === "active" ? "default" : "secondary"}>
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(company.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
