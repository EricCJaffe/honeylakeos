import { GitPullRequest, Loader2, ExternalLink, GitBranch, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RemediationResult } from "@/hooks/useTicketAI";

interface RemediationCardProps {
  remediationStatus: string;
  remediationResult: RemediationResult | null;
  prUrl: string | null;
  branch: string | null;
  onApprove: () => void;
  isGenerating: boolean;
}

export function RemediationCard({
  remediationStatus,
  remediationResult,
  prUrl,
  branch,
  onApprove,
  isGenerating,
}: RemediationCardProps) {
  const isNone = remediationStatus === "none" && !isGenerating;
  const isWorking = remediationStatus === "generating" || isGenerating;
  const isPrCreated = remediationStatus === "pr_created" && prUrl;
  const isFailed = remediationStatus === "failed";

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-primary" />
          AI Remediation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ready to approve */}
        {isNone && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Review the triage analysis above. If you approve, AI will read the affected files, generate a fix, and create a GitHub pull request.
            </p>
            <Button onClick={onApprove}>
              <GitPullRequest className="h-4 w-4 mr-2" />
              Approve & Generate Fix
            </Button>
          </div>
        )}

        {/* Generating */}
        {isWorking && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm font-medium">Generating fix and creating PR...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reading files from GitHub, generating code changes, and creating a pull request.
              This may take 30-60 seconds.
            </p>
          </div>
        )}

        {/* Failed */}
        {isFailed && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2">Remediation failed.</p>
              {remediationResult?.error && (
                <p className="text-xs">{remediationResult.error}</p>
              )}
              <Button variant="outline" size="sm" onClick={onApprove} className="mt-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* PR Created */}
        {isPrCreated && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">PR Created</Badge>
              {branch && (
                <Badge variant="outline" className="font-mono text-xs">
                  <GitBranch className="h-3 w-3 mr-1" />
                  {branch}
                </Badge>
              )}
            </div>

            {remediationResult?.summary && (
              <div>
                <h4 className="text-sm font-medium mb-1">Summary</h4>
                <p className="text-sm text-muted-foreground">{remediationResult.summary}</p>
              </div>
            )}

            {remediationResult?.changes && remediationResult.changes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Files Changed</h4>
                <div className="space-y-1">
                  {remediationResult.changes.map((change, i) => (
                    <div key={i} className="text-xs">
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{change.path}</code>
                      {change.summary && (
                        <span className="text-muted-foreground ml-2">— {change.summary}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button asChild className="w-full">
              <a href={prUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Pull Request on GitHub
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
