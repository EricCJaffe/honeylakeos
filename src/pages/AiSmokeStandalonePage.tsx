import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";

type SmokeStatus = "pass" | "fail" | "warn" | "running" | "pending";

type SmokeCheck = {
  id: string;
  title: string;
  status: SmokeStatus;
  detail?: string;
};

function parseReason(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const r = p.readiness as Record<string, unknown> | undefined;
    if (r && typeof r.reason === "string") return r.reason;
    if (typeof p.error === "string") return p.error;
  }
  return null;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getProjectRefFromUrl(): string | null {
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL as string);
    return url.hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function describeInvokeFailure(error: unknown, payload?: unknown): string {
  const payloadReason = parseReason(payload);
  if (payloadReason) return payloadReason;

  const rawMessage = toMessage(error);
  const message = rawMessage.toLowerCase();
  const anyError = error as { name?: string; context?: { status?: number; statusText?: string } } | null;
  const status = anyError?.context?.status;
  const projectRef = getProjectRefFromUrl();

  if (status === 404 || message.includes("not found") || message.includes("does not exist")) {
    return `Edge Function not found in project ${projectRef ?? "(unknown project)"}. Deploy ai-gateway/manage-integration-secret to this project.`;
  }
  if (message.includes("failed to send a request to the edge function")) {
    return `Edge Function unreachable for project ${projectRef ?? "(unknown project)"}. Verify function deployment, auth, and CORS/network access.`;
  }
  if (status) {
    return `Edge Function request failed (${status}${anyError?.context?.statusText ? ` ${anyError.context.statusText}` : ""}): ${rawMessage}`;
  }
  return rawMessage;
}

export default function AiSmokeStandalonePage() {
  const { activeCompanyId, isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const [isRunning, setIsRunning] = React.useState(false);
  const [checks, setChecks] = React.useState<SmokeCheck[]>([
    { id: "workflow", title: "Gateway readiness (workflow)", status: "pending" },
    { id: "template", title: "Gateway readiness (template)", status: "pending" },
    { id: "key", title: "OpenAI key configured", status: "pending" },
  ]);
  const [diagnostics, setDiagnostics] = React.useState<Record<string, unknown>>({});

  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  const patch = (id: string, next: Partial<SmokeCheck>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)));
  };

  const run = async () => {
    if (!activeCompanyId) return;
    setIsRunning(true);
    const nextChecks: SmokeCheck[] = checks.map((c) => ({ ...c, status: "pending", detail: undefined }));
    setChecks(nextChecks);

    const patchLocal = (id: string, next: Partial<SmokeCheck>) => {
      for (let i = 0; i < nextChecks.length; i += 1) {
        if (nextChecks[i].id === id) {
          nextChecks[i] = { ...nextChecks[i], ...next };
          break;
        }
      }
      patch(id, next);
    };

    patchLocal("workflow", { status: "running" });
    let workflowPayload: unknown = null;
    try {
      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "workflow_copilot",
          userPrompt: "smoke",
          checkOnly: true,
        },
      });
      workflowPayload = data;
      if (error) {
        patchLocal("workflow", { status: "fail", detail: describeInvokeFailure(error, data) });
      } else {
        const ok = ((data as Record<string, unknown>)?.readiness as Record<string, unknown> | undefined)?.available === true;
        patchLocal("workflow", {
          status: ok ? "pass" : "warn",
          detail: parseReason(data) || (ok ? "Ready" : "Readiness check did not provide a reason"),
        });
      }
    } catch (e) {
      patchLocal("workflow", { status: "fail", detail: describeInvokeFailure(e) });
    }

    patchLocal("template", { status: "running" });
    let templatePayload: unknown = null;
    try {
      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "template_copilot",
          userPrompt: "smoke",
          checkOnly: true,
        },
      });
      templatePayload = data;
      if (error) {
        patchLocal("template", { status: "fail", detail: describeInvokeFailure(error, data) });
      } else {
        const ok = ((data as Record<string, unknown>)?.readiness as Record<string, unknown> | undefined)?.available === true;
        patchLocal("template", {
          status: ok ? "pass" : "warn",
          detail: parseReason(data) || (ok ? "Ready" : "Readiness check did not provide a reason"),
        });
      }
    } catch (e) {
      patchLocal("template", { status: "fail", detail: describeInvokeFailure(e) });
    }

    patchLocal("key", { status: "running" });
    let keyPayload: unknown = null;
    try {
      const { data, error } = await supabase.functions.invoke("manage-integration-secret", {
        body: {
          action: "check",
          scope: "company",
          scopeId: activeCompanyId,
          providerKey: "openai",
        },
      });
      keyPayload = data;
      if (error) {
        patchLocal("key", { status: "fail", detail: describeInvokeFailure(error, data) });
      } else {
        const configured = (data as { configured?: boolean } | null)?.configured === true;
        patchLocal("key", { status: configured ? "pass" : "warn", detail: configured ? "Configured" : "Not configured" });
      }
    } catch (e) {
      patchLocal("key", { status: "fail", detail: describeInvokeFailure(e) });
    }

    setDiagnostics({
      timestamp: new Date().toISOString(),
      activeCompanyId,
      checks: nextChecks,
      supabaseProjectRef: getProjectRefFromUrl(),
      payloads: {
        workflowPayload,
        templatePayload,
        keyPayload,
      },
    });

    setIsRunning(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ timestamp: new Date().toISOString(), activeCompanyId, checks, diagnostics }, null, 2));
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>AI Smoke Test (Standalone)</h1>
      <p style={{ color: "#666", marginTop: 8 }}>Fallback page without app shell UI dependencies.</p>

      {!hasAccess && (
        <p style={{ marginTop: 20, color: "#b91c1c" }}>Access denied: admin role required.</p>
      )}
      {!activeCompanyId && (
        <p style={{ marginTop: 20, color: "#b45309" }}>No active company selected.</p>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={run}
          disabled={!hasAccess || !activeCompanyId || isRunning}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#111", color: "#fff" }}
        >
          {isRunning ? "Running..." : "Run Checks"}
        </button>
        <button onClick={copy} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
          Copy Diagnostics
        </button>
      </div>

      <div style={{ marginTop: 20, border: "1px solid #e5e7eb", borderRadius: 10 }}>
        {checks.map((c) => (
          <div key={c.id} style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>{c.title}</strong>
              <span>{c.status}</span>
            </div>
            {c.detail && <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{c.detail}</div>}
          </div>
        ))}
      </div>

      <pre style={{ marginTop: 20, fontSize: 12, background: "#f8fafc", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 360 }}>
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  );
}
