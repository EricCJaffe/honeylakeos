import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Heart,
  Users,
  DollarSign,
  Play,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportType } from "@/hooks/useReports";

export interface RelationshipsReportTemplate {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "crm" | "donors";
  requiresPipeline?: boolean;
}

export const RELATIONSHIPS_REPORT_TEMPLATES: RelationshipsReportTemplate[] = [
  {
    id: "pipeline-by-stage",
    type: "crm_pipeline_totals",
    name: "Pipeline by Stage",
    description: "View opportunity counts and values grouped by pipeline stage",
    icon: Target,
    category: "crm",
    requiresPipeline: true,
  },
  {
    id: "won-lost-trend",
    type: "crm_opportunities_won_lost",
    name: "Won/Lost Trend",
    description: "Track won and lost opportunities over time with totals and amounts",
    icon: TrendingUp,
    category: "crm",
    requiresPipeline: true,
  },
  {
    id: "donations-by-campaign",
    type: "donors_by_campaign",
    name: "Donations by Campaign",
    description: "Analyze donation counts, totals, and averages by campaign",
    icon: Heart,
    category: "donors",
  },
  {
    id: "donor-retention",
    type: "donor_retention",
    name: "Donor Retention",
    description: "Measure donor retention rates between periods (quarterly/yearly)",
    icon: Users,
    category: "donors",
  },
];

interface RelationshipsReportTemplateCardProps {
  template: RelationshipsReportTemplate;
  onRun: () => void;
  onSave: () => void;
}

export function RelationshipsReportTemplateCard({ 
  template, 
  onRun, 
  onSave 
}: RelationshipsReportTemplateCardProps) {
  const Icon = template.icon;
  
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
                {template.category === "crm" ? "CRM" : "Donors"}
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
