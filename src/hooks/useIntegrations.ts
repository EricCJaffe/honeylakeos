import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export interface IntegrationProvider {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope_supported: "company" | "site" | "both";
  is_enabled_platform_wide: boolean;
  created_at: string;
}

export interface CompanyIntegration {
  id: string;
  company_id: string;
  provider_key: string;
  is_enabled: boolean;
  config_json: Record<string, unknown>;
  secret_ref: string | null;
  secret_configured_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteIntegration {
  id: string;
  site_id: string;
  provider_key: string;
  is_enabled: boolean;
  config_json: Record<string, unknown>;
  secret_ref: string | null;
  secret_configured_at: string | null;
  created_at: string;
  updated_at: string;
}

// Provider capability descriptions (static for now)
export const providerCapabilities: Record<string, string> = {
  zapier: "Triggers + Actions (coming soon)",
  plaid: "Bank connections + transactions (coming soon)",
  planning_center: "People + Giving sync (coming soon)",
};

// Provider secret field definitions
export const providerSecretFields: Record<string, { key: string; label: string; type: "text" | "password" }[]> = {
  zapier: [
    { key: "api_key", label: "API Key", type: "password" },
  ],
  plaid: [
    { key: "client_id", label: "Client ID", type: "text" },
    { key: "secret", label: "Secret", type: "password" },
  ],
  planning_center: [
    { key: "app_id", label: "Application ID", type: "text" },
    { key: "secret", label: "Secret", type: "password" },
  ],
};

export function useIntegrationProviders() {
  return useQuery({
    queryKey: ["integration-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_providers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as IntegrationProvider[];
    },
  });
}

export function useCompanyIntegrations(companyId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const effectiveCompanyId = companyId || activeCompanyId;

  return useQuery({
    queryKey: ["company-integrations", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase
        .from("company_integrations")
        .select("*")
        .eq("company_id", effectiveCompanyId);

      if (error) throw error;
      return data as CompanyIntegration[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useSiteIntegrations(siteId?: string) {
  return useQuery({
    queryKey: ["site-integrations", siteId],
    queryFn: async () => {
      if (!siteId) {
        // Get site from first company
        const { data: companies } = await supabase
          .from("companies")
          .select("site_id")
          .limit(1);
        
        if (!companies?.length) return [];
        siteId = companies[0].site_id;
      }

      const { data, error } = await supabase
        .from("site_integrations")
        .select("*")
        .eq("site_id", siteId);

      if (error) throw error;
      return data as SiteIntegration[];
    },
  });
}

export function useToggleCompanyIntegration() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ providerKey, isEnabled }: { providerKey: string; isEnabled: boolean }) => {
      if (!activeCompanyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("company_integrations")
        .upsert(
          {
            company_id: activeCompanyId,
            provider_key: providerKey,
            is_enabled: isEnabled,
          },
          { onConflict: "company_id,provider_key" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { providerKey, isEnabled }) => {
      queryClient.invalidateQueries({ queryKey: ["company-integrations", activeCompanyId] });
      log(
        isEnabled ? "module.enabled" : "module.disabled",
        "company_module",
        data.id,
        { provider_key: providerKey, scope: "company" }
      );
      toast.success(`Integration ${isEnabled ? "enabled" : "disabled"}`);
    },
    onError: (error) => {
      toast.error("Failed to update integration");
      console.error("Toggle integration error:", error);
    },
  });
}

export function useToggleSiteIntegration() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ siteId, providerKey, isEnabled }: { siteId: string; providerKey: string; isEnabled: boolean }) => {
      const { data, error } = await supabase
        .from("site_integrations")
        .upsert(
          {
            site_id: siteId,
            provider_key: providerKey,
            is_enabled: isEnabled,
          },
          { onConflict: "site_id,provider_key" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { providerKey, isEnabled }) => {
      queryClient.invalidateQueries({ queryKey: ["site-integrations"] });
      log(
        isEnabled ? "module.enabled" : "module.disabled",
        "company_module",
        data.id,
        { provider_key: providerKey, scope: "site" }
      );
      toast.success(`Site integration ${isEnabled ? "enabled" : "disabled"}`);
    },
    onError: (error) => {
      toast.error("Failed to update site integration");
      console.error("Toggle site integration error:", error);
    },
  });
}

export function useSaveIntegrationSecrets() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      scope,
      scopeId,
      providerKey,
      secrets,
    }: {
      scope: "company" | "site";
      scopeId: string;
      providerKey: string;
      secrets: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke("manage-integration-secret", {
        body: { action: "set", scope, scopeId, providerKey, secrets },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, { scope, scopeId, providerKey }) => {
      if (scope === "company") {
        queryClient.invalidateQueries({ queryKey: ["company-integrations", scopeId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["site-integrations"] });
      }
      log(
        "module.enabled", // Using existing action type for integration configured
        "company_module",
        undefined,
        { provider_key: providerKey, scope, action: "secrets_configured" }
      );
      toast.success("Integration configured successfully");
    },
    onError: (error) => {
      toast.error("Failed to save integration secrets");
      console.error("Save secrets error:", error);
    },
  });
}

export function useCheckIntegrationSecrets() {
  return useMutation({
    mutationFn: async ({
      scope,
      scopeId,
      providerKey,
    }: {
      scope: "company" | "site";
      scopeId: string;
      providerKey: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("manage-integration-secret", {
        body: { action: "check", scope, scopeId, providerKey },
      });

      if (error) throw error;
      return data as { configured: boolean; secretKeys: string[]; lastUpdated: string | null };
    },
  });
}

export function useDeleteIntegrationSecrets() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      scope,
      scopeId,
      providerKey,
    }: {
      scope: "company" | "site";
      scopeId: string;
      providerKey: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("manage-integration-secret", {
        body: { action: "delete", scope, scopeId, providerKey },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, { scope, scopeId, providerKey }) => {
      if (scope === "company") {
        queryClient.invalidateQueries({ queryKey: ["company-integrations", scopeId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["site-integrations"] });
      }
      log(
        "module.disabled",
        "company_module",
        undefined,
        { provider_key: providerKey, scope, action: "secrets_deleted" }
      );
      toast.success("Integration secrets removed");
    },
    onError: (error) => {
      toast.error("Failed to remove integration secrets");
      console.error("Delete secrets error:", error);
    },
  });
}
