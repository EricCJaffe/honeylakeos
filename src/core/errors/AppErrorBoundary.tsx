/**
 * Global App Error Boundary
 * 
 * Catches unhandled exceptions at the app root level and renders
 * a fallback UI instead of crashing the entire SPA.
 */

import * as React from "react";
import { logError, generateErrorId } from "./logging";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional fallback component override */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = generateErrorId();
    return { hasError: true, errorId, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log with safe redaction
    logError(error, {
      component: "AppErrorBoundary",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      metadata: {
        componentStack: errorInfo.componentStack?.split("\n").slice(0, 10).join("\n"),
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToDashboard = () => {
    window.location.href = "/app";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <AppErrorFallback
          errorId={this.state.errorId}
          onReload={this.handleReload}
          onGoToDashboard={this.handleGoToDashboard}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  errorId: string | null;
  onReload: () => void;
  onGoToDashboard: () => void;
}

function AppErrorFallback({ errorId, onReload, onGoToDashboard }: FallbackProps) {
  const [copied, setCopied] = React.useState(false);

  const copyErrorId = () => {
    if (errorId) {
      navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription className="mt-2">
            An unexpected error occurred. Your data is safe, but we need to refresh the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error ID for support */}
          {errorId && (
            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Error Reference</p>
                <p className="font-mono text-sm font-medium">{errorId}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyErrorId}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={onReload} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button variant="outline" onClick={onGoToDashboard} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If this keeps happening, please contact support with the error reference above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { AppErrorFallback };
