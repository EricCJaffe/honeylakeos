/**
 * Feature Flags Admin Panel
 * 
 * Allows company admins to toggle modules on/off.
 * Part of the Company Admin area.
 */

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useCompanyModuleFlags,
  MODULE_REGISTRY,
  getCoreModules,
  getToggleableModules,
  ModuleId,
  ModuleDefinition
} from "@/core/modules";
import { useMembership } from "@/lib/membership";
import { AlertTriangle, Check, Lock, Info } from "lucide-react";

export function FeatureFlagsPanel() {
  const { activeCompanyId, isCompanyAdmin } = useMembership();
  const { 
    flags, 
    isLoading, 
    isSafeMode, 
    isModuleEnabled, 
    toggleModule 
  } = useCompanyModuleFlags();

  const [pendingToggles, setPendingToggles] = React.useState<Set<string>>(new Set());

  const coreModules = getCoreModules();
  const toggleableModules = getToggleableModules();

  const handleToggle = async (moduleId: ModuleId, enabled: boolean) => {
    setPendingToggles((prev) => new Set(prev).add(moduleId));
    try {
      await toggleModule(moduleId, enabled);
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    }
  };

  if (!activeCompanyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No company selected.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
          <CardDescription>Loading module settings...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isSafeMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load module settings. Running in safe mode with core modules only.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Modules</CardTitle>
        <CardDescription>
          Enable or disable modules for your organization. Core modules cannot be disabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Disabling a module hides it from navigation and blocks access to its routes. 
            Your data is preserved and will be available when the module is re-enabled.
          </AlertDescription>
        </Alert>

        {/* Core Modules Section */}
        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Core Modules</h3>
          <div className="space-y-2">
            {coreModules.map((module) => (
              <ModuleRow
                key={module.id}
                module={module}
                isEnabled={true}
                isCore={true}
                isPending={false}
                canToggle={false}
                onToggle={() => {}}
              />
            ))}
          </div>
        </div>

        {/* Toggleable Modules Section */}
        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Optional Modules</h3>
          <div className="space-y-2">
            {toggleableModules.map((module) => (
              <ModuleRow
                key={module.id}
                module={module}
                isEnabled={isModuleEnabled(module.id)}
                isCore={false}
                isPending={pendingToggles.has(module.id)}
                canToggle={isCompanyAdmin}
                onToggle={(enabled) => handleToggle(module.id, enabled)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModuleRowProps {
  module: ModuleDefinition;
  isEnabled: boolean;
  isCore: boolean;
  isPending: boolean;
  canToggle: boolean;
  onToggle: (enabled: boolean) => void;
}

function ModuleRow({ 
  module, 
  isEnabled, 
  isCore, 
  isPending, 
  canToggle, 
  onToggle 
}: ModuleRowProps) {
  const Icon = module.icon;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{module.name}</span>
            {isCore && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Core
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{module.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isEnabled && !isCore && (
          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3 mr-1" />
            Enabled
          </Badge>
        )}
        
        {isCore ? (
          <div className="w-10 flex justify-center">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={!canToggle || isPending}
            aria-label={`Toggle ${module.name}`}
          />
        )}
      </div>
    </div>
  );
}
