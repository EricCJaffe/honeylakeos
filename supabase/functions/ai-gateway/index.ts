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
  daily_token_budget: number;
  monthly_token_budget: number;
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

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function startOfUtcDay(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function startOfUtcMonth(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function estimateTokens(text: string): number {
  // Conservative char->token estimate for budget gating.
  return Math.ceil(text.length / 4);
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

function tryParseJsonFromModelOutput(output: string): unknown {
  const trimmed = output.trim();

  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(withoutFence);
  }

  return JSON.parse(trimmed);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateWorkflowOutput(obj: Record<string, unknown>): string | null {
  if (typeof obj.title !== "string" || !obj.title.trim()) return "title must be a non-empty string";
  if (typeof obj.description !== "string") return "description must be a string";
  if (typeof obj.trigger_type !== "string" || !obj.trigger_type.trim()) return "trigger_type must be a non-empty string";
  if (!Array.isArray(obj.steps)) return "steps must be an array";

  for (const [index, step] of obj.steps.entries()) {
    if (!isPlainObject(step)) return `steps[${index}] must be an object`;
    if (typeof step.step_type !== "string" || !step.step_type.trim()) return `steps[${index}].step_type must be a non-empty string`;
    if (typeof step.title !== "string" || !step.title.trim()) return `steps[${index}].title must be a non-empty string`;
    if (typeof step.assignee_type !== "string" || !step.assignee_type.trim()) return `steps[${index}].assignee_type must be a non-empty string`;
    if (step.instructions !== undefined && typeof step.instructions !== "string") return `steps[${index}].instructions must be a string when present`;
    if (step.due_offset_days !== undefined && typeof step.due_offset_days !== "number") return `steps[${index}].due_offset_days must be a number when present`;
  }

  return null;
}

function validateTemplateOutput(obj: Record<string, unknown>): string | null {
  if (typeof obj.title !== "string" || !obj.title.trim()) return "title must be a non-empty string";
  if (typeof obj.description !== "string") return "description must be a string";
  if (typeof obj.category !== "string" || !obj.category.trim()) return "category must be a non-empty string";
  if (!isStringArray(obj.required_modules)) return "required_modules must be an array of strings";
  if (!Array.isArray(obj.fields)) return "fields must be an array";

  for (const [index, field] of obj.fields.entries()) {
    if (!isPlainObject(field)) return `fields[${index}] must be an object`;
    if (typeof field.label !== "string" || !field.label.trim()) return `fields[${index}].label must be a non-empty string`;
    if (typeof field.field_type !== "string" || !field.field_type.trim()) return `fields[${index}].field_type must be a non-empty string`;
    if (typeof field.is_required !== "boolean") return `fields[${index}].is_required must be a boolean`;
    if (field.helper_text !== undefined && typeof field.helper_text !== "string") return `fields[${index}].helper_text must be a string when present`;
    if (field.options !== undefined && !isStringArray(field.options)) return `fields[${index}].options must be a string array when present`;
    if (typeof field.sort_order !== "number") return `fields[${index}].sort_order must be a number`;
  }

  return null;
}

function validateInsightOutput(obj: Record<string, unknown>): string | null {
  if (typeof obj.summary !== "string") return "summary must be a string";
  if (!isStringArray(obj.risks)) return "risks must be an array of strings";
  if (!isStringArray(obj.opportunities)) return "opportunities must be an array of strings";
  if (!isStringArray(obj.recommended_actions)) return "recommended_actions must be an array of strings";
  return null;
}

function validateOutputByTask(taskType: TaskType, outputText: string): { ok: true; parsed: Record<string, unknown> } | { ok: false; error: string } {
  let parsed: unknown;

  try {
    parsed = tryParseJsonFromModelOutput(outputText);
  } catch {
    return { ok: false, error: "Model output is not valid JSON" };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: "Model output must be a JSON object" };
  }

  const validationError =
    taskType === "workflow_copilot"
      ? validateWorkflowOutput(parsed)
      : taskType === "template_copilot"
        ? validateTemplateOutput(parsed)
        : validateInsightOutput(parsed);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  return { ok: true, parsed };
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

async function getTokenUsageInWindow(
  serviceClient: ReturnType<typeof createClient>,
  companyId: string,
  startIso: string,
  endIso: string,
): Promise<number> {
  const { data, error } = await serviceClient.rpc("company_ai_token_usage", {
    p_company_id: companyId,
    p_start: startIso,
    p_end: endIso,
  });

  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const start = Date.now();
  const nowIso = new Date().toISOString();

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
      .select("ai_enabled, insights_enabled, workflow_copilot_enabled, template_copilot_enabled, daily_token_budget, monthly_token_budget, max_prompt_tokens, max_completion_tokens")
      .eq("company_id", companyId)
      .maybeSingle();

    const typedSettings = aiSettings as CompanyAiSettings | null;

    if (!typedSettings || !isFeatureEnabled(taskType, typedSettings)) {
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
      body.maxOutputTokens ?? typedSettings.max_completion_tokens ?? 1200,
      64,
      typedSettings.max_completion_tokens ?? 1200,
    );
    const maxPromptChars = clampInteger((typedSettings.max_prompt_tokens ?? 6000) * 4, 1024, 120000);

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

    const estimatedInputTokens = estimateTokens(systemPrompt) + estimateTokens(userPayloadText);
    const projectedTotalTokens = estimatedInputTokens + maxOutputTokens;

    const [usedToday, usedMonth] = await Promise.all([
      getTokenUsageInWindow(serviceClient, companyId, startOfUtcDay(), nowIso),
      getTokenUsageInWindow(serviceClient, companyId, startOfUtcMonth(), nowIso),
    ]);

    if (usedToday + projectedTotalTokens > typedSettings.daily_token_budget) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: taskType,
        model: modelUsed,
        prompt_tokens: estimatedInputTokens,
        completion_tokens: maxOutputTokens,
        total_tokens: projectedTotalTokens,
        latency_ms: Date.now() - start,
        status: "blocked",
        error_code: "daily_token_budget_exceeded",
        metadata: {
          used_today: usedToday,
          daily_budget: typedSettings.daily_token_budget,
        },
      });

      return jsonResponse({ error: "Daily AI token budget exceeded" }, 429);
    }

    if (usedMonth + projectedTotalTokens > typedSettings.monthly_token_budget) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: taskType,
        model: modelUsed,
        prompt_tokens: estimatedInputTokens,
        completion_tokens: maxOutputTokens,
        total_tokens: projectedTotalTokens,
        latency_ms: Date.now() - start,
        status: "blocked",
        error_code: "monthly_token_budget_exceeded",
        metadata: {
          used_month: usedMonth,
          monthly_budget: typedSettings.monthly_token_budget,
        },
      });

      return jsonResponse({ error: "Monthly AI token budget exceeded" }, 429);
    }

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
    const promptTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : estimatedInputTokens;
    const completionTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : null;
    const totalTokens =
      typeof usage.total_tokens === "number"
        ? usage.total_tokens
        : promptTokens + (completionTokens ?? 0);

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
    const schemaValidation = validateOutputByTask(taskType, outputText);

    if (!schemaValidation.ok) {
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
        error_code: "invalid_output_schema",
        metadata: {
          validation_error: schemaValidation.error,
          output_preview: truncateText(outputText, 1200),
        },
      });

      return jsonResponse(
        {
          error: "Model output failed schema validation",
          details: schemaValidation.error,
        },
        502,
      );
    }

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
      outputJson: schemaValidation.parsed,
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
