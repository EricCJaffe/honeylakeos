import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useAuth } from "@/lib/auth";
import { ModuleKey, CORE_MODULES } from "@/hooks/useModuleAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Boxes, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play,
  Loader2,
  Trash2,
  FolderKanban,
  CheckCircle,
  Calendar,
  StickyNote,
  FileText
} from "lucide-react";
import { toast } from "sonner";

interface ModuleCheckResult {
  moduleKey: ModuleKey;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  recordCount: number | null;
  testStatus: "idle" | "testing" | "pass" | "fail";
  testError?: string;
}

const moduleConfig: Record<string, { name: string; icon: React.ComponentType<{ className?: string }>; table: string }> = {
  projects: { name: "Projects", icon: FolderKanban, table: "projects" },
  tasks: { name: "Tasks", icon: CheckCircle, table: "tasks" },
  calendar: { name: "Calendar", icon: Calendar, table: "events" },
  notes: { name: "Notes", icon: StickyNote, table: "notes" },
  documents: { name: "Documents", icon: FileText, table: "documents" },
};

export default function ModuleChecklistPanel() {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checkResults, setCheckResults] = useState<ModuleCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch record counts for each module
  const { data: moduleCounts, isLoading: countsLoading } = useQuery({
    queryKey: ["module-counts", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return {};
      
      const counts: Record<string, number> = {};
      
      for (const [key, config] of Object.entries(moduleConfig)) {
        try {
          const { count, error } = await supabase
            .from(config.table as any)
            .select("*", { count: "exact", head: true })
            .eq("company_id", activeCompanyId);
          
          counts[key] = error ? 0 : (count ?? 0);
        } catch {
          counts[key] = 0;
        }
      }
      
      return counts;
    },
    enabled: !!activeCompanyId && !modulesLoading,
    staleTime: 30000,
  });

  const runCheck = async (moduleKey: ModuleKey) => {
    if (!activeCompanyId || !user) return;
    
    const config = moduleConfig[moduleKey];
    if (!config) return;

    setCheckResults(prev => 
      prev.map(r => r.moduleKey === moduleKey ? { ...r, testStatus: "testing" as const } : r)
    );

    try {
      // Create test record
      const testData: Record<string, any> = {
        company_id: activeCompanyId,
        created_by: user.id,
      };

      if (moduleKey === "projects") {
        testData.name = "[TEST] Module Check";
        testData.owner_user_id = user.id;
      } else if (moduleKey === "tasks") {
        testData.title = "[TEST] Module Check";
        testData.status = "to_do";
        testData.priority = "low";
      } else if (moduleKey === "calendar") {
        testData.title = "[TEST] Module Check";
        testData.start_at = new Date().toISOString();
      } else if (moduleKey === "notes") {
        testData.title = "[TEST] Module Check";
      } else if (moduleKey === "documents") {
        testData.name = "[TEST] Module Check";
        testData.file_path = "/test/check.txt";
      }

      const { data, error } = await supabase
        .from(config.table as any)
        .insert(testData)
        .select("id")
        .single();

      if (error) throw error;

      // Clean up immediately
      if (data) {
        await supabase
          .from(config.table as any)
          .delete()
          .eq("id", (data as any).id);
      }

      setCheckResults(prev => 
        prev.map(r => r.moduleKey === moduleKey ? { ...r, testStatus: "pass" as const } : r)
      );
      toast.success(`${config.name} module working correctly`);
    } catch (err: any) {
      setCheckResults(prev => 
        prev.map(r => r.moduleKey === moduleKey ? { 
          ...r, 
          testStatus: "fail" as const,
          testError: err.message 
        } : r)
      );
      toast.error(`${config.name} test failed: ${err.message}`);
    }
  };

  const runAllChecks = async () => {
    setIsChecking(true);
    
    // Initialize results
    const initialResults: ModuleCheckResult[] = Object.entries(moduleConfig).map(([key, config]) => ({
      moduleKey: key as ModuleKey,
      name: config.name,
      icon: config.icon,
      enabled: isEnabled(key as ModuleKey),
      recordCount: moduleCounts?.[key] ?? null,
      testStatus: "idle" as const,
    }));
    setCheckResults(initialResults);

    // Run checks for enabled modules only
    for (const result of initialResults) {
      if (result.enabled) {
        await runCheck(result.moduleKey);
      } else {
        setCheckResults(prev => 
          prev.map(r => r.moduleKey === result.moduleKey ? { 
            ...r, 
            testStatus: "pass" as const 
          } : r)
        );
      }
    }

    setIsChecking(false);
    queryClient.invalidateQueries({ queryKey: ["module-counts"] });
  };

  const isLoading = modulesLoading || countsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Module Readiness Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const enabledCount = Object.keys(moduleConfig).filter(k => isEnabled(k as ModuleKey)).length;
  const totalCount = Object.keys(moduleConfig).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          Module Readiness Checklist
          <Badge variant="secondary" className="ml-2">
            {enabledCount}/{totalCount} enabled
          </Badge>
        </CardTitle>
        <CardDescription>
          Verify that all enabled modules are working correctly for your company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAllChecks} disabled={isChecking}>
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run All Checks
            </>
          )}
        </Button>

        <div className="space-y-3">
          {Object.entries(moduleConfig).map(([key, config]) => {
            const moduleKey = key as ModuleKey;
            const enabled = isEnabled(moduleKey);
            const count = moduleCounts?.[key] ?? 0;
            const checkResult = checkResults.find(r => r.moduleKey === moduleKey);
            const Icon = config.icon;

            return (
              <div 
                key={key} 
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  enabled ? "bg-card" : "bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{config.name}</h4>
                    <Badge variant={enabled ? "default" : "secondary"}>
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {enabled ? `${count} records` : "Module is disabled for this company"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {checkResult?.testStatus === "testing" && (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  )}
                  {checkResult?.testStatus === "pass" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {checkResult?.testStatus === "fail" && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {(!checkResult || checkResult.testStatus === "idle") && enabled && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => runCheck(moduleKey)}
                      disabled={isChecking}
                    >
                      Test
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {checkResults.some(r => r.testStatus === "fail") && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Some checks failed</span>
            </div>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              {checkResults.filter(r => r.testStatus === "fail").map(r => (
                <li key={r.moduleKey}>
                  <strong>{r.name}:</strong> {r.testError || "Unknown error"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {checkResults.length > 0 && checkResults.every(r => r.testStatus === "pass") && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">All module checks passed!</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
