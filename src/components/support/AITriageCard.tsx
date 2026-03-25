import { useState } from "react";
import { Brain, Loader2, RefreshCw, ChevronDown, ChevronUp, FileCode, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TriageResult } from "@/hooks/useTicketAI";

interface AITriageCardProps {
  triageStatus: string;
  triageResult: TriageResult | null;
  onTriggerTriage: () => void;
  isTriaging: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const COMPLEXITY_COLORS: Record<string, string> = {
  trivial: "bg-green-100 text-green-800",
  small: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  large: "bg-red-100 text-red-800",
};

export function AITriageCard({ triageStatus, triageResult, onTriggerTriage, isTriaging }: AITriageCardProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const isAnalyzing = triageStatus === "analyzing" || isTriaging;
  const isComplete = triageStatus === "complete" && triageResult;
  const isFailed = triageStatus === "failed";

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Triage
          </CardTitle>
          {isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTriggerTriage}
              disabled={isAnalyzing}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Re-run
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending state */}
        {triageStatus === "pending" && !isTriaging && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Run AI analysis to classify this ticket, identify affected code areas, and get a suggested fix.
            </p>
            <Button onClick={onTriggerTriage}>
              <Brain className="h-4 w-4 mr-2" />
              Run AI Triage
            </Button>
          </div>
        )}

        {/* Analyzing state */}
        {isAnalyzing && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm font-medium">Analyzing ticket...</p>
            <p className="text-xs text-muted-foreground mt-1">This usually takes 5-15 seconds</p>
          </div>
        )}

        {/* Failed state */}
        {isFailed && !isTriaging && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>AI triage failed. Please try again.</span>
              <Button variant="outline" size="sm" onClick={onTriggerTriage}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Complete state */}
        {isComplete && triageResult && (
          <div className="space-y-4">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <Badge className={SEVERITY_COLORS[triageResult.severity] || ""}>
                {triageResult.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {triageResult.classification.replace(/_/g, " ")}
              </Badge>
              <Badge className={COMPLEXITY_COLORS[triageResult.estimated_complexity] || ""}>
                {triageResult.estimated_complexity}
              </Badge>
              <Badge variant="secondary">
                {Math.round(triageResult.confidence * 100)}% confidence
              </Badge>
            </div>

            {/* Root Cause */}
            <div>
              <h4 className="text-sm font-medium mb-1">Root Cause</h4>
              <p className="text-sm text-muted-foreground">{triageResult.root_cause_hypothesis}</p>
            </div>

            {/* Suggested Fix */}
            <div>
              <h4 className="text-sm font-medium mb-1">Suggested Fix</h4>
              <p className="text-sm text-muted-foreground">{triageResult.suggested_fix}</p>
            </div>

            {/* Investigation Steps */}
            {triageResult.investigation_steps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Investigation Steps</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {triageResult.investigation_steps.map((step, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Affected Areas */}
            {triageResult.affected_areas.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <FileCode className="h-4 w-4" />
                  Affected Areas
                </h4>
                <div className="space-y-1">
                  {triageResult.affected_areas.map((area, i) => (
                    <code key={i} className="block text-xs bg-muted px-2 py-1 rounded font-mono">
                      {area}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation Prompt (collapsible) */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPrompt(!showPrompt)}
                className="w-full justify-between"
              >
                <span className="text-sm font-medium">Remediation Prompt</span>
                {showPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {showPrompt && (
                <pre className="mt-2 p-3 bg-muted rounded text-xs whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                  {triageResult.remediation_prompt}
                </pre>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
