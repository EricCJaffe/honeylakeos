import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptSecretValue } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecretRequest {
  action: "set" | "check" | "delete";
  scope: "company" | "site";
  scopeId: string;
  providerKey: string;
  secrets?: Record<string, string>; // key -> value (only for set)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for permission checks
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for secret operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: SecretRequest = await req.json();
    const { action, scope, scopeId, providerKey, secrets } = body;

    if (!action || !scope || !scopeId || !providerKey) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permission check
    let hasPermission = false;

    if (scope === "company") {
      // Check if user is company admin
      const { data: membership } = await userClient
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", scopeId)
        .eq("status", "active")
        .single();

      if (membership?.role === "company_admin") {
        hasPermission = true;
      }

      // Or site admin
      if (!hasPermission) {
        const { data: siteMembership } = await userClient
          .from("site_memberships")
          .select("role")
          .eq("user_id", user.id);

        if (siteMembership?.some((sm: any) => sm.role === "site_admin" || sm.role === "super_admin")) {
          hasPermission = true;
        }
      }
    } else if (scope === "site") {
      // Only site admin can manage site secrets
      const { data: siteMembership } = await userClient
        .from("site_memberships")
        .select("role")
        .eq("user_id", user.id);

      if (siteMembership?.some((sm: any) => sm.role === "site_admin" || sm.role === "super_admin")) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle actions
    if (action === "set" && secrets) {
      // Upsert each secret
      for (const [secretKey, secretValue] of Object.entries(secrets)) {
        const encryptedValue = await encryptSecretValue(secretValue);

        const { error } = await serviceClient
          .from("integration_secrets")
          .upsert(
            {
              scope,
              scope_id: scopeId,
              provider_key: providerKey,
              secret_key: secretKey,
              encrypted_value: encryptedValue,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "scope,scope_id,provider_key,secret_key" }
          );

        if (error) {
          console.error("Error storing secret:", error);
          return new Response(JSON.stringify({ error: "Failed to store secret" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update the integration record with secret_ref and timestamp
      const integrationTable = scope === "company" ? "company_integrations" : "site_integrations";
      const scopeColumn = scope === "company" ? "company_id" : "site_id";

      await serviceClient
        .from(integrationTable)
        .upsert(
          {
            [scopeColumn]: scopeId,
            provider_key: providerKey,
            secret_ref: `${scope}:${scopeId}:${providerKey}`,
            secret_configured_at: new Date().toISOString(),
          },
          { onConflict: `${scopeColumn},provider_key` }
        );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      // Check if secrets exist (don't return values)
      const { data, error } = await serviceClient
        .from("integration_secrets")
        .select("secret_key, updated_at")
        .eq("scope", scope)
        .eq("scope_id", scopeId)
        .eq("provider_key", providerKey);

      if (error) {
        console.error("Error checking secrets:", error);
        return new Response(JSON.stringify({ error: "Failed to check secrets" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const configured = data && data.length > 0;
      const lastUpdated = data?.length ? data.reduce((latest, s) => 
        new Date(s.updated_at) > new Date(latest) ? s.updated_at : latest,
        data[0].updated_at
      ) : null;

      return new Response(JSON.stringify({ 
        configured, 
        secretKeys: data?.map(s => s.secret_key) || [],
        lastUpdated 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Delete all secrets for this integration
      const { error } = await serviceClient
        .from("integration_secrets")
        .delete()
        .eq("scope", scope)
        .eq("scope_id", scopeId)
        .eq("provider_key", providerKey);

      if (error) {
        console.error("Error deleting secrets:", error);
        return new Response(JSON.stringify({ error: "Failed to delete secrets" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clear secret_ref on integration record
      const integrationTable = scope === "company" ? "company_integrations" : "site_integrations";
      const scopeColumn = scope === "company" ? "company_id" : "site_id";

      await serviceClient
        .from(integrationTable)
        .update({ secret_ref: null, secret_configured_at: null })
        .eq(scopeColumn, scopeId)
        .eq("provider_key", providerKey);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
