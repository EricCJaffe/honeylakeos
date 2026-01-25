import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FinanceTargets, 
  useFrameworkFinanceTargetsMutations 
} from "@/hooks/useFrameworkFinanceTargets";

interface FinanceTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  currentTargets: FinanceTargets | null;
}

export function FinanceTargetsDialog({
  open,
  onOpenChange,
  frameworkId,
  currentTargets,
}: FinanceTargetsDialogProps) {
  const { upsertTargets } = useFrameworkFinanceTargetsMutations();
  
  const [targets, setTargets] = useState<FinanceTargets>({
    revenue_target_mtd: null,
    revenue_target_ytd: null,
    net_income_target_mtd: null,
    cash_minimum: null,
    ar_max: null,
    ap_max: null,
    gross_margin_minimum: null,
  });

  useEffect(() => {
    if (currentTargets) {
      setTargets(currentTargets);
    }
  }, [currentTargets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertTargets.mutateAsync({ frameworkId, targets });
    onOpenChange(false);
  };

  const handleNumberChange = (key: keyof FinanceTargets, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setTargets((prev) => ({ ...prev, [key]: numValue }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Finance Targets</DialogTitle>
            <DialogDescription>
              Configure targets and thresholds for financial KPIs. Leave blank to disable tracking for a metric.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue_target_mtd">Revenue Target (MTD)</Label>
                <Input
                  id="revenue_target_mtd"
                  type="number"
                  placeholder="e.g., 100000"
                  value={targets.revenue_target_mtd ?? ""}
                  onChange={(e) => handleNumberChange("revenue_target_mtd", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue_target_ytd">Revenue Target (YTD)</Label>
                <Input
                  id="revenue_target_ytd"
                  type="number"
                  placeholder="e.g., 1200000"
                  value={targets.revenue_target_ytd ?? ""}
                  onChange={(e) => handleNumberChange("revenue_target_ytd", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="net_income_target_mtd">Net Income Target (MTD)</Label>
              <Input
                id="net_income_target_mtd"
                type="number"
                placeholder="e.g., 20000"
                value={targets.net_income_target_mtd ?? ""}
                onChange={(e) => handleNumberChange("net_income_target_mtd", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash_minimum">Cash Minimum (Alert if below)</Label>
              <Input
                id="cash_minimum"
                type="number"
                placeholder="e.g., 50000"
                value={targets.cash_minimum ?? ""}
                onChange={(e) => handleNumberChange("cash_minimum", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ar_max">AR Maximum (Alert if above)</Label>
                <Input
                  id="ar_max"
                  type="number"
                  placeholder="e.g., 75000"
                  value={targets.ar_max ?? ""}
                  onChange={(e) => handleNumberChange("ar_max", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap_max">AP Maximum (Alert if above)</Label>
                <Input
                  id="ap_max"
                  type="number"
                  placeholder="e.g., 50000"
                  value={targets.ap_max ?? ""}
                  onChange={(e) => handleNumberChange("ap_max", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gross_margin_minimum">Gross Margin Minimum (%)</Label>
              <Input
                id="gross_margin_minimum"
                type="number"
                placeholder="e.g., 40"
                value={targets.gross_margin_minimum ?? ""}
                onChange={(e) => handleNumberChange("gross_margin_minimum", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsertTargets.isPending}>
              {upsertTargets.isPending ? "Saving..." : "Save Targets"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
