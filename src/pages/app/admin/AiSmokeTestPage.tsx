import * as React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

type SmokeStatus = "pass" | "fail" | "warn" | "running" | "pending";

interface SmokeCheck {
  id: string;
  title: string;
  description: string;
  status: SmokeStatus;
  detail?: string;
  meta?: Record<string, unknown>;
}

interface SmokeDiagnostics {
  timestamp: string;
  activeCompanyId: string | null;
  checks: SmokeCheck[];
  liveGeneration?: {
    status: SmokeStatus;
    detail?: string;
    requestId?: string;
    usage?: Record<string, unknown>;
  };
}

function getStatusIcon(status: SmokeStatus) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === "warn") return <AlertCircle className="h-4 w-4 text-amber-600" />;
  if (status === "running") return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function statusVariant(status: SmokeStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "pass") return "default";
  if (status === "fail") return "destructive";
  if (status === "warn") return "secondary";
  return "outline";
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function parseReadinessReason(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const readiness = p.readiness as Record<string, unknown> | undefined;
    if (readiness && typeof readiness.reason === "string") return readiness.reason;
    if (typeof p.error === "string") return p.error;
  }
  return "No reason provided";
}

export default function AiSmokeTestPage() {
  const { activeCompanyId, isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const [checks, setChecks] = React.useState<SmokeCheck[]>([
    {
      id: "gateway-workflow",
      title: "AI Gateway readiness (workflow copilot)",
      description: "Calls ai-gateway in check-only mode for workflow generation.",
      status: "pending",
    },
    {
      id: "gateway-template",
      title: "AI Gateway readiness (template copilot)",
      description: "Calls ai-gateway in check-only mode for template generation.",
      status: "pending",
    },
    {
      id: "secret-check",
      title: "OpenAI key configured",
      description: "Checks company OpenAI secret via manage-integration-secret.",
      status: "pending",
    },
    {
      id: "embed-table",
      title: "Embedding table reachable",
      description: "Verifies ai_document_chunks table can be queried from app context.",
      status: "pending",
    },
  ]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [liveGenerationStatus, setLiveGenerationStatus] = React.useState<SmokeDiagnostics["liveGeneration"]>();

  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  const updateCheck = React.useCallback((id: string, patch: Partial<SmokeCheck>) => {
    setChecks((prev) => prev.map((check) => (check.id === id ? { ...check, ...patch } : check)));
  }, []);

  const runSmokeChecks = React.useCallback(async () => {
    if (!activeCompanyId) return;

    setIsRunning(true);
    setLiveGenerationStatus(undefined);
    setChecks((prev) => prev.map((check) => ({ ...check, status: "pending", detail: undefined, meta: undefined })));

    // 1) ai-gateway workflow readiness
    updateCheck("gateway-workflow", { status: "running" });
    try {
      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "workflow_copilot",
          userPrompt: "smoke check",
          checkOnly: true,
        },
      });

      if (error) {
        const reason = parseReadinessReason(data) || toMessage(error);
        updateCheck("gateway-workflow", { status: "fail", detail: reason, meta: { error: toMessage(error), payload: data } });
      } else {
        const available = ((data as Record<string, unknown>)?.readiness as Record<string, unknown> | undefined)?.available === true;
        const reason = parseReadinessReason(data);
        updateCheck("gateway-workflow", {
          status: available ? "pass" : "warn",
          detail: available ? "Ready" : reason,
          meta: { payload: data },
        });
      }
    } catch (error) {
      updateCheck("gateway-workflow", { status: "fail", detail: toMessage(error) });
    }

    // 2) ai-gateway template readiness
    updateCheck("gateway-template", { status: "running" });
    try {
      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "template_copilot",
          userPrompt: "smoke check",
          checkOnly: true,
        },
      });

      if (error) {
        const reason = parseReadinessReason(data) || toMessage(error);
        updateCheck("gateway-template", { status: "fail", detail: reason, meta: { error: toMessage(error), payload: data } });
      } else {
        const available = ((data as Record<string, unknown>)?.readiness as Record<string, unknown> | undefined)?.available === true;
        const reason = parseReadinessReason(data);
        updateCheck("gateway-template", {
          status: available ? "pass" : "warn",
          detail: available ? "Ready" : reason,
          meta: { payload: data },
        });
      }
    } catch (error) {
      updateCheck("gateway-template", { status: "fail", detail: toMessage(error) });
    }

    // 3) key check
    updateCheck("secret-check", { status: "running" });
    try {
      const { data, error } = await supabase.functions.invoke("manage-integration-secret", {
        body: {
          action: "check",
          scope: "company",
          scopeId: activeCompanyId,
          providerKey: "openai",
        },
      });

      if (error) {
        updateCheck("secret-check", {
          status: "fail",
          detail: toMessage(error),
          meta: { error: toMessage(error), payload: data },
        });
      } else {
        const configured = (data as { configured?: boolean } | null)?.configured === true;
        updateCheck("secret-check", {
          status: configured ? "pass" : "warn",
          detail: configured ? "Configured" : "Not configured",
          meta: { payload: data },
        });
      }
    } catch (error) {
      updateCheck("secret-check", { status: "fail", detail: toMessage(error) });
    }

    // 4) embedding table reachable
    updateCheck("embed-table", { status: "running" });
    try {
      const { error } = await supabase.from("ai_document_chunks" as never).select("id", { count: "exact", head: true });

      if (error) {
        updateCheck("embed-table", { status: "warn", detail: toMessage(error), meta: { error: toMessage(error) } });
      } else {
        updateCheck("embed-table", { status: "pass", detail: "Query succeeded" });
      }
    } catch (error) {
      updateCheck("embed-table", { status: "fail", detail: toMessage(error) });
    }

    setIsRunning(false);
  }, [activeCompanyId, updateCheck]);

  const runLiveGeneration = React.useCallback(async () => {
    if (!activeCompanyId) return;

    setLiveGenerationStatus({ status: "running", detail: "Running live generation call..." });
    try {
      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "workflow_copilot",
          userPrompt: "Create a 3-step weekly check-in workflow for team leads.",
          context: {
            allowedStepTypes: ["task", "note", "meeting"],
            allowedAssignees: ["manager", "org_admin", "unassigned"],
          },
        },
      });

      if (error) {
        setLiveGenerationStatus({
          status: "fail",
          detail: parseReadinessReason(data) || toMessage(error),
        });
        return;
      }

      const payload = data as Record<string, unknown>;
      setLiveGenerationStatus({
        status: "pass",
        detail: "Live generation succeeded",
        requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
        usage: (payload.usage as Record<string, unknown> | undefined) || undefined,
      });
    } catch (error) {
      setLiveGenerationStatus({ status: "fail", detail: toMessage(error) });
    }
  }, [activeCompanyId]);

  const diagnostics: SmokeDiagnostics = React.useMemo(
    () => ({
      timestamp: new Date().toISOString(),
      activeCompanyId: activeCompanyId || null,
      checks,
      liveGeneration: liveGenerationStatus,
    }),
    [activeCompanyId, checks, liveGenerationStatus],
  );

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      toast.success("Diagnostics copied");
    } catch (error) {
      toast.error(`Failed to copy diagnostics: ${toMessage(error)}`);
    }
  };

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState icon={AlertCircle} title="Access Denied" description="You need admin privileges to run AI smoke tests." />
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState icon={AlertCircle} title="No Company Selected" description="Select a company to run AI smoke tests." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <PageHeader
        title="AI Smoke Test"
        description="Preflight checks for AI deployment, configuration, and runtime readiness."
      />

      <div className="flex items-center gap-2">
        <Button onClick={runSmokeChecks} disabled={isRunning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running Checks..." : "Run Checks"}
        </Button>
        <Button variant="outline" onClick={runLiveGeneration} disabled={isRunning}>
          <Play className="h-4 w-4 mr-2" />
          Run Live Generation Test
        </Button>
        <Button variant="outline" onClick={handleCopyDiagnostics}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Diagnostics JSON
        </Button>
      </div>

      <div className="flex gap-2">
        <Badge variant="default">Pass: {passCount}</Badge>
        <Badge variant={warnCount > 0 ? "secondary" : "outline"}>Warn: {warnCount}</Badge>
        <Badge variant={failCount > 0 ? "destructive" : "outline"}>Fail: {failCount}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>Run these checks after migrations/functions deploy and key setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <p className="font-medium text-sm">{check.title}</p>
                </div>
                <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
              {check.detail && <p className="text-xs mt-2">{check.detail}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {liveGenerationStatus && (
        <Alert variant={liveGenerationStatus.status === "fail" ? "destructive" : "default"}>
          <AlertTitle>Live Generation Test: {liveGenerationStatus.status.toUpperCase()}</AlertTitle>
          <AlertDescription>
            {liveGenerationStatus.detail}
            {liveGenerationStatus.requestId && <span className="block mt-1">Request ID: {liveGenerationStatus.requestId}</span>}
            {liveGenerationStatus.usage && (
              <span className="block mt-1">Usage: {JSON.stringify(liveGenerationStatus.usage)}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
          <CardDescription>Share this JSON when reporting any smoke-test failure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 h-px w-full bg-border" />
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[360px]">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
