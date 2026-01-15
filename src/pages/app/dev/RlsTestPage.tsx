import * as React from "react";
import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Building2,
  Users,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TestResult {
  name: string;
  description: string;
  status: "pending" | "running" | "pass" | "fail";
  error?: string;
  data?: string;
}

export default function RlsTestPage() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany, isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  const runTests = async () => {
    if (!user || !activeCompanyId) return;

    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Can read my company?
    testResults.push({
      name: "Read Company",
      description: "Can I read my active company?",
      status: "running",
    });
    setResults([...testResults]);

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, status")
        .eq("id", activeCompanyId)
        .single();

      if (error) throw error;
      testResults[0] = {
        ...testResults[0],
        status: "pass",
        data: `Found: ${data.name} (${data.status})`,
      };
    } catch (err: any) {
      testResults[0] = {
        ...testResults[0],
        status: "fail",
        error: err.message || "Failed to read company",
      };
    }
    setResults([...testResults]);

    // Test 2: Can read employees?
    testResults.push({
      name: "Read Employees",
      description: "Can I read employees in my company?",
      status: "running",
    });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("employees")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[1] = {
        ...testResults[1],
        status: "pass",
        data: `Query succeeded (${count ?? data?.length ?? 0} employees accessible)`,
      };
    } catch (err: any) {
      testResults[1] = {
        ...testResults[1],
        status: "fail",
        error: err.message || "Failed to read employees",
      };
    }
    setResults([...testResults]);

    // Test 3: Can read groups?
    testResults.push({
      name: "Read Groups",
      description: "Can I read groups in my company?",
      status: "running",
    });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("groups")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[2] = {
        ...testResults[2],
        status: "pass",
        data: `Query succeeded (${count ?? data?.length ?? 0} groups accessible)`,
      };
    } catch (err: any) {
      testResults[2] = {
        ...testResults[2],
        status: "fail",
        error: err.message || "Failed to read groups",
      };
    }
    setResults([...testResults]);

    // Test 4: Can read locations?
    testResults.push({
      name: "Read Locations",
      description: "Can I read locations in my company?",
      status: "running",
    });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("locations")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[3] = {
        ...testResults[3],
        status: "pass",
        data: `Query succeeded (${count ?? data?.length ?? 0} locations accessible)`,
      };
    } catch (err: any) {
      testResults[3] = {
        ...testResults[3],
        status: "fail",
        error: err.message || "Failed to read locations",
      };
    }
    setResults([...testResults]);

    // Test 5: Can read my membership?
    testResults.push({
      name: "Read My Membership",
      description: "Can I read my own membership?",
      status: "running",
    });
    setResults([...testResults]);

    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, status")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      testResults[4] = {
        ...testResults[4],
        status: "pass",
        data: `Role: ${data.role}, Status: ${data.status}`,
      };
    } catch (err: any) {
      testResults[4] = {
        ...testResults[4],
        status: "fail",
        error: err.message || "Failed to read membership",
      };
    }
    setResults([...testResults]);

    // Test 6: Can read audit logs? (admin only)
    testResults.push({
      name: "Read Audit Logs",
      description: "Can I read audit logs (admin required)?",
      status: "running",
    });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[5] = {
        ...testResults[5],
        status: "pass",
        data: `Query succeeded (${count ?? data?.length ?? 0} logs accessible)`,
      };
    } catch (err: any) {
      testResults[5] = {
        ...testResults[5],
        status: hasAccess ? "fail" : "pass",
        error: hasAccess ? err.message : undefined,
        data: hasAccess ? undefined : "Correctly blocked (not admin)",
      };
    }
    setResults([...testResults]);

    setIsRunning(false);
  };

  if (!import.meta.env.DEV) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Dev Only"
          description="This page is only available in development mode."
        />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need admin privileges to run RLS tests."
        />
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="No Company Selected"
          description="Please select a company to run RLS tests."
        />
      </div>
    );
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="RLS Access Self-Test"
        description="Verify your database access permissions (DEV only)"
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Test Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">User</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Company</span>
            <span>{activeCompany?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Admin Level</span>
            <div className="flex gap-1">
              {isSuperAdmin && <Badge>Super</Badge>}
              {isSiteAdmin && <Badge variant="secondary">Site</Badge>}
              {isCompanyAdmin && <Badge variant="outline">Company</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 mb-6">
        <Button onClick={runTests} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Access Self-Test
            </>
          )}
        </Button>

        {results.length > 0 && !isRunning && (
          <div className="flex gap-2 text-sm">
            <span className="text-green-600">{passCount} passed</span>
            <span className="text-muted-foreground">•</span>
            <span className={failCount > 0 ? "text-red-600" : "text-muted-foreground"}>
              {failCount} failed
            </span>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <Card key={index} className={result.status === "fail" ? "border-red-200 dark:border-red-900" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {result.status === "running" && (
                      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    )}
                    {result.status === "pass" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {result.status === "fail" && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    {result.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{result.name}</h4>
                      <Badge
                        variant={result.status === "pass" ? "outline" : result.status === "fail" ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.description}</p>
                    {result.data && (
                      <p className="text-xs text-green-600 mt-1">{result.data}</p>
                    )}
                    {result.error && (
                      <p className="text-xs text-red-600 mt-1 font-mono">{result.error}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
