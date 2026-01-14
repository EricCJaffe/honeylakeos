import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, AlertCircle, Bug, Plus } from "lucide-react";
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

// Known singleton site ID for dev fallback
const DEV_FALLBACK_SITE_ID = "52af4137-edb4-45ab-9bfe-cd7cfad2f55d";

export default function DevCompaniesPage() {
  const { user } = useAuth();
  const { activeCompanyId, refreshMemberships } = useMembership();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<{ code: string; message: string } | null>(null);

  const fetchCompanies = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("companies")
      .select("id,name,status,site_id,created_at,created_by")
      .order("created_at", { ascending: true });

    if (queryError) {
      setError({
        code: queryError.code || "UNKNOWN",
        message: queryError.message,
      });
      setCompanies([]);
    } else {
      setCompanies(data || []);
    }

    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Get default site ID through fallback chain
  async function getDefaultSiteId(): Promise<string | null> {
    // 1) Try RPC "get_default_site_id" if it exists
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_default_site_id" as any);
      if (!rpcError && rpcData) {
        console.log("[DevCompanies] Got site_id from get_default_site_id RPC:", rpcData);
        return rpcData as string;
      }
    } catch {
      // RPC doesn't exist, continue
    }

    // 2) Try getting site_id from an existing company
    if (companies.length > 0) {
      console.log("[DevCompanies] Got site_id from existing company:", companies[0].site_id);
      return companies[0].site_id;
    }

    // 3) Dev-only fallback: hardcoded singleton site ID
    if (import.meta.env.DEV) {
      console.log("[DevCompanies] Using hardcoded fallback site_id:", DEV_FALLBACK_SITE_ID);
      return DEV_FALLBACK_SITE_ID;
    }

    return null;
  }

  async function handleCreateTestCompany() {
    if (!user?.id) {
      toast.error("Not authenticated");
      return;
    }

    setCreating(true);

    try {
      // Step 1: Get the site ID
      const siteId = await getDefaultSiteId();
      if (!siteId) {
        toast.error("Could not determine site ID");
        setCreating(false);
        return;
      }

      const timestamp = Date.now();
      const companyName = `Test Company ${timestamp}`;

      // Step 2: Insert the company
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
        toast.error(`Company insert failed: [${companyError.code}] ${companyError.message}`);
        setCreating(false);
        return;
      }

      const newCompanyId = companyData.id;
      console.log("[DevCompanies] Created company:", newCompanyId);

      // Step 3: Insert membership
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          company_id: newCompanyId,
          user_id: user.id,
          role: "company_admin",
          status: "active",
          member_type: "internal",
        });

      if (membershipError) {
        toast.error(`Membership insert failed: [${membershipError.code}] ${membershipError.message}`);
        setCreating(false);
        return;
      }

      console.log("[DevCompanies] Created membership for user:", user.id);

      // Step 4: Update profile's active_company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active_company_id: newCompanyId })
        .eq("user_id", user.id);

      if (profileError) {
        toast.error(`Profile update failed: [${profileError.code}] ${profileError.message}`);
        setCreating(false);
        return;
      }

      console.log("[DevCompanies] Updated active_company_id in profile");

      // Step 5: Invalidate queries and refresh
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      if (activeCompanyId) {
        queryClient.invalidateQueries({ queryKey: ["memberships", activeCompanyId] });
      }
      queryClient.invalidateQueries({ queryKey: ["active-company"] });

      // Refresh membership context
      await refreshMemberships();

      // Refresh local companies list
      await fetchCompanies();

      toast.success(`Created company: ${newCompanyId}`, {
        description: companyName,
      });
    } catch (err) {
      console.error("[DevCompanies] Unexpected error:", err);
      toast.error("Unexpected error during company creation");
    } finally {
      setCreating(false);
    }
  }

  // Only show in dev mode
  if (!import.meta.env.DEV) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is only available in development mode.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Bug className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Companies (Dev)</h1>
          <p className="text-sm text-muted-foreground">
            Development-only view of all companies in the database
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-amber-600 border-amber-500 bg-amber-500/10">
          DEV ONLY
        </Badge>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current User Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">User ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">
                {user?.id || "Not authenticated"}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">
                {user?.email || "N/A"}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">Active Company ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">
                {activeCompanyId || "None"}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>PostgREST Error: {error.code}</AlertTitle>
          <AlertDescription className="font-mono text-xs mt-2">
            {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Companies Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Companies
              {!loading && !error && (
                <Badge variant="secondary" className="ml-2">
                  {companies.length} total
                </Badge>
              )}
            </CardTitle>
            <Button
              onClick={handleCreateTestCompany}
              disabled={creating || !user?.id}
              size="sm"
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Test Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 && !error ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found in the database.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Site ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Created By</TableHead>
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
                        <Badge
                          variant={company.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {company.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {company.site_id.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(company.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {company.created_by ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {company.created_by.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}