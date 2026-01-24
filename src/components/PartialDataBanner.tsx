/**
 * Partial Data Banner
 * 
 * DEV-only indicator for when data was truncated or partially loaded.
 * Never shown to end users in production.
 */

import * as React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const isDev = import.meta.env.DEV;

export interface PartialDataInfo {
  /** Was data truncated due to limits? */
  truncated?: boolean;
  /** Total count before truncation */
  totalCount?: number;
  /** Limit that was applied */
  limit?: number;
  /** Modules that failed to load */
  failedModules?: string[];
  /** Generic partial load reason */
  reason?: string;
}

interface PartialDataBannerProps {
  info: PartialDataInfo;
  className?: string;
}

/**
 * Shows a subtle banner when data is partially loaded (DEV mode only).
 * Returns null in production.
 */
export function PartialDataBanner({ info, className }: PartialDataBannerProps) {
  // Never show in production
  if (!isDev) return null;

  const hasIssues =
    info.truncated ||
    (info.failedModules && info.failedModules.length > 0) ||
    info.reason;

  if (!hasIssues) return null;

  // Build message parts
  const messages: string[] = [];

  if (info.truncated && info.totalCount !== undefined && info.limit !== undefined) {
    messages.push(
      `Showing ${info.limit} of ${info.totalCount} items (truncated)`
    );
  } else if (info.truncated) {
    messages.push("Some results were truncated due to limits");
  }

  if (info.failedModules && info.failedModules.length > 0) {
    const moduleList = info.failedModules.join(", ");
    messages.push(`Some related items unavailable: ${moduleList}`);
  }

  if (info.reason) {
    messages.push(info.reason);
  }

  if (messages.length === 0) return null;

  return (
    <Alert variant="default" className={`border-dashed bg-muted/50 ${className || ""}`}>
      <Info className="h-4 w-4" />
      <AlertDescription className="text-xs text-muted-foreground">
        <span className="font-medium text-amber-600 dark:text-amber-400 mr-1">
          [DEV]
        </span>
        {messages.join(" · ")}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Context for passing partial data info down the tree
 */
export const PartialDataContext = React.createContext<PartialDataInfo | null>(null);

/**
 * Hook to read partial data info from context
 */
export function usePartialDataInfo(): PartialDataInfo | null {
  return React.useContext(PartialDataContext);
}

/**
 * Provider component for partial data info
 */
export function PartialDataProvider({
  info,
  children,
}: {
  info: PartialDataInfo;
  children: React.ReactNode;
}) {
  return (
    <PartialDataContext.Provider value={info}>
      {children}
    </PartialDataContext.Provider>
  );
}

/**
 * Helper to create partial data info from query metadata
 */
export function createPartialDataInfo(options: {
  data?: unknown[];
  limit?: number;
  error?: Error | null;
  disabledModules?: string[];
}): PartialDataInfo {
  const info: PartialDataInfo = {};

  if (options.data && options.limit) {
    const count = options.data.length;
    if (count >= options.limit) {
      info.truncated = true;
      info.totalCount = count;
      info.limit = options.limit;
    }
  }

  if (options.disabledModules && options.disabledModules.length > 0) {
    info.failedModules = options.disabledModules;
  }

  if (options.error) {
    info.reason = "Some data could not be loaded";
  }

  return info;
}
