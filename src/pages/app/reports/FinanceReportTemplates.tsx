import * as React from "react";
import {
  FileText,
  CreditCard,
  Receipt,
  Clock,
  Play,
  Save,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportType } from "@/hooks/useReports";

export interface FinanceReportTemplate {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "invoices" | "payments" | "receipts" | "aging";
}

export const FINANCE_REPORT_TEMPLATES: FinanceReportTemplate[] = [
  {
    id: "invoices-by-status",
    type: "invoices_by_status",
    name: "Invoices by Status",
    description: "View invoice counts and totals grouped by status (draft, sent, paid, overdue)",
    icon: FileText,
    category: "invoices",
  },
  {
    id: "payments-summary",
    type: "payments_summary",
    name: "Payments Summary",
    description: "Track payments by method and monthly trends over time",
    icon: CreditCard,
    category: "payments",
  },
  {
    id: "receipts-by-tag",
    type: "receipts_by_tag",
    name: "Receipts by Tag",
    description: "Analyze expense receipts grouped by category or accounting tag",
    icon: Receipt,
    category: "receipts",
  },
  {
    id: "ar-aging",
    type: "ar_aging",
    name: "AR Aging",
    description: "View accounts receivable aging buckets (Current, 31-60, 61-90, 90+)",
    icon: Clock,
    category: "aging",
  },
];

interface FinanceReportTemplateCardProps {
  template: FinanceReportTemplate;
  onRun: () => void;
  onSave: () => void;
}

export function FinanceReportTemplateCard({ 
  template, 
  onRun, 
  onSave 
}: FinanceReportTemplateCardProps) {
  const Icon = template.icon;
  
  const categoryLabels: Record<string, string> = {
    invoices: "Invoices",
    payments: "Payments",
    receipts: "Receipts",
    aging: "AR Aging",
  };
  
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge 
                variant="secondary" 
                className="mt-1 text-xs capitalize"
              >
                {categoryLabels[template.category]}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {template.description}
        </CardDescription>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onRun} className="gap-1">
            <Play className="h-3 w-3" />
            Run Now
          </Button>
          <Button size="sm" variant="outline" onClick={onSave} className="gap-1">
            <Save className="h-3 w-3" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
