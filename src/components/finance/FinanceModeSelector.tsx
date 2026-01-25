import * as React from "react";
import { BookOpen, BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FinanceMode } from "@/hooks/useFinanceMode";

interface FinanceModeSelectorProps {
  value: FinanceMode | null;
  onChange: (mode: FinanceMode) => void;
  disabled?: boolean;
}

const modeOptions = [
  {
    value: "builtin_books" as FinanceMode,
    title: "Built-in Books",
    navLabel: "Accounting",
    icon: BookOpen,
    description: "Full double-entry accounting with GL, AR/AP, bank reconciliation, and journal entries.",
    features: [
      "Chart of Accounts",
      "Journal Entries",
      "Invoices & Bills",
      "Bank Reconciliation",
      "Plaid Integration",
    ],
  },
  {
    value: "external_reporting" as FinanceMode,
    title: "External Books",
    navLabel: "Financial Insights",
    icon: BarChart3,
    description: "Import financial statements from your existing accounting software for dashboards and insights.",
    features: [
      "Import P&L Statements",
      "Import Balance Sheets",
      "AR/AP Summaries",
      "Dashboard Metrics",
      "AI-Assisted Insights",
    ],
  },
];

export function FinanceModeSelector({ value, onChange, disabled }: FinanceModeSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {modeOptions.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;

        return (
          <Card
            key={option.value}
            className={cn(
              "relative cursor-pointer transition-all hover:border-primary/50",
              isSelected && "border-primary ring-2 ring-primary/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onChange(option.value)}
          >
            {isSelected && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div>
                  <CardTitle className="text-base">{option.title}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Nav: {option.navLabel}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm">{option.description}</CardDescription>
              <ul className="space-y-1">
                {option.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
