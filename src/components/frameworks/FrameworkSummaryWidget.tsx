import { Compass, Layers, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCompanyActiveFramework, useFramework } from "@/hooks/useFrameworks";

export function FrameworkSummaryWidget() {
  const { data: companyFramework, isLoading: cfLoading } = useCompanyActiveFramework();
  const { data: frameworkData, isLoading: fwLoading } = useFramework(
    companyFramework?.active_framework_id ?? null
  );

  const isLoading = cfLoading || fwLoading;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="pt-5 pb-4">
          <div className="h-28 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // If no framework adopted, show a prompt to adopt one
  if (!companyFramework || !frameworkData) {
    return (
      <Card className="border-border">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Framework</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            No framework adopted yet. Adopt one to see concept and cadence stats.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/framework/marketplace" className="text-xs">
              Browse Frameworks
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { framework, concepts, cadences } = frameworkData;
  const enabledConcepts = concepts.filter((c) => c.enabled);
  const enabledCadences = cadences.filter((c) => c.enabled);

  // Group cadences by frequency
  const cadencesByFrequency: Record<string, number> = {};
  for (const cadence of enabledCadences) {
    const freq = cadence.frequency_type;
    cadencesByFrequency[freq] = (cadencesByFrequency[freq] || 0) + 1;
  }

  const frequencyLabels: Record<string, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annual",
    custom: "Custom",
  };

  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">{framework.name}</h3>
            {framework.version_label && (
              <Badge variant="outline" className="text-xs">{framework.version_label}</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/framework" className="text-xs text-muted-foreground hover:text-foreground">
              Manage
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Concepts count */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{enabledConcepts.length}</p>
              <p className="text-xs text-muted-foreground">
                {enabledConcepts.length === 1 ? "Concept" : "Concepts"}
              </p>
            </div>
          </div>

          {/* Cadences count */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <CalendarClock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{enabledCadences.length}</p>
              <p className="text-xs text-muted-foreground">
                {enabledCadences.length === 1 ? "Cadence" : "Cadences"}
              </p>
            </div>
          </div>
        </div>

        {/* Concept names */}
        {enabledConcepts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Active Concepts</p>
            <div className="flex flex-wrap gap-1.5">
              {enabledConcepts.slice(0, 8).map((c) => (
                <Badge key={c.id} variant="secondary" className="text-xs font-normal">
                  {c.display_name_singular}
                </Badge>
              ))}
              {enabledConcepts.length > 8 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{enabledConcepts.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Cadence frequency breakdown */}
        {enabledCadences.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Cadence Schedule</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(cadencesByFrequency).map(([freq, count]) => (
                <Badge key={freq} variant="outline" className="text-xs font-normal">
                  {count} {frequencyLabels[freq] || freq}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
