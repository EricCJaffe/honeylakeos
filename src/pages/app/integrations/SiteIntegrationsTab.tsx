import { useState, useEffect } from "react";
import { IntegrationCard } from "@/components/integrations";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Info } from "lucide-react";
import {
  useIntegrationProviders,
  useSiteIntegrations,
  useToggleSiteIntegration,
} from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";

export function SiteIntegrationsTab() {
  const [siteId, setSiteId] = useState<string | null>(null);
  const { data: providers, isLoading: loadingProviders } = useIntegrationProviders();
  const { data: integrations, isLoading: loadingIntegrations } = useSiteIntegrations(siteId || undefined);
  const toggleIntegration = useToggleSiteIntegration();

  // Fetch site ID
  useEffect(() => {
    async function fetchSiteId() {
      const { data } = await supabase
        .from("companies")
        .select("site_id")
        .limit(1);
      if (data?.length) {
        setSiteId(data[0].site_id);
      }
    }
    fetchSiteId();
  }, []);

  const isLoading = loadingProviders || loadingIntegrations || !siteId;

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  // Filter to site-scoped providers only
  const siteProviders = providers?.filter(
    (p) => p.scope_supported === "site" || p.scope_supported === "both"
  ) || [];

  if (siteProviders.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No site integrations available"
        description="Site-wide integrations will appear here when available."
      />
    );
  }

  const getIntegrationState = (providerKey: string) => {
    const integration = integrations?.find((i) => i.provider_key === providerKey);
    return {
      isEnabled: integration?.is_enabled || false,
      isConfigured: !!integration?.secret_ref,
      secretConfiguredAt: integration?.secret_configured_at || null,
    };
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Site integrations are configured globally and auto-enabled for all companies when activated.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {siteProviders.map((provider) => {
          const state = getIntegrationState(provider.key);
          return (
            <IntegrationCard
              key={provider.id}
              provider={provider}
              isEnabled={state.isEnabled}
              isConfigured={state.isConfigured}
              secretConfiguredAt={state.secretConfiguredAt}
              scope="site"
              scopeId={siteId}
              onToggle={(enabled) =>
                toggleIntegration.mutate({ siteId, providerKey: provider.key, isEnabled: enabled })
              }
              isTogglingEnabled={toggleIntegration.isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
