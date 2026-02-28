import { useEntitlements, PLAN_INFO, type PlanTier } from "@/hooks/useEntitlements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Crown, 
  Users, 
  Building2,
  Layers, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Zap,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// Plan Badge
export function PlanBadge({ 
  tier, 
  size = "default" 
}: { 
  tier: PlanTier; 
  size?: "sm" | "default" | "lg"; 
}) {
  const info = PLAN_INFO[tier] ?? {
    name: tier,
    description: "Custom plan",
    type: "company",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        sizeClasses[size],
        "gap-1.5",
        "bg-blue-500/10 text-blue-600 border-blue-500/20"
      )}
    >
      <Building2 className="h-3 w-3" />
      {info.name}
    </Badge>
  );
}

// Current Plan Card
export function CurrentPlanCard() {
  const { plan, getPlanStatus, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const status = getPlanStatus();

  if (!status.hasPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            No Plan Assigned
          </CardTitle>
          <CardDescription>
            Your organization has full access while in trial mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Contact us to set up a plan that fits your needs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const planInfo = status.planTier ? PLAN_INFO[status.planTier] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Plan
          </CardTitle>
          {status.planTier && <PlanBadge tier={status.planTier} />}
        </div>
        <CardDescription>
          {planInfo?.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={status.isActive ? "default" : status.isGrace ? "outline" : "destructive"}>
            {status.status}
          </Badge>
          {status.isGrace && (
            <span className="text-sm text-muted-foreground">
              Grace period active
            </span>
          )}
        </div>

        {status.expiresAt && (
          <p className="text-sm text-muted-foreground">
            {status.isExpired ? "Expired" : "Renews"} on{" "}
            {new Date(status.expiresAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Usage Limit Display
export function UsageLimitDisplay({ 
  label, 
  current, 
  limit,
  icon: Icon = Users 
}: { 
  label: string; 
  current: number; 
  limit: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className={cn(
          "font-medium",
          isAtLimit ? "text-red-600" : isNearLimit ? "text-yellow-600" : ""
        )}>
          {current} / {limit >= 999999 ? "∞" : limit}
        </span>
      </div>
      {limit < 999999 && (
        <Progress 
          value={Math.min(percentage, 100)} 
          className={cn(
            "h-2",
            isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-yellow-500" : ""
          )}
        />
      )}
    </div>
  );
}

// Feature Entitlement Display
export function FeatureEntitlement({ 
  label, 
  enabled, 
  description 
}: { 
  label: string; 
  enabled: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {enabled ? (
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div>
        <p className={cn("text-sm font-medium", !enabled && "text-muted-foreground")}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// Entitlements Overview Card
export function EntitlementsOverviewCard() {
  const { 
    isLoading, 
    isEnabled, 
    getLimit,
    getPlanStatus 
  } = useEntitlements();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const status = getPlanStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Plan Features
        </CardTitle>
        {!status.hasPlan && (
          <CardDescription>
            Full access during trial period
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Limits */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Limits</h4>
          <UsageLimitDisplay 
            label="Team Members" 
            current={0} 
            limit={getLimit("max_users")} 
            icon={Users}
          />
          <UsageLimitDisplay 
            label="Active Frameworks" 
            current={0} 
            limit={getLimit("max_active_frameworks")} 
            icon={Layers}
          />
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Features</h4>
          <FeatureEntitlement 
            label="CRM" 
            enabled={isEnabled("crm_enabled")} 
          />
          <FeatureEntitlement 
            label="Learning Management (LMS)" 
            enabled={isEnabled("lms_enabled")} 
          />
          <FeatureEntitlement 
            label="Advanced Reporting" 
            enabled={isEnabled("advanced_reporting")} 
          />
          <FeatureEntitlement 
            label="Framework Marketplace Publishing" 
            enabled={isEnabled("framework_marketplace_publish")} 
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Upgrade Prompt
export function UpgradePrompt({ 
  feature, 
  onUpgrade 
}: { 
  feature: string;
  onUpgrade?: () => void;
}) {
  return (
    <Alert className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>{feature}</strong> is not included in your current plan.
        </span>
        {onUpgrade && (
          <Button size="sm" variant="outline" onClick={onUpgrade}>
            Upgrade
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Grace Period Warning
export function GracePeriodWarning({ expiresAt }: { expiresAt: string }) {
  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Your plan has expired. You have <strong>{daysRemaining} days</strong> remaining in your grace period.
        Renew now to avoid losing access to premium features.
      </AlertDescription>
    </Alert>
  );
}
