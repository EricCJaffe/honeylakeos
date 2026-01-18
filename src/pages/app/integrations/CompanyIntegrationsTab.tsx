import { IntegrationCard } from "@/components/integrations";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Plug } from "lucide-react";
import {
  useIntegrationProviders,
  useCompanyIntegrations,
  useToggleCompanyIntegration,
} from "@/hooks/useIntegrations";
import { useActiveCompany } from "@/hooks/useActiveCompany";

export function CompanyIntegrationsTab() {
  const { activeCompanyId } = useActiveCompany();
  const { data: providers, isLoading: loadingProviders } = useIntegrationProviders();
  const { data: integrations, isLoading: loadingIntegrations } = useCompanyIntegrations();
  const toggleIntegration = useToggleCompanyIntegration();

  const isLoading = loadingProviders || loadingIntegrations;

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  // Filter to company-scoped providers only
  const companyProviders = providers?.filter(
    (p) => p.scope_supported === "company" || p.scope_supported === "both"
  ) || [];

  if (companyProviders.length === 0) {
    return (
      <EmptyState
        icon={Plug}
        title="No integrations available"
        description="Company integrations will appear here when available."
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {companyProviders.map((provider) => {
        const state = getIntegrationState(provider.key);
        return (
          <IntegrationCard
            key={provider.id}
            provider={provider}
            isEnabled={state.isEnabled}
            isConfigured={state.isConfigured}
            secretConfiguredAt={state.secretConfiguredAt}
            scope="company"
            scopeId={activeCompanyId || ""}
            onToggle={(enabled) =>
              toggleIntegration.mutate({ providerKey: provider.key, isEnabled: enabled })
            }
            isTogglingEnabled={toggleIntegration.isPending}
          />
        );
      })}
    </div>
  );
}
