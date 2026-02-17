import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSecretValue } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TaskType = "workflow_copilot" | "template_copilot" | "insight_summary";

type AiRequestBody = {
  companyId: string;
  taskType: TaskType;
  userPrompt: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

type CompanyAiSettings = {
  ai_enabled: boolean;
  insights_enabled: boolean;
  workflow_copilot_enabled: boolean;
  template_copilot_enabled: boolean;
  max_prompt_tokens: number;
  max_completion_tokens: number;
};

const promptPathByTask: Record<TaskType, string> = {
  workflow_copilot: "./prompts/workflow-copilot.system.md",
  template_copilot: "./prompts/template-copilot.system.md",
  insight_summary: "./prompts/insight-summary.system.md",
};

const promptCache = new Map<TaskType, string>();

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncateText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, maxChars)}\n\n[truncated]`;
}

function truncateRaw(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}

function extractOutputText(responsePayload: Record<string, unknown>): string {
  if (typeof responsePayload.output_text === "string" && responsePayload.output_text.length > 0) {
    return responsePayload.output_text;
  }

  const output = Array.isArray(responsePayload.output) ? responsePayload.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const maybeItem = item as Record<string, unknown>;
    const content = Array.isArray(maybeItem.content) ? maybeItem.content : [];

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const maybeContent = contentItem as Record<string, unknown>;
      if (typeof maybeContent.text === "string") {
        textParts.push(maybeContent.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

async function loadSystemPrompt(taskType: TaskType): Promise<string> {
  const cached = promptCache.get(taskType);
  if (cached) return cached;

  const path = promptPathByTask[taskType];
  const content = await Deno.readTextFile(new URL(path, import.meta.url));
  promptCache.set(taskType, content);
  return content;
}

function isFeatureEnabled(taskType: TaskType, settings: CompanyAiSettings): boolean {
  if (!settings.ai_enabled) return false;
  if (taskType === "workflow_copilot") return settings.workflow_copilot_enabled;
  if (taskType === "template_copilot") return settings.template_copilot_enabled;
  if (taskType === "insight_summary") return settings.insights_enabled;
  return false;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const start = Date.now();

  let companyId: string | null = null;
  let userId: string | null = null;
  let taskType: TaskType | null = null;
  let modelUsed = "gpt-4.1-mini";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Supabase environment is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    userId = authData.user.id;

    const body = (await req.json()) as AiRequestBody;
    companyId = body.companyId;
    taskType = body.taskType;

    if (!companyId || !taskType || !body.userPrompt?.trim()) {
      return jsonResponse({ error: "companyId, taskType, and userPrompt are required" }, 400);
    }

    if (!(taskType in promptPathByTask)) {
      return jsonResponse({ error: "Unsupported task type" }, 400);
    }

    const { data: company, error: companyError } = await serviceClient
      .from("companies")
      .select("id, site_id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return jsonResponse({ error: "Company not found" }, 404);
    }

    const [{ data: membership }, { data: siteMembership }] = await Promise.all([
      userClient
        .from("memberships")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
      userClient
        .from("site_memberships")
        .select("id")
        .eq("site_id", company.site_id)
        .eq("user_id", userId)
        .in("role", ["site_admin", "super_admin"])
        .maybeSingle(),
    ]);

    if (!membership && !siteMembership) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { data: aiSettings } = await serviceClient
      .from("company_ai_settings")
      .select("ai_enabled, insights_enabled, workflow_copilot_enabled, template_copilot_enabled, max_prompt_tokens, max_completion_tokens")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!aiSettings || !isFeatureEnabled(taskType, aiSettings as CompanyAiSettings)) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: taskType,
        model: modelUsed,
        status: "blocked",
        error_code: "feature_disabled",
        latency_ms: Date.now() - start,
        metadata: { reason: "AI feature is disabled for this company" },
      });

      return jsonResponse({ error: "AI feature is disabled for this company" }, 403);
    }

    const { data: integration } = await serviceClient
      .from("company_integrations")
      .select("config_json, is_enabled")
      .eq("company_id", companyId)
      .eq("provider_key", "openai")
      .maybeSingle();

    if (!integration?.is_enabled) {
      return jsonResponse({ error: "OpenAI integration is not enabled for this company" }, 400);
    }

    const { data: companySecret } = await serviceClient
      .from("integration_secrets")
      .select("encrypted_value")
      .eq("scope", "company")
      .eq("scope_id", companyId)
      .eq("provider_key", "openai")
      .eq("secret_key", "api_key")
      .maybeSingle();

    let encryptedKey = companySecret?.encrypted_value as string | undefined;

    if (!encryptedKey) {
      const { data: siteSecret } = await serviceClient
        .from("integration_secrets")
        .select("encrypted_value")
        .eq("scope", "site")
        .eq("scope_id", company.site_id)
        .eq("provider_key", "openai")
        .eq("secret_key", "api_key")
        .maybeSingle();

      encryptedKey = siteSecret?.encrypted_value as string | undefined;
    }

    if (!encryptedKey) {
      return jsonResponse({ error: "OpenAI API key is not configured" }, 400);
    }

    const openAiApiKey = await decryptSecretValue(encryptedKey);

    modelUsed =
      body.model ||
      ((integration.config_json as Record<string, unknown> | null)?.model as string | undefined) ||
      "gpt-4.1-mini";

    const temperature = typeof body.temperature === "number" ? Math.max(0, Math.min(1, body.temperature)) : 0.2;
    const maxOutputTokens = clampInteger(
      body.maxOutputTokens ?? aiSettings.max_completion_tokens ?? 1200,
      64,
      aiSettings.max_completion_tokens ?? 1200,
    );
    const maxPromptChars = clampInteger((aiSettings.max_prompt_tokens ?? 6000) * 4, 1024, 120000);

    const systemPrompt = await loadSystemPrompt(taskType);

    const userPayload = {
      instruction: truncateText(body.userPrompt.trim(), maxPromptChars),
      context: body.context ?? {},
      constraints: {
        return_json: true,
        concise: true,
      },
    };

    const userPayloadText = truncateRaw(JSON.stringify(userPayload), maxPromptChars);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: modelUsed,
        temperature,
        max_output_tokens: maxOutputTokens,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPayloadText }],
          },
        ],
      }),
    });

    const payload = (await response.json()) as Record<string, unknown>;

    const usage = (payload.usage as Record<string, unknown> | undefined) ?? {};
    const promptTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : null;
    const completionTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : null;
    const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : null;

    if (!response.ok) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: taskType,
        model: modelUsed,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: Date.now() - start,
        status: "error",
        error_code: `openai_${response.status}`,
        metadata: {
          response_status: response.status,
          response_body: payload,
        },
      });

      return jsonResponse(
        {
          error: "OpenAI request failed",
          details: payload,
        },
        502,
      );
    }

    const outputText = extractOutputText(payload);

    await serviceClient.from("ai_usage_logs").insert({
      request_id: requestId,
      company_id: companyId,
      user_id: userId,
      provider_key: "openai",
      feature_key: taskType,
      model: modelUsed,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      latency_ms: Date.now() - start,
      status: "success",
      metadata: {
        temperature,
        max_output_tokens: maxOutputTokens,
      },
    });

    return jsonResponse({
      requestId,
      model: modelUsed,
      outputText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
    });
  } catch (error) {
    console.error("ai-gateway error", error);

    if (companyId && taskType) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: taskType,
        model: modelUsed,
        latency_ms: Date.now() - start,
        status: "error",
        error_code: "internal_error",
        metadata: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
