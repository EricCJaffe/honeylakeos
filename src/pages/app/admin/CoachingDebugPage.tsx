import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Users, ShieldAlert, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Known coaching-related tables to check
const COACHING_TABLES = [
  "coaching_orgs",
  "coaching_org_memberships",
  "coaching_managers",
  "coaching_coaches",
  "coaching_org_engagements",
  "coaching_org_engagement_assignments",
  "coaching_assignments",
  "coaching_assignment_instances",
  "coaching_engagement_onboarding",
  "coaching_dashboards",
  "coaching_dashboard_widgets",
  "coaching_coach_profiles",
  "coaching_permission_templates",
  "coaching_engagements", // legacy
  "coach_assignments", // legacy
];

interface TableInfo {
  name: string;
  exists: boolean;
  columns?: string[];
  rowCount?: number;
}

interface MembershipRow {
  id: string;
  user_id: string;
  coaching_org_id: string;
  role: string;
  status: string;
  user_email?: string;
  org_name?: string;
}

interface RoleSummary {
  role: string;
  count: number;
}

export default function CoachingDebugPage() {
  const { isSiteAdmin, isSuperAdmin, loading: membershipLoading } = useMembership();
  const [copied, setCopied] = useState(false);

  // Check which coaching tables exist and get their info
  const { data: tableInfo, isLoading: tablesLoading } = useQuery({
    queryKey: ["coaching-debug-tables"],
    queryFn: async () => {
      const results: TableInfo[] = [];

      for (const tableName of COACHING_TABLES) {
        try {
          // Try to query the table to see if it exists
          const { data, error, count } = await supabase
            .from(tableName as any)
            .select("*", { count: "exact", head: true });

          if (error && error.code === "42P01") {
            // Table doesn't exist
            results.push({ name: tableName, exists: false });
          } else if (error) {
            results.push({ name: tableName, exists: false, columns: [`Error: ${error.message}`] });
          } else {
            // Table exists, get sample to infer columns
            const { data: sample } = await supabase
              .from(tableName as any)
              .select("*")
              .limit(1);

            const columns = sample && sample[0] ? Object.keys(sample[0]) : [];
            results.push({
              name: tableName,
              exists: true,
              columns,
              rowCount: count ?? 0,
            });
          }
        } catch (e) {
          results.push({ name: tableName, exists: false });
        }
      }

      return results;
    },
    enabled: isSiteAdmin || isSuperAdmin,
  });

  // Fetch coaching org memberships
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["coaching-debug-memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_org_memberships")
        .select(`
          id,
          user_id,
          coaching_org_id,
          role,
          status,
          coaching_orgs!inner(name)
        `)
        .limit(50);

      if (error) {
        console.error("Error fetching memberships:", error);
        return [];
      }

      // Get user emails
      const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map((profiles || []).map((p: any) => [p.user_id, p.email]));

      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        coaching_org_id: m.coaching_org_id,
        role: m.role,
        status: m.status,
        user_email: emailMap.get(m.user_id) || "Unknown",
        org_name: m.coaching_orgs?.name || "Unknown Org",
      })) as MembershipRow[];
    },
    enabled: isSiteAdmin || isSuperAdmin,
  });

  // Fetch managers
  const { data: managers, isLoading: managersLoading } = useQuery({
    queryKey: ["coaching-debug-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_managers")
        .select(`
          id,
          user_id,
          coaching_org_id,
          status,
          coaching_orgs!inner(name)
        `)
        .limit(50);

      if (error) return [];

      const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map((profiles || []).map((p: any) => [p.user_id, p.email]));

      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        coaching_org_id: m.coaching_org_id,
        role: "manager",
        status: m.status,
        user_email: emailMap.get(m.user_id) || "Unknown",
        org_name: m.coaching_orgs?.name || "Unknown Org",
      }));
    },
    enabled: isSiteAdmin || isSuperAdmin,
  });

  // Fetch coaches
  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ["coaching-debug-coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_coaches")
        .select(`
          id,
          user_id,
          coaching_org_id,
          status,
          coaching_orgs!inner(name)
        `)
        .limit(50);

      if (error) return [];

      const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map((profiles || []).map((p: any) => [p.user_id, p.email]));

      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        coaching_org_id: m.coaching_org_id,
        role: "coach",
        status: m.status,
        user_email: emailMap.get(m.user_id) || "Unknown",
        org_name: m.coaching_orgs?.name || "Unknown Org",
      }));
    },
    enabled: isSiteAdmin || isSuperAdmin,
  });

  // Calculate role summary
  const roleSummary: RoleSummary[] = [];
  if (memberships) {
    const roleCount = new Map<string, number>();
    memberships.forEach((m) => {
      const key = `membership:${m.role}`;
      roleCount.set(key, (roleCount.get(key) || 0) + 1);
    });
    managers?.forEach(() => {
      roleCount.set("manager", (roleCount.get("manager") || 0) + 1);
    });
    coaches?.forEach(() => {
      roleCount.set("coach", (roleCount.get("coach") || 0) + 1);
    });
    roleCount.forEach((count, role) => {
      roleSummary.push({ role, count });
    });
  }

  const handleCopy = () => {
    const data = {
      tables: tableInfo,
      memberships,
      managers,
      coaches,
      roleSummary,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Access control
  if (membershipLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSiteAdmin && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is only accessible to site administrators.</p>
      </div>
    );
  }

  const isLoading = tablesLoading || membershipsLoading || managersLoading || coachesLoading;
  const existingTables = tableInfo?.filter((t) => t.exists) || [];
  const missingTables = tableInfo?.filter((t) => !t.exists) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coaching Debug</h1>
          <p className="text-muted-foreground">Inspect coaching schema, tables, and memberships</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied!" : "Copy All Data"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Tables Found */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Coaching Tables Found ({existingTables.length})
              </CardTitle>
              <CardDescription>
                Tables that exist in the database with their columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existingTables.length === 0 ? (
                <p className="text-muted-foreground">No coaching membership schema found.</p>
              ) : (
                <div className="space-y-4">
                  {existingTables.map((t) => (
                    <div key={t.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="font-mono text-sm font-semibold">{t.name}</code>
                        <Badge variant="secondary">{t.rowCount} rows</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.columns?.map((col) => (
                          <Badge key={col} variant="outline" className="text-xs">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tables Not Found */}
          {missingTables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">
                  Tables Not Found ({missingTables.length})
                </CardTitle>
                <CardDescription>Searched for but not found in database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {missingTables.map((t) => (
                    <Badge key={t.name} variant="outline" className="text-muted-foreground">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Summary
              </CardTitle>
              <CardDescription>Count of users by role type</CardDescription>
            </CardHeader>
            <CardContent>
              {roleSummary.length === 0 ? (
                <p className="text-muted-foreground">No roles found.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {roleSummary.map((r) => (
                    <div key={r.role} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span className="font-medium">{r.role}</span>
                      <Badge>{r.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coaching Org Memberships */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Org Memberships (first 50)</CardTitle>
              <CardDescription>From coaching_org_memberships table</CardDescription>
            </CardHeader>
            <CardContent>
              {!memberships || memberships.length === 0 ? (
                <p className="text-muted-foreground">No coaching org memberships found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Org Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.user_email}</TableCell>
                        <TableCell>{m.org_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.status === "active" ? "default" : "secondary"}>
                            {m.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Managers */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Managers (first 50)</CardTitle>
              <CardDescription>From coaching_managers table</CardDescription>
            </CardHeader>
            <CardContent>
              {!managers || managers.length === 0 ? (
                <p className="text-muted-foreground">No coaching managers found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Org Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managers.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.user_email}</TableCell>
                        <TableCell>{m.org_name}</TableCell>
                        <TableCell>
                          <Badge variant={m.status === "active" ? "default" : "secondary"}>
                            {m.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Coaches */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Coaches (first 50)</CardTitle>
              <CardDescription>From coaching_coaches table</CardDescription>
            </CardHeader>
            <CardContent>
              {!coaches || coaches.length === 0 ? (
                <p className="text-muted-foreground">No coaching coaches found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Org Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coaches.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.user_email}</TableCell>
                        <TableCell>{c.org_name}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "secondary"}>
                            {c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
