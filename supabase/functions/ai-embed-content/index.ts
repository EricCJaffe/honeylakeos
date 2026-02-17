import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSecretValue } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmbedSource = {
  sourceTable: string;
  sourceId: string;
  sourceVersion?: string;
  content: string;
  metadata?: Record<string, unknown>;
  replaceExisting?: boolean;
};

type EmbedRequestBody = {
  companyId: string;
  sources: EmbedSource[];
  embeddingModel?: string;
  chunkSizeChars?: number;
  chunkOverlapChars?: number;
};

type CompanyAiSettings = {
  ai_enabled: boolean;
  daily_token_budget: number;
  monthly_token_budget: number;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function startOfUtcDay(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function startOfUtcMonth(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < clean.length) {
    const end = Math.min(cursor + chunkSize, clean.length);
    chunks.push(clean.slice(cursor, end));

    if (end >= clean.length) break;
    cursor = Math.max(0, end - overlap);
  }

  return chunks;
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
  const featureKey = "embedding_ingestion";
  let modelUsed = "text-embedding-3-small";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Supabase environment is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

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

    const body = (await req.json()) as EmbedRequestBody;
    companyId = body.companyId;

    if (!companyId || !Array.isArray(body.sources) || body.sources.length === 0) {
      return jsonResponse({ error: "companyId and non-empty sources are required" }, 400);
    }

    if (body.sources.length > 25) {
      return jsonResponse({ error: "sources length cannot exceed 25 per request" }, 400);
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
      .select("ai_enabled, daily_token_budget, monthly_token_budget")
      .eq("company_id", companyId)
      .maybeSingle();

    const typedSettings = aiSettings as CompanyAiSettings | null;

    if (!typedSettings?.ai_enabled) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: featureKey,
        model: modelUsed,
        status: "blocked",
        error_code: "feature_disabled",
        latency_ms: Date.now() - start,
        metadata: { reason: "AI feature is disabled for this company" },
      });

      return jsonResponse({ error: "AI is disabled for this company" }, 403);
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
      body.embeddingModel ||
      ((integration.config_json as Record<string, unknown> | null)?.embedding_model as string | undefined) ||
      "text-embedding-3-small";

    const chunkSize = clampInteger(body.chunkSizeChars ?? 1200, 300, 4000);
    const overlap = clampInteger(body.chunkOverlapChars ?? 200, 0, Math.min(chunkSize - 1, 1000));

    const expandedSources = body.sources.map((source) => ({
      ...source,
      sourceTable: source.sourceTable.trim(),
      sourceId: source.sourceId.trim(),
      content: source.content ?? "",
    }));

    const sourcePayloads = expandedSources.map((source) => ({
      ...source,
      chunks: chunkText(source.content, chunkSize, overlap),
    }));

    const allChunkCount = sourcePayloads.reduce((acc, source) => acc + source.chunks.length, 0);
    if (allChunkCount === 0) {
      return jsonResponse({ error: "No non-empty content to embed" }, 400);
    }

    const estimatedInputTokens = sourcePayloads.reduce(
      (acc, source) => acc + source.chunks.reduce((sum, chunk) => sum + estimateTokens(chunk), 0),
      0,
    );

    const [usedToday, usedMonth] = await Promise.all([
      getTokenUsageInWindow(serviceClient, companyId, startOfUtcDay(), nowIso),
      getTokenUsageInWindow(serviceClient, companyId, startOfUtcMonth(), nowIso),
    ]);

    if (usedToday + estimatedInputTokens > typedSettings.daily_token_budget) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: featureKey,
        model: modelUsed,
        prompt_tokens: estimatedInputTokens,
        total_tokens: estimatedInputTokens,
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

    if (usedMonth + estimatedInputTokens > typedSettings.monthly_token_budget) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: featureKey,
        model: modelUsed,
        prompt_tokens: estimatedInputTokens,
        total_tokens: estimatedInputTokens,
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

    let actualPromptTokens = 0;
    let embeddedChunkCount = 0;

    for (const source of sourcePayloads) {
      if (!source.sourceTable || !source.sourceId) {
        throw new Error("sourceTable and sourceId are required for each source");
      }

      const replaceExisting = source.replaceExisting !== false;

      if (replaceExisting) {
        const { error: deleteError } = await serviceClient
          .from("ai_document_chunks")
          .delete()
          .eq("company_id", companyId)
          .eq("source_table", source.sourceTable)
          .eq("source_id", source.sourceId);

        if (deleteError) {
          throw deleteError;
        }
      }

      if (source.chunks.length === 0) {
        continue;
      }

      const allEmbeddings: number[][] = [];

      for (let i = 0; i < source.chunks.length; i += 64) {
        const batch = source.chunks.slice(i, i + 64);

        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: modelUsed,
            input: batch,
          }),
        });

        const embeddingPayload = (await embeddingResponse.json()) as Record<string, unknown>;

        if (!embeddingResponse.ok) {
          throw new Error(`OpenAI embeddings error ${embeddingResponse.status}: ${JSON.stringify(embeddingPayload)}`);
        }

        const usage = embeddingPayload.usage as Record<string, unknown> | undefined;
        if (usage && typeof usage.prompt_tokens === "number") {
          actualPromptTokens += usage.prompt_tokens;
        }

        const data = Array.isArray(embeddingPayload.data) ? embeddingPayload.data : [];
        for (const entry of data) {
          const embedding = (entry as Record<string, unknown>).embedding;
          if (!Array.isArray(embedding)) {
            throw new Error("Invalid embedding payload: missing embedding array");
          }
          allEmbeddings.push(embedding as number[]);
        }
      }

      if (allEmbeddings.length !== source.chunks.length) {
        throw new Error("Embedding count mismatch for source content");
      }

      const upsertRows = source.chunks.map((chunk, index) => ({
        company_id: companyId,
        source_table: source.sourceTable,
        source_id: source.sourceId,
        source_version: source.sourceVersion ?? null,
        chunk_index: index,
        content: chunk,
        token_count: estimateTokens(chunk),
        metadata: source.metadata ?? {},
        embedding: toVectorLiteral(allEmbeddings[index]),
        embedding_model: modelUsed,
        embedded_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await serviceClient
        .from("ai_document_chunks")
        .upsert(upsertRows, { onConflict: "company_id,source_table,source_id,chunk_index" });

      if (upsertError) {
        throw upsertError;
      }

      embeddedChunkCount += upsertRows.length;
    }

    const totalTokens = actualPromptTokens > 0 ? actualPromptTokens : estimatedInputTokens;

    await serviceClient.from("ai_usage_logs").insert({
      request_id: requestId,
      company_id: companyId,
      user_id: userId,
      provider_key: "openai",
      feature_key: featureKey,
      model: modelUsed,
      prompt_tokens: totalTokens,
      total_tokens: totalTokens,
      latency_ms: Date.now() - start,
      status: "success",
      metadata: {
        source_count: body.sources.length,
        embedded_chunk_count: embeddedChunkCount,
        chunk_size_chars: chunkSize,
        chunk_overlap_chars: overlap,
      },
    });

    return jsonResponse({
      requestId,
      model: modelUsed,
      sourceCount: body.sources.length,
      embeddedChunkCount: embeddedChunkCount,
      usage: {
        promptTokens: totalTokens,
        totalTokens: totalTokens,
      },
    });
  } catch (error) {
    console.error("ai-embed-content error", error);

    if (companyId) {
      await serviceClient.from("ai_usage_logs").insert({
        request_id: requestId,
        company_id: companyId,
        user_id: userId,
        provider_key: "openai",
        feature_key: featureKey,
        model: modelUsed,
        latency_ms: Date.now() - start,
        status: "error",
        error_code: "embedding_ingestion_failed",
        metadata: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
