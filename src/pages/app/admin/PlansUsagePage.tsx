import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useEntitlements,
  useUsageCounts,
  PLAN_INFO,
  type EntitlementKey,
} from "@/hooks/useEntitlements";
import { useMembership } from "@/lib/membership";
import {
  Crown,
  Users,
  Building2,
  Layers,
  Share2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlansUsagePage() {
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const {
    isLoading,
    plan,
    getPlanStatus,
    getLimit,
    getUsageInfo,
    isEnabled,
  } = useEntitlements();
  const { counts, isLoading: usageLoading } = useUsageCounts();

  const planStatus = getPlanStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Plans & Usage" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans & Usage"
        description="Manage your plan and monitor usage limits"
      />

      {/* Grace Period Warning */}
      {planStatus.isGrace && (
        <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700">Grace Period Active</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Your plan has expired. You have{" "}
            <strong>{planStatus.graceDaysRemaining} days</strong> remaining.
            During this time, you can still access all features, but new
            creations may be limited once the grace period ends.
          </AlertDescription>
        </Alert>
      )}

      {/* Expired Warning */}
      {planStatus.isExpired && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Plan Expired</AlertTitle>
          <AlertDescription>
            Your plan has expired. You can still view existing data, but new
            creations are disabled. Contact support to renew your plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Admin Override Notice */}
      {(isCompanyAdmin || isSiteAdmin) && (
        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            As an administrator, you have full access to all features regardless of plan limits.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <CurrentPlanCard planStatus={planStatus} />

        {/* Usage Summary */}
        <UsageSummaryCard
          counts={counts}
          isLoading={usageLoading}
          getUsageInfo={getUsageInfo}
          planStatus={planStatus}
        />
      </div>

      {/* Detailed Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Details
          </CardTitle>
          <CardDescription>
            Current usage against your plan limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageLimitRow
            icon={Users}
            label="Team Members"
            description="Active users in your organization"
            current={counts.users}
            limit={getLimit("max_users")}
            isLoading={usageLoading}
          />
          <Separator />
          <UsageLimitRow
            icon={Layers}
            label="Active Frameworks"
            description="Frameworks adopted by your organization"
            current={counts.frameworks}
            limit={getLimit("max_active_frameworks")}
            isLoading={usageLoading}
          />
          <Separator />
          <UsageLimitRow
            icon={Share2}
            label="Published Frameworks"
            description="Frameworks published to the marketplace"
            current={counts.publishedFrameworks}
            limit={getLimit("max_published_frameworks")}
            isLoading={usageLoading}
          />
          {planStatus.planType === "coach_org" && (
            <>
              <Separator />
              <UsageLimitRow
                icon={Building2}
                label="Active Clients"
                description="Client organizations you're coaching"
                current={counts.clients}
                limit={getLimit("max_active_clients")}
                isLoading={usageLoading}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Feature Entitlements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Plan Features
          </CardTitle>
          <CardDescription>
            Features included in your current plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureItem
              label="CRM"
              enabled={isEnabled("crm_enabled")}
              description="Customer relationship management"
            />
            <FeatureItem
              label="Learning Management (LMS)"
              enabled={isEnabled("lms_enabled")}
              description="Courses, lessons, and training"
            />
            <FeatureItem
              label="Coaching Module"
              enabled={isEnabled("coaching_module_enabled")}
              description="Client engagements and coaching"
            />
            <FeatureItem
              label="Framework Engine"
              enabled={isEnabled("framework_engine_enabled")}
              description="Business operating frameworks"
            />
            <FeatureItem
              label="Marketplace Publishing"
              enabled={isEnabled("framework_marketplace_publish")}
              description="Publish frameworks to clients"
            />
            <FeatureItem
              label="Weighted Health Metrics"
              enabled={isEnabled("weighted_health_metrics")}
              description="Advanced health scoring"
            />
            <FeatureItem
              label="Coach Manager Views"
              enabled={isEnabled("coach_manager_views")}
              description="Multi-coach management"
            />
            <FeatureItem
              label="Advanced Reporting"
              enabled={isEnabled("advanced_reporting")}
              description="In-depth analytics"
            />
          </div>
        </CardContent>
      </Card>

      {/* What Happens When Limits Are Exceeded */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Limit Behavior
          </CardTitle>
          <CardDescription>
            What happens when you reach your plan limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LimitBehaviorItem
              title="Soft Limits"
              items={[
                "Existing data remains fully accessible",
                "New creations are prevented when at limit",
                "Upgrade to increase limits",
              ]}
            />
            <LimitBehaviorItem
              title="Grace Period"
              items={[
                `${planStatus.gracePeriodDays || 30} days after expiration`,
                "Full access during grace period",
                "Warnings displayed throughout",
              ]}
            />
          </div>
          <Alert className="bg-muted/50">
            <AlertDescription className="text-muted-foreground">
              <strong>We never delete your data.</strong> Even if your plan
              expires, all your data remains safe and accessible in read-only
              mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

function CurrentPlanCard({
  planStatus,
}: {
  planStatus: ReturnType<ReturnType<typeof useEntitlements>["getPlanStatus"]>;
}) {
  const planInfo = planStatus.planTier ? PLAN_INFO[planStatus.planTier] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Plan
          </CardTitle>
          {planStatus.planTier && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                planInfo?.type === "coach_org"
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              )}
            >
              {planInfo?.name}
            </Badge>
          )}
        </div>
        <CardDescription>
          {planInfo?.description || "No plan assigned - full trial access"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              planStatus.isActive
                ? "default"
                : planStatus.isGrace
                ? "outline"
                : "destructive"
            }
            className={cn(
              planStatus.isGrace && "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
            )}
          >
            {planStatus.isGrace ? "Grace Period" : planStatus.status || "Trial"}
          </Badge>
          {planStatus.isGrace && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {planStatus.graceDaysRemaining} days left
            </span>
          )}
        </div>

        {planStatus.expiresAt && !planStatus.isExpired && (
          <p className="text-sm text-muted-foreground">
            {planStatus.isGrace ? "Grace period ends" : "Renews"} on{" "}
            {new Date(planStatus.expiresAt).toLocaleDateString()}
          </p>
        )}

        {!planStatus.hasPlan && (
          <Alert className="bg-muted/50">
            <AlertDescription>
              You're currently on a trial with full access to all features.
              Contact us to set up a plan.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function UsageSummaryCard({
  counts,
  isLoading,
  getUsageInfo,
  planStatus,
}: {
  counts: { users: number; frameworks: number; publishedFrameworks: number; clients: number };
  isLoading: boolean;
  getUsageInfo: (key: EntitlementKey, current: number) => ReturnType<ReturnType<typeof useEntitlements>["getUsageInfo"]>;
  planStatus: ReturnType<ReturnType<typeof useEntitlements>["getPlanStatus"]>;
}) {
  const usersInfo = getUsageInfo("max_users", counts.users);
  const frameworksInfo = getUsageInfo("max_active_frameworks", counts.frameworks);

  const atLimitCount = [
    usersInfo.isAtLimit,
    frameworksInfo.isAtLimit,
  ].filter(Boolean).length;

  const nearLimitCount = [
    usersInfo.isNearLimit && !usersInfo.isAtLimit,
    frameworksInfo.isNearLimit && !frameworksInfo.isAtLimit,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage Summary
        </CardTitle>
        <CardDescription>
          Quick overview of your resource usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{counts.users}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{counts.frameworks}</p>
                <p className="text-sm text-muted-foreground">Frameworks</p>
              </div>
            </div>

            {(atLimitCount > 0 || nearLimitCount > 0) && (
              <Alert
                variant={atLimitCount > 0 ? "destructive" : "default"}
                className={cn(
                  atLimitCount === 0 && "bg-yellow-500/10 border-yellow-500/30"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {atLimitCount > 0
                    ? `You've reached ${atLimitCount} limit(s). Upgrade to add more.`
                    : `You're approaching ${nearLimitCount} limit(s).`}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UsageLimitRow({
  icon: Icon,
  label,
  description,
  current,
  limit,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  current: number;
  limit: number;
  isLoading: boolean;
}) {
  const percentage = limit > 0 && limit < 999999 ? Math.round((current / limit) * 100) : 0;
  const isAtLimit = current >= limit && limit < 999999;
  const isNearLimit = percentage >= 80 && !isAtLimit;
  const isUnlimited = limit >= 999999;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <div className="text-right">
            <p
              className={cn(
                "font-semibold",
                isAtLimit && "text-destructive",
                isNearLimit && "text-yellow-600"
              )}
            >
              {current} / {isUnlimited ? "∞" : limit}
            </p>
            {!isUnlimited && (
              <p className="text-xs text-muted-foreground">
                {Math.max(0, limit - current)} remaining
              </p>
            )}
          </div>
        )}
      </div>
      {!isUnlimited && !isLoading && (
        <Progress
          value={Math.min(percentage, 100)}
          className={cn(
            "h-2",
            isAtLimit && "[&>div]:bg-destructive",
            isNearLimit && "[&>div]:bg-yellow-500"
          )}
        />
      )}
    </div>
  );
}

function FeatureItem({
  label,
  enabled,
  description,
}: {
  label: string;
  enabled: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      {enabled ? (
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div>
        <p className={cn("font-medium text-sm", !enabled && "text-muted-foreground")}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LimitBehaviorItem({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
