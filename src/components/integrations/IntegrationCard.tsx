import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Zap, Building, Globe, TestTube2 } from "lucide-react";
import { IntegrationProvider, providerCapabilities } from "@/hooks/useIntegrations";
import { IntegrationConfigDialog } from "./IntegrationConfigDialog";
import { formatDistanceToNow } from "date-fns";

interface IntegrationCardProps {
  provider: IntegrationProvider;
  isEnabled: boolean;
  isConfigured: boolean;
  secretConfiguredAt: string | null;
  scope: "company" | "site";
  scopeId: string;
  onToggle: (enabled: boolean) => void;
  isTogglingEnabled?: boolean;
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  zapier: Zap,
  plaid: Building,
  planning_center: Globe,
};

export function IntegrationCard({
  provider,
  isEnabled,
  isConfigured,
  secretConfiguredAt,
  scope,
  scopeId,
  onToggle,
  isTogglingEnabled,
}: IntegrationCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const Icon = providerIcons[provider.key] || Settings;
  const capabilities = providerCapabilities[provider.key] || "Coming soon";

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{provider.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {provider.scope_supported === "company" ? "Company-managed" : "Site-managed"}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isTogglingEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{provider.description}</p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant={isConfigured ? "outline" : "destructive"}>
              {isConfigured ? "Configured" : "Not configured"}
            </Badge>
          </div>

          {isConfigured && secretConfiguredAt && (
            <p className="text-xs text-muted-foreground">
              Last configured {formatDistanceToNow(new Date(secretConfiguredAt), { addSuffix: true })}
            </p>
          )}

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Capabilities</p>
            <p className="text-sm mt-1">{capabilities}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1"
            >
              <TestTube2 className="h-4 w-4 mr-2" />
              Test
              <Badge variant="secondary" className="ml-2 text-[10px]">Soon</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      <IntegrationConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        provider={provider}
        scope={scope}
        scopeId={scopeId}
        isConfigured={isConfigured}
      />
    </>
  );
}
