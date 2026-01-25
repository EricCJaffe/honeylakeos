/**
 * Module-Level Error Boundary
 * 
 * Wraps individual module routes so that an error in one module
 * doesn't crash the entire app shell (sidebar, topbar remain functional).
 */

import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logError, generateErrorId } from "./logging";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, ArrowLeft, Copy, Check } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Module name for better error context */
  moduleName?: string;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    const errorId = generateErrorId();
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, {
      component: `ModuleErrorBoundary:${this.props.moduleName || "unknown"}`,
      metadata: {
        componentStack: errorInfo.componentStack?.split("\n").slice(0, 8).join("\n"),
      },
    });
  }

  resetError = () => {
    this.setState({ hasError: false, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ModuleErrorFallback
          errorId={this.state.errorId}
          moduleName={this.props.moduleName}
          onRetry={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  errorId: string | null;
  moduleName?: string;
  onRetry: () => void;
}

function ModuleErrorFallback({ errorId, moduleName, onRetry }: FallbackProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = React.useState(false);

  const copyErrorId = () => {
    if (errorId) {
      navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-lg">
            {moduleName ? `${moduleName} encountered an error` : "Module Error"}
          </CardTitle>
          <CardDescription className="mt-2">
            This section experienced an issue. The rest of the app is still working.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error ID */}
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

          {/* Current route for context */}
          <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded truncate">
            {location.pathname}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={onRetry} variant="default" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button variant="outline" onClick={() => navigate("/app")} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * HOC to wrap a component with module error boundary
 */
export function withModuleErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleName?: string
) {
  return function BoundedComponent(props: P) {
    return (
      <ModuleErrorBoundary moduleName={moduleName}>
        <WrappedComponent {...props} />
      </ModuleErrorBoundary>
    );
  };
}
