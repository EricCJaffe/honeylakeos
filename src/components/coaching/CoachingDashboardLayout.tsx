import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachingDashboardLayoutProps {
  title: string;
  description?: string;
  programKey?: string | null;
  programVersion?: string | number | null;
  orgName?: string | null;
  isLoading?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CoachingDashboardLayout({
  title,
  description,
  programKey,
  programVersion,
  orgName,
  isLoading = false,
  headerActions,
  children,
  className,
}: CoachingDashboardLayoutProps) {
  const programBadgeText = programKey
    ? `${programKey}${programVersion ? ` v${programVersion}` : ""}`
    : null;

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
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {programBadgeText && (
              <Badge variant="secondary" className="text-xs">
                {programBadgeText}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
          {orgName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{orgName}</span>
            </div>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
