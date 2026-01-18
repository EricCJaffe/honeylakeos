import * as React from "react";
import { BookOpen, BarChart3, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceModeSelector } from "./FinanceModeSelector";
import { FinanceModeSwitchDialog } from "./FinanceModeSwitchDialog";
import { useFinanceMode, FinanceMode, DataRetentionAction } from "@/hooks/useFinanceMode";

export function FinanceModeSettingsCard() {
  const { financeMode, updateFinanceMode, isUpdating } = useFinanceMode();
  const [pendingMode, setPendingMode] = React.useState<FinanceMode | null>(null);

  const handleModeChange = (newMode: FinanceMode) => {
    if (newMode === financeMode) return;
    
    // If no current mode (first time), just set it directly
    if (!financeMode) {
      updateFinanceMode({ newMode, dataAction: "keep" });
    } else {
      // Show confirmation dialog for mode switch
      setPendingMode(newMode);
    }
  };

  const handleConfirmSwitch = (dataAction: DataRetentionAction) => {
    if (!pendingMode) return;
    updateFinanceMode({ newMode: pendingMode, dataAction });
    setPendingMode(null);
  };

  const currentModeLabel = financeMode === "builtin_books" 
    ? "Built-in Books (Accounting)" 
    : financeMode === "external_reporting" 
      ? "External Books (Financial Insights)" 
      : "Not configured";

  const CurrentIcon = financeMode === "builtin_books" ? BookOpen : BarChart3;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Finance Mode
          </CardTitle>
          <CardDescription>
            Choose how you manage your financial data. You can switch modes later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {financeMode && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <CurrentIcon className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Current Mode</p>
                <p className="text-xs text-muted-foreground">{currentModeLabel}</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          )}

          <FinanceModeSelector
            value={financeMode}
            onChange={handleModeChange}
            disabled={isUpdating}
          />
        </CardContent>
      </Card>

      {pendingMode && (
        <FinanceModeSwitchDialog
          open={!!pendingMode}
          onOpenChange={(open) => !open && setPendingMode(null)}
          currentMode={financeMode}
          newMode={pendingMode}
          onConfirm={handleConfirmSwitch}
          isLoading={isUpdating}
        />
      )}
    </>
  );
}
