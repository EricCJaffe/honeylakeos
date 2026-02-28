import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, RefreshCw, Lightbulb } from "lucide-react";
import {
  ActivationScore,
  ActivationScoreBreakdown,
  ScoreSection,
  getScoreBand,
  getScoreColor,
  getScoreBgColor,
  getScoreBorderColor,
  SECTION_LABELS,
} from "@/hooks/usePilotValidation";
import { cn } from "@/lib/utils";

interface ActivationScoreCardProps {
  score: ActivationScore | null;
  isLoading?: boolean;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
  showCoachSuggestions?: boolean;
  compact?: boolean;
}

export function ActivationScoreCard({
  score,
  isLoading,
  onRecalculate,
  isRecalculating,
  showCoachSuggestions = false,
  compact = false,
}: ActivationScoreCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(!compact);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-4">
            <p>No activation score calculated yet.</p>
            {onRecalculate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                disabled={isRecalculating}
                className="mt-3"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRecalculating && "animate-spin")} />
                Calculate Score
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const breakdown = score.breakdown_json;
  const band = getScoreBand(score.score);
  const lowestSection = getLowestScoringSection(breakdown);

  return (
    <Card className={cn("overflow-hidden", getScoreBorderColor(score.score), "border-l-4")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Activation Score</CardTitle>
            <CardDescription>
              Last calculated: {new Date(score.calculated_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "text-4xl font-bold tabular-nums",
                getScoreColor(score.score)
              )}
            >
              {score.score}
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "uppercase text-xs",
                band === "green" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                band === "yellow" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                band === "red" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {band === "green" ? "Healthy" : band === "yellow" ? "Moderate" : "At Risk"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full border-t rounded-none justify-between">
            <span className="text-sm text-muted-foreground">
              {isExpanded ? "Hide Details" : "Show Details"}
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-4 space-y-4">
            {/* Section Breakdowns */}
            {(Object.keys(breakdown) as Array<keyof ActivationScoreBreakdown>).map((sectionKey) => (
              <ScoreSectionDisplay
                key={sectionKey}
                sectionKey={sectionKey}
                section={breakdown[sectionKey]}
                isLowest={sectionKey === lowestSection}
              />
            ))}

            {/* Improvement suggestions */}
            {showCoachSuggestions && lowestSection && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Improvement Focus</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {SECTION_LABELS[lowestSection].suggestion}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recalculate Button */}
            {onRecalculate && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRecalculate}
                  disabled={isRecalculating}
                  className="w-full"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isRecalculating && "animate-spin")} />
                  Recalculate Score
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ScoreSectionDisplayProps {
  sectionKey: keyof ActivationScoreBreakdown;
  section: ScoreSection;
  isLowest: boolean;
}

function ScoreSectionDisplay({ sectionKey, section, isLowest }: ScoreSectionDisplayProps) {
  const percentage = (section.score / section.max) * 100;
  const sectionInfo = SECTION_LABELS[sectionKey];

  return (
    <div className={cn("p-3 rounded-lg", isLowest ? "bg-amber-50 dark:bg-amber-900/20" : "bg-muted/50")}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{sectionInfo.label}</span>
        <span className="text-sm text-muted-foreground">
          {section.score} / {section.max}
        </span>
      </div>
      <Progress value={percentage} className="h-2 mb-3" />
      <div className="grid gap-1.5">
        {Object.entries(section.criteria).map(([key, criterion]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            {criterion.met ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={cn(!criterion.met && "text-muted-foreground")}>
              {criterion.label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {criterion.met ? `+${criterion.points}` : `0/${criterion.points}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLowestScoringSection(breakdown: ActivationScoreBreakdown): keyof ActivationScoreBreakdown | null {
  let lowest: keyof ActivationScoreBreakdown | null = null;
  let lowestPercentage = 100;

  for (const key of Object.keys(breakdown) as Array<keyof ActivationScoreBreakdown>) {
    const section = breakdown[key];
    const percentage = (section.score / section.max) * 100;
    if (percentage < lowestPercentage) {
      lowestPercentage = percentage;
      lowest = key;
    }
  }

  return lowest;
}
