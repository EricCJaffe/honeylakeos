import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CoachingOrgSelector } from "./CoachingOrgSelector";

interface CoachingDashboardLayoutProps {
  title: string;
  description?: string;
  /** @deprecated Use CoachingOrgSelector instead */
  programKey?: string | null;
  /** @deprecated Use CoachingOrgSelector instead */
  programVersion?: string | number | null;
  /** @deprecated Use CoachingOrgSelector instead */
  orgName?: string | null;
  isLoading?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Whether to show the org selector (default: true) */
  showOrgSelector?: boolean;
}

export function CoachingDashboardLayout({
  title,
  description,
  isLoading = false,
  headerActions,
  children,
  className,
  showOrgSelector = true,
}: CoachingDashboardLayoutProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {showOrgSelector && <CoachingOrgSelector />}
          </div>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
