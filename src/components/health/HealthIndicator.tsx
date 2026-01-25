import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { HealthStatus, TrendDirection } from "@/hooks/useHealthScoring";

// Health Status Badge
export function HealthStatusBadge({ 
  status, 
  score,
  showScore = true,
  size = "default" 
}: { 
  status: HealthStatus | "unknown"; 
  score?: number | null;
  showScore?: boolean;
  size?: "sm" | "default" | "lg";
}) {
  const statusConfig = {
    green: { 
      label: "Healthy", 
      variant: "default" as const, 
      className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
      icon: CheckCircle,
    },
    yellow: { 
      label: "Needs Attention", 
      variant: "outline" as const, 
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20",
      icon: AlertTriangle,
    },
    red: { 
      label: "At Risk", 
      variant: "destructive" as const, 
      className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20",
      icon: AlertCircle,
    },
    unknown: { 
      label: "No Data", 
      variant: "secondary" as const, 
      className: "bg-muted text-muted-foreground",
      icon: Minus,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    default: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  return (
    <Badge 
      variant={config.variant} 
      className={cn(config.className, sizeClasses[size], "gap-1")}
    >
      <Icon className={cn(
        "shrink-0",
        size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
      )} />
      {showScore && score !== undefined && score !== null ? (
        <span>{score}%</span>
      ) : (
        <span>{config.label}</span>
      )}
    </Badge>
  );
}

// Trend Indicator
export function TrendIndicator({ 
  trend, 
  explanation,
  size = "default" 
}: { 
  trend: TrendDirection; 
  explanation?: string;
  size?: "sm" | "default" | "lg";
}) {
  const trendConfig = {
    improving: { 
      icon: TrendingUp, 
      label: "Improving",
      className: "text-green-600",
    },
    stable: { 
      icon: Minus, 
      label: "Stable",
      className: "text-muted-foreground",
    },
    declining: { 
      icon: TrendingDown, 
      label: "Declining",
      className: "text-red-600",
    },
  };

  const config = trendConfig[trend];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  if (explanation) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 cursor-help", config.className)}>
            <Icon className={iconSize} />
            <span className={cn(size === "sm" ? "text-xs" : "text-sm")}>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{explanation}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", config.className)}>
      <Icon className={iconSize} />
      <span className={cn(size === "sm" ? "text-xs" : "text-sm")}>{config.label}</span>
    </span>
  );
}

// Health Score Bar (visual representation)
export function HealthScoreBar({ 
  score, 
  status,
  showLabel = true 
}: { 
  score: number; 
  status: HealthStatus;
  showLabel?: boolean;
}) {
  const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Health Score</span>
          <span>{score}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", statusColors[status])}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

// Overall Health Card (compact view)
export function HealthSummaryPill({ 
  score, 
  status, 
  trend 
}: { 
  score: number | null; 
  status: HealthStatus | "unknown"; 
  trend?: TrendDirection;
}) {
  if (status === "unknown" || score === null) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
        <Minus className="h-4 w-4" />
        <span>No health data</span>
      </div>
    );
  }

  const statusBg = {
    green: "bg-green-500/10 border-green-500/20",
    yellow: "bg-yellow-500/10 border-yellow-500/20",
    red: "bg-red-500/10 border-red-500/20",
  };

  const statusText = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-3 px-3 py-1.5 rounded-full border",
      statusBg[status]
    )}>
      <span className={cn("font-semibold", statusText[status])}>
        {score}%
      </span>
      {trend && <TrendIndicator trend={trend} size="sm" />}
    </div>
  );
}
