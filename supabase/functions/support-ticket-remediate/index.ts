import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decryptSecretValue } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriageResult {
  affected_areas: string[];
  remediation_prompt: string;
  root_cause_hypothesis: string;
  suggested_fix: string;
  classification: string;
  severity: string;
}

interface RemediationChange {
  path: string;
  content: string;
  summary: string;
}

interface RemediationOutput {
  changes: RemediationChange[];
  commit_message: string;
  summary: string;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PROJECT_CONVENTIONS = `
## HoneylakeOS Project Conventions

### Stack
- React 18 + Vite 5 + TypeScript (SPA deployed on Vercel, NOT Next.js — no API routes, no server components)
- Tailwind CSS with CSS variable-based theming (see color system below)
- shadcn-ui components in src/components/ui/ (Radix primitives + cva variants)
- TanStack Query v5 for data fetching — hooks in src/hooks/, never raw fetch() in components
- Supabase client at src/integrations/supabase/client.ts
- Import alias: @/ maps to src/

### CSS / Tailwind Color System
Colors use CSS variables with HSL values. DO NOT use hardcoded colors like bg-red-500.
Instead, use the design system tokens:
- primary, secondary, destructive, muted, accent, card, popover, background, foreground
- sidebar-specific: sidebar, sidebar-foreground, sidebar-primary, sidebar-accent
- chart colors: chart-1 through chart-5
- Border radius uses --radius CSS variable (lg, md, sm)
- Font: Inter + system-ui fallback

If you need a new color variant (e.g., a red button), add it to the component's cva() variants
using the destructive token (bg-destructive text-destructive-foreground) or Tailwind's built-in
colors only when no semantic token applies.

### shadcn-ui Button Component (src/components/ui/button.tsx)
Uses cva() with variants: default, destructive, outline, secondary, ghost, link
Sizes: default (h-9), sm (h-8), lg (h-10), xl (h-11), icon (h-9 w-9)
To add a new variant, add it to buttonVariants in cva(). Do NOT create a separate button component.

### File Structure
- src/components/ui/ — shadcn primitives (Button, Card, Badge, Select, etc.)
- src/components/ — app-specific components (layout/, support/, attachments/)
- src/pages/app/ — authenticated route pages
- src/pages/public/ — public pages
- src/hooks/ — custom React hooks (camelCase: useXxx.ts)
- src/lib/ — auth.tsx, membership.tsx, utils.ts, navigationConfig.ts
- src/integrations/supabase/ — client.ts, types.ts
- supabase/functions/ — Deno edge functions

### Coding Rules
- Functional components only, no class components
- Never modify shadcn-ui component internals in a way that breaks the upgrade path
- Use the cn() utility from @/lib/utils for conditional classNames
- Zod for form validation
- All pages are lazy-loaded in App.tsx
`;

// Key config files to auto-read from GitHub for better context
const CONTEXT_FILES = [
  "tailwind.config.ts",
  "src/components/ui/button.tsx",
  "src/App.tsx",
  "tsconfig.json",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const githubOwner = Deno.env.get("GITHUB_OWNER");
  const githubRepo = Deno.env.get("GITHUB_REPO");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse({ error: "Supabase environment not configured" }, 500);
  }

  if (!githubToken || !githubOwner || !githubRepo) {
    return jsonResponse({ error: "GitHub environment not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO secrets." }, 500);
  }

  // Auth: verify JWT and confirm admin role
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = authData.user.id;

    // Check admin role
    const { data: adminCheck } = await userClient
      .from("site_memberships")
      .select("id")
      .eq("user_id", userId)
      .in("role", ["site_admin", "super_admin"])
      .maybeSingle();

    if (!adminCheck) {
      return jsonResponse({ error: "Forbidden — admin role required" }, 403);
    }

    // Parse request
    const { ticketId } = await req.json();
    if (!ticketId) {
      return jsonResponse({ error: "ticketId is required" }, 400);
    }

    // Fetch ticket
    const { data: ticket, error: ticketError } = await serviceClient
      .from("support_tickets")
      .select("id, ticket_number, subject, description, ai_triage, ai_triage_status, company_id, site_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return jsonResponse({ error: "Ticket not found" }, 404);
    }

    if (ticket.ai_triage_status !== "complete" || !ticket.ai_triage) {
      return jsonResponse({ error: "Triage must be complete before remediation" }, 400);
    }

    const triage = ticket.ai_triage as unknown as TriageResult;

    // Update status to generating
    await serviceClient
      .from("support_tickets")
      .update({
        remediation_status: "generating",
        remediation_approved_by: userId,
        remediation_approved_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    console.log(`[remediate] Starting remediation for ticket #${ticket.ticket_number}`);

    const ghHeaders = {
      "Authorization": `Bearer ${githubToken}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "HoneylakeOS-Remediation",
    };

    // Helper: read a file from GitHub
    async function readGitHubFile(filePath: string): Promise<string | null> {
      try {
        const resp = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
          { headers: ghHeaders }
        );
        if (resp.ok) {
          const fileData = await resp.json();
          if (fileData.content && fileData.encoding === "base64") {
            const decoded = atob(fileData.content.replace(/\n/g, ""));
            return decoded.length > 8000 ? decoded.slice(0, 8000) + "\n\n[truncated]" : decoded;
          }
        }
        return null;
      } catch { return null; }
    }

    // Step 1a: Read project context files for better understanding
    const contextContents: Array<{ path: string; content: string }> = [];
    for (const ctxPath of CONTEXT_FILES) {
      const content = await readGitHubFile(ctxPath);
      if (content) contextContents.push({ path: ctxPath, content });
    }

    // Step 1b: Read affected files from triage
    const fileContents: Array<{ path: string; content: string }> = [];
    for (const filePath of triage.affected_areas.slice(0, 5)) {
      const content = await readGitHubFile(filePath);
      if (content) fileContents.push({ path: filePath, content });
      else console.log(`[remediate] Could not read: ${filePath}`);
    }

    // Step 2: Get OpenAI API key (same pattern as ai-gateway)
    const companyId = ticket.company_id;
    const siteId = ticket.site_id;
    let openAiApiKey: string | null = null;

    // Try company-level key first, then site-level
    for (const [scope, scopeId] of [["company", companyId], ["site", siteId]] as const) {
      if (!scopeId) continue;
      const { data: secret } = await serviceClient
        .from("integration_secrets")
        .select("encrypted_value")
        .eq("scope", scope)
        .eq("scope_id", scopeId)
        .eq("provider_key", "openai")
        .eq("secret_key", "api_key")
        .maybeSingle();

      if (secret?.encrypted_value) {
        openAiApiKey = await decryptSecretValue(secret.encrypted_value as string);
        break;
      }
    }

    if (!openAiApiKey) {
      await serviceClient.from("support_tickets").update({
        remediation_status: "failed",
        remediation_result: { error: "OpenAI API key not configured" },
      }).eq("id", ticketId);
      return jsonResponse({ error: "OpenAI API key not configured for this company" }, 400);
    }

    // Step 3: Call OpenAI for code generation
    const contextBlock = contextContents.length > 0
      ? "## Project Config Files (read-only reference — do NOT modify these unless the triage specifically says to)\n\n" +
        contextContents.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")
      : "";

    const fileContextBlock = fileContents.length > 0
      ? fileContents.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")
      : "No affected files could be read from the repository.";

    const aiPrompt = `You are a code remediation engine. Given a support ticket triage analysis, project config files, and the affected source files, generate the minimum code changes needed to fix the issue.

${PROJECT_CONVENTIONS}

${contextBlock}

## Triage Analysis
- Classification: ${triage.classification}
- Severity: ${triage.severity}
- Root Cause: ${triage.root_cause_hypothesis}
- Suggested Fix: ${triage.suggested_fix}

## Remediation Instructions
${triage.remediation_prompt}

## Current Source Files
${fileContextBlock}

## Response Format
Return strict JSON only:
{
  "changes": [
    { "path": "src/path/to/file.tsx", "content": "complete new file content", "summary": "what was changed and why" }
  ],
  "commit_message": "fix: descriptive commit message",
  "summary": "brief summary of all changes made"
}

Rules:
- Return the COMPLETE file content for each changed file (not diffs)
- Make minimal, targeted changes — do not refactor unrelated code
- Follow the project conventions above exactly
- Only modify files that need to change`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        max_output_tokens: 4096,
        input: [
          { role: "user", content: [{ type: "input_text", text: aiPrompt }] },
        ],
      }),
    });

    const aiPayload = await openAiResponse.json();

    if (!openAiResponse.ok) {
      console.error("[remediate] OpenAI error:", aiPayload);
      await serviceClient.from("support_tickets").update({
        remediation_status: "failed",
        remediation_result: { error: `OpenAI error: ${openAiResponse.status}` },
      }).eq("id", ticketId);
      return jsonResponse({ error: "OpenAI request failed" }, 502);
    }

    // Extract output text (same pattern as ai-gateway)
    let outputText = "";
    if (typeof aiPayload.output_text === "string") {
      outputText = aiPayload.output_text;
    } else {
      const output = Array.isArray(aiPayload.output) ? aiPayload.output : [];
      for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const c of content) {
          if (typeof c?.text === "string") outputText += c.text;
        }
      }
    }

    // Parse JSON from model output
    let remediation: RemediationOutput;
    try {
      const trimmed = outputText.trim();
      const jsonStr = trimmed.startsWith("```")
        ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
        : trimmed;
      remediation = JSON.parse(jsonStr);
    } catch {
      console.error("[remediate] Failed to parse AI output:", outputText.slice(0, 500));
      await serviceClient.from("support_tickets").update({
        remediation_status: "failed",
        remediation_result: { error: "Failed to parse AI output as JSON" },
      }).eq("id", ticketId);
      return jsonResponse({ error: "Failed to parse AI-generated code" }, 502);
    }

    if (!Array.isArray(remediation.changes) || remediation.changes.length === 0) {
      await serviceClient.from("support_tickets").update({
        remediation_status: "failed",
        remediation_result: { error: "AI produced no code changes" },
      }).eq("id", ticketId);
      return jsonResponse({ error: "AI produced no code changes" }, 502);
    }

    // Step 4: Create GitHub branch and PR (single atomic commit via Git Trees API)
    const branchName = `fix/support-${ticket.ticket_number}`;
    const ghJsonHeaders = { ...ghHeaders, "Content-Type": "application/json" };

    // Get base branch SHA
    const baseRef = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/ref/heads/main`,
      { headers: ghHeaders }
    );
    if (!baseRef.ok) throw new Error(`Failed to get base branch: ${baseRef.status}`);
    const baseSha = (await baseRef.json()).object.sha;

    // Get base commit's tree SHA
    const baseCommit = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/commits/${baseSha}`,
      { headers: ghHeaders }
    );
    if (!baseCommit.ok) throw new Error(`Failed to get base commit`);
    const baseTreeSha = (await baseCommit.json()).tree.sha;

    // Create blobs for each changed file
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
    for (const change of remediation.changes) {
      const blobResp = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs`,
        {
          method: "POST",
          headers: ghJsonHeaders,
          body: JSON.stringify({ content: change.content, encoding: "utf-8" }),
        }
      );
      if (!blobResp.ok) {
        console.error(`[remediate] Failed to create blob for ${change.path}`);
        continue;
      }
      const blob = await blobResp.json();
      treeItems.push({ path: change.path, mode: "100644", type: "blob", sha: blob.sha });
    }

    if (treeItems.length === 0) throw new Error("No blobs created — cannot commit");

    // Create tree with all changes
    const treeResp = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/trees`,
      {
        method: "POST",
        headers: ghJsonHeaders,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      }
    );
    if (!treeResp.ok) throw new Error(`Failed to create tree: ${(await treeResp.json()).message}`);
    const newTreeSha = (await treeResp.json()).sha;

    // Create single commit
    const commitResp = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/commits`,
      {
        method: "POST",
        headers: ghJsonHeaders,
        body: JSON.stringify({
          message: remediation.commit_message,
          tree: newTreeSha,
          parents: [baseSha],
        }),
      }
    );
    if (!commitResp.ok) throw new Error(`Failed to create commit: ${(await commitResp.json()).message}`);
    const newCommitSha = (await commitResp.json()).sha;

    // Delete branch if exists, then create pointing to our commit
    const checkBranch = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/ref/heads/${branchName}`,
      { headers: ghHeaders }
    );
    if (checkBranch.ok) {
      await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs/heads/${branchName}`,
        { method: "DELETE", headers: ghHeaders }
      );
    }
    const createRefResp = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs`,
      {
        method: "POST",
        headers: ghJsonHeaders,
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: newCommitSha }),
      }
    );
    if (!createRefResp.ok) throw new Error(`Failed to create branch: ${(await createRefResp.json()).message}`);

    // Create PR
    const createPr = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/pulls`,
      {
        method: "POST",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `fix: ${ticket.subject} (#${ticket.ticket_number})`,
          body: `## AI-Generated Fix for Support Ticket #${ticket.ticket_number}\n\n**Classification:** ${triage.classification}\n**Severity:** ${triage.severity}\n\n### Root Cause\n${triage.root_cause_hypothesis}\n\n### Summary\n${remediation.summary}\n\n### Files Changed\n${remediation.changes.map(c => `- \`${c.path}\` — ${c.summary}`).join("\n")}\n\n---\n*Generated by HoneylakeOS AI Remediation*`,
          head: branchName,
          base: "main",
        }),
      }
    );

    let prUrl = "";
    if (createPr.ok) {
      const prData = await createPr.json();
      prUrl = prData.html_url;
    } else {
      const err = await createPr.json();
      console.error("[remediate] Failed to create PR:", err);
      // Branch was created with commits — still useful
      prUrl = `https://github.com/${githubOwner}/${githubRepo}/compare/main...${branchName}`;
    }

    // Step 5: Update ticket with results
    await serviceClient.from("support_tickets").update({
      remediation_status: "pr_created",
      remediation_pr_url: prUrl,
      remediation_branch: branchName,
      remediation_result: {
        changes: remediation.changes.map(c => ({ path: c.path, summary: c.summary })),
        commit_message: remediation.commit_message,
        summary: remediation.summary,
        pr_url: prUrl,
        branch: branchName,
      },
    }).eq("id", ticketId);

    // Log event
    await serviceClient.from("support_ticket_events").insert({
      ticket_id: ticketId,
      event_type: "remediation_pr_created",
      created_by: userId,
      payload: { pr_url: prUrl, branch: branchName, files_changed: remediation.changes.length },
    });

    // Fire notification (fire-and-forget)
    serviceClient.functions.invoke("support-ticket-notify", {
      body: { ticket_id: ticketId, event: "status_changed", new_status: "pr_created" },
    }).catch(() => {});

    console.log(`[remediate] PR created: ${prUrl}`);

    return jsonResponse({
      success: true,
      pr_url: prUrl,
      branch: branchName,
      summary: remediation.summary,
      files_changed: remediation.changes.length,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[remediate] Error:", error);

    // Try to mark ticket as failed
    try {
      const serviceClient2 = createClient(supabaseUrl!, supabaseServiceKey!);
      const { ticketId } = await req.clone().json().catch(() => ({ ticketId: null }));
      if (ticketId) {
        await serviceClient2.from("support_tickets").update({
          remediation_status: "failed",
          remediation_result: { error: message },
        }).eq("id", ticketId);
      }
    } catch { /* best effort */ }

    return jsonResponse({ error: message }, 500);
  }
});
