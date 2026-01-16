import * as React from "react";
import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Building2,
  Boxes,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { CORE_MODULES, ModuleKey } from "@/hooks/useModuleAccess";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestResult {
  name: string;
  description: string;
  status: "pending" | "running" | "pass" | "fail";
  error?: string;
  data?: string;
}

interface ModuleTestResult {
  moduleKey: ModuleKey;
  enabled: boolean;
  selectResult: "pass" | "fail" | "blocked" | "pending";
  insertResult: "pass" | "fail" | "blocked" | "pending";
  cleanupResult: "pass" | "fail" | "skipped" | "pending";
  error?: string;
  recordCount?: number;
}

export default function RlsTestPage() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany, isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [moduleResults, setModuleResults] = useState<ModuleTestResult[]>([]);
  const [activeTab, setActiveTab] = useState("rls");

  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Module table mapping
  const moduleTableMap: Record<string, { table: string; testData: Record<string, any> }> = {
    tasks: { 
      table: "tasks", 
      testData: { title: "[TEST] RLS Test Task", status: "to_do", priority: "low" } 
    },
    calendar: { 
      table: "events", 
      testData: { title: "[TEST] RLS Test Event", start_at: new Date().toISOString() } 
    },
    projects: { 
      table: "projects", 
      testData: { name: "[TEST] RLS Test Project", owner_user_id: user?.id } 
    },
    notes: { 
      table: "notes", 
      testData: { title: "[TEST] RLS Test Note" } 
    },
    documents: { 
      table: "documents", 
      testData: { name: "[TEST] RLS Test Doc", file_path: "/test/file.txt" } 
    },
  };

  const runRlsTests = async () => {
    if (!user || !activeCompanyId) return;

    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Can read my company?
    testResults.push({ name: "Read Company", description: "Can I read my active company?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, status")
        .eq("id", activeCompanyId)
        .single();

      if (error) throw error;
      testResults[0] = { ...testResults[0], status: "pass", data: `Found: ${data.name} (${data.status})` };
    } catch (err: any) {
      testResults[0] = { ...testResults[0], status: "fail", error: err.message || "Failed to read company" };
    }
    setResults([...testResults]);

    // Test 2: Can read employees?
    testResults.push({ name: "Read Employees", description: "Can I read employees in my company?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("employees")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[1] = { ...testResults[1], status: "pass", data: `Query succeeded (${count ?? data?.length ?? 0} employees accessible)` };
    } catch (err: any) {
      testResults[1] = { ...testResults[1], status: "fail", error: err.message || "Failed to read employees" };
    }
    setResults([...testResults]);

    // Test 3: Can read groups?
    testResults.push({ name: "Read Groups", description: "Can I read groups in my company?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("groups")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[2] = { ...testResults[2], status: "pass", data: `Query succeeded (${count ?? data?.length ?? 0} groups accessible)` };
    } catch (err: any) {
      testResults[2] = { ...testResults[2], status: "fail", error: err.message || "Failed to read groups" };
    }
    setResults([...testResults]);

    // Test 4: Can read my membership?
    testResults.push({ name: "Read My Membership", description: "Can I read my own membership?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, status")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      testResults[3] = { ...testResults[3], status: "pass", data: `Role: ${data.role}, Status: ${data.status}` };
    } catch (err: any) {
      testResults[3] = { ...testResults[3], status: "fail", error: err.message || "Failed to read membership" };
    }
    setResults([...testResults]);

    // Test 5: Can read audit logs? (admin only)
    testResults.push({ name: "Read Audit Logs", description: "Can I read audit logs (admin required)?", status: "running" });
    setResults([...testResults]);

    try {
      const { data, error, count } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .limit(1);

      if (error) throw error;
      testResults[4] = { ...testResults[4], status: "pass", data: `Query succeeded (${count ?? data?.length ?? 0} logs accessible)` };
    } catch (err: any) {
      testResults[4] = {
        ...testResults[4],
        status: hasAccess ? "fail" : "pass",
        error: hasAccess ? err.message : undefined,
        data: hasAccess ? undefined : "Correctly blocked (not admin)",
      };
    }
    setResults([...testResults]);

    setIsRunning(false);
  };

  const runModuleTests = async () => {
    if (!user || !activeCompanyId) return;

    setIsRunning(true);
    const moduleKeys: ModuleKey[] = ["projects", "tasks", "calendar", "notes", "documents"];
    const testResults: ModuleTestResult[] = [];

    for (const moduleKey of moduleKeys) {
      const enabled = isEnabled(moduleKey);
      const config = moduleTableMap[moduleKey];
      
      const result: ModuleTestResult = {
        moduleKey,
        enabled,
        selectResult: "pending",
        insertResult: "pending",
        cleanupResult: "pending",
      };

      // SELECT test
      try {
        const { data, error, count } = await supabase
          .from(config.table as any)
          .select("id", { count: "exact" })
          .eq("company_id", activeCompanyId)
          .limit(1);

        if (error) {
          if (error.message.includes("42501") || error.message.includes("row-level security")) {
            result.selectResult = enabled ? "fail" : "blocked";
          } else {
            throw error;
          }
        } else {
          result.selectResult = enabled ? "pass" : "fail";
          result.recordCount = count ?? data?.length ?? 0;
        }
      } catch (err: any) {
        result.selectResult = "fail";
        result.error = err.message;
      }

      // INSERT test (only if module is enabled to avoid polluting DB when disabled)
      if (enabled) {
        let insertedId: string | null = null;
        try {
          const insertResult = await supabase
            .from(config.table as any)
            .insert({
              ...config.testData,
              company_id: activeCompanyId,
              created_by: user.id,
            })
            .select("id")
            .single();

          if (insertResult.error) {
            if (insertResult.error.message.includes("42501") || insertResult.error.message.includes("row-level security")) {
              result.insertResult = "blocked";
            } else {
              throw insertResult.error;
            }
          } else {
            result.insertResult = "pass";
            insertedId = (insertResult.data as any)?.id;
          }
        } catch (err: any) {
          result.insertResult = "fail";
          result.error = err.message;
        }

        // Cleanup
        if (insertedId) {
          try {
            await supabase
              .from(config.table as any)
              .delete()
              .eq("id", insertedId);

            result.cleanupResult = "pass";
          } catch {
            result.cleanupResult = "fail";
          }
        } else {
          result.cleanupResult = "skipped";
        }
      } else {
        // Test INSERT when disabled - should be blocked
        try {
          const { error } = await supabase
            .from(config.table as any)
            .insert({
              ...config.testData,
              company_id: activeCompanyId,
              created_by: user.id,
            });

          if (error) {
            if (error.message.includes("42501") || error.message.includes("row-level security")) {
              result.insertResult = "blocked"; // Expected when disabled
            } else {
              result.insertResult = "fail";
              result.error = error.message;
            }
          } else {
            result.insertResult = "fail"; // Should have been blocked!
            result.error = "INSERT succeeded when module is disabled!";
          }
        } catch (err: any) {
          result.insertResult = "blocked";
        }
        result.cleanupResult = "skipped";
      }

      testResults.push(result);
      setModuleResults([...testResults]);
    }

    setIsRunning(false);
  };

  if (!import.meta.env.DEV) {
    return (
      <div className="p-6">
        <EmptyState icon={Shield} title="Dev Only" description="This page is only available in development mode." />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState icon={Shield} title="Access Denied" description="You need admin privileges to run RLS tests." />
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState icon={Building2} title="No Company Selected" description="Please select a company to run tests." />
      </div>
    );
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  const getStatusIcon = (status: string) => {
    if (status === "pass" || status === "blocked") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === "fail") return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === "pending") return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    if (status === "skipped") return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    return <Loader2 className="h-4 w-4 animate-spin" />;
  };

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="RLS & Module Self-Test" description="Verify database access permissions and module enforcement (DEV only)" />

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rls">RLS Access Tests</TabsTrigger>
          <TabsTrigger value="modules">Module Toggle Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="rls" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={runRlsTests} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run RLS Tests
                </>
              )}
            </Button>
            {results.length > 0 && !isRunning && (
              <div className="flex gap-2 text-sm">
                <span className="text-green-600">{passCount} passed</span>
                <span className="text-muted-foreground">•</span>
                <span className={failCount > 0 ? "text-red-600" : "text-muted-foreground"}>{failCount} failed</span>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, index) => (
                <Card key={index} className={result.status === "fail" ? "border-red-200 dark:border-red-900" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{result.name}</h4>
                          <Badge variant={result.status === "pass" ? "outline" : result.status === "fail" ? "destructive" : "secondary"} className="text-[10px]">
                            {result.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.description}</p>
                        {result.data && <p className="text-xs text-green-600 mt-1">{result.data}</p>}
                        {result.error && <p className="text-xs text-red-600 mt-1 font-mono">{result.error}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={runModuleTests} disabled={isRunning || modulesLoading}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Boxes className="h-4 w-4 mr-2" />
                  Run Module Tests
                </>
              )}
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Module Toggle Self-Test</CardTitle>
              <CardDescription>
                Tests verify that enabled modules allow CRUD and disabled modules block INSERT operations at the database level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moduleResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Run tests to see results</p>
              ) : (
                <div className="space-y-3">
                  {moduleResults.map((result) => (
                    <div key={result.moduleKey} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm capitalize">{result.moduleKey}</h4>
                          <Badge variant={result.enabled ? "default" : "secondary"} className="text-[10px]">
                            {result.enabled ? "ENABLED" : "DISABLED"}
                          </Badge>
                          {result.recordCount !== undefined && (
                            <span className="text-xs text-muted-foreground">{result.recordCount} records</span>
                          )}
                        </div>
                        {result.error && <p className="text-xs text-red-600 mt-1 font-mono">{result.error}</p>}
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(result.selectResult)}
                          <span>SELECT</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(result.insertResult)}
                          <span>INSERT</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(result.cleanupResult)}
                          <span>CLEANUP</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Expected Behavior</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span><strong>Enabled module:</strong> SELECT ✓, INSERT ✓ (test record created/cleaned)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span><strong>Disabled module:</strong> SELECT blocked, INSERT blocked (RLS enforced)</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span><strong>Failure:</strong> INSERT succeeded when module disabled = security issue!</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
