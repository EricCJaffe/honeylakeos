import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Building2, AlertCircle, Bug } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Company {
  id: string;
  name: string;
  status: string;
  site_id: string;
  created_at: string;
  created_by: string | null;
}

export default function DevCompaniesPage() {
  const { user } = useAuth();
  const { activeCompanyId } = useMembership();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ code: string; message: string } | null>(null);

  React.useEffect(() => {
    async function fetchCompanies() {
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
    }

    fetchCompanies();
  }, []);

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
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies
            {!loading && !error && (
              <Badge variant="secondary" className="ml-2">
                {companies.length} total
              </Badge>
            )}
          </CardTitle>
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
