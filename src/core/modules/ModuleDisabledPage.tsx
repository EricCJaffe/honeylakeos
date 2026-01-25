/**
 * Module Disabled Page
 * 
 * Shown when a user tries to access a module that has been disabled
 * via feature flags. Provides a friendly message and navigation back.
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ArrowLeft, Settings } from "lucide-react";
import { useMembership } from "@/lib/membership";
import { ModuleDefinition } from "./moduleRegistry";

interface ModuleDisabledPageProps {
  module?: ModuleDefinition;
  moduleName?: string;
}

export function ModuleDisabledPage({ module, moduleName }: ModuleDisabledPageProps) {
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();

  const displayName = module?.name || moduleName || "This module";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Module Disabled</CardTitle>
          <CardDescription className="mt-2">
            {displayName} is currently disabled for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Your administrator has disabled this module. Your data is safe and will 
            be available when the module is re-enabled.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={() => navigate("/app")}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>

            {isCompanyAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate("/app/admin/company-console")}
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Modules
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Need this module? Contact your company administrator to enable it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
