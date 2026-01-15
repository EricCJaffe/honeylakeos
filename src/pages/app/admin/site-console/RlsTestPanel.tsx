import * as React from "react";
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TestResult {
  name: string;
  description: string;
  status: "pending" | "running" | "pass" | "fail";
  error?: string;
  data?: string;
}

export default function RlsTestPanel() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany, isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  const runTests = async () => {
    if (!user || !activeCompanyId) return;

    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Read Company
    testResults.push({ name: "Read Company", description: "Can I read my active company?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, status")
        .eq("id", activeCompanyId)
        .single();

      if (error) throw error;
      testResults[0] = { ...testResults[0], status: "pass", data: `Found: ${data.name}` };
    } catch (err: any) {
      testResults[0] = { ...testResults[0], status: "fail", error: err.message };
    }
    setResults([...testResults]);

    // Test 2: Read Employees
    testResults.push({ name: "Read Employees", description: "Can I read employees?", status: "running" });
    setResults([...testResults]);

    try {
      const { count, error } = await supabase
        .from("employees")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[1] = { ...testResults[1], status: "pass", data: `${count ?? 0} accessible` };
    } catch (err: any) {
      testResults[1] = { ...testResults[1], status: "fail", error: err.message };
    }
    setResults([...testResults]);

    // Test 3: Read My Membership
    testResults.push({ name: "Read Membership", description: "Can I read my own membership?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, status")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      testResults[2] = { ...testResults[2], status: "pass", data: `Role: ${data.role}` };
    } catch (err: any) {
      testResults[2] = { ...testResults[2], status: "fail", error: err.message };
    }
    setResults([...testResults]);

    // Test 4: Read Audit Logs
    testResults.push({ name: "Read Audit Logs", description: "Admin-only table access", status: "running" });
    setResults([...testResults]);

    try {
      const { count, error } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[3] = { ...testResults[3], status: "pass", data: `${count ?? 0} logs accessible` };
    } catch (err: any) {
      testResults[3] = {
        ...testResults[3],
        status: hasAccess ? "fail" : "pass",
        error: hasAccess ? err.message : undefined,
        data: hasAccess ? undefined : "Correctly blocked (not admin)",
      };
    }
    setResults([...testResults]);

    setIsRunning(false);
  };

  if (!activeCompanyId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select a company to run RLS tests.
        </CardContent>
      </Card>
    );
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          RLS Access Self-Test
          <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 ml-2">
            DEV
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground flex gap-4">
          <span>User: {user?.email}</span>
          <span>Company: {activeCompany?.name}</span>
          <div className="flex gap-1">
            {isSuperAdmin && <Badge>Super</Badge>}
            {isSiteAdmin && <Badge variant="secondary">Site</Badge>}
            {isCompanyAdmin && <Badge variant="outline">Company</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Tests
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
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  result.status === "fail" ? "border-red-200 dark:border-red-900" : ""
                }`}
              >
                <div className="mt-0.5">
                  {result.status === "running" && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                  {result.status === "pass" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {result.status === "fail" && <XCircle className="h-4 w-4 text-red-600" />}
                  {result.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
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
                  <p className="text-xs text-muted-foreground">{result.description}</p>
                  {result.data && <p className="text-xs text-green-600 mt-1">{result.data}</p>}
                  {result.error && <p className="text-xs text-red-600 mt-1 font-mono">{result.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
