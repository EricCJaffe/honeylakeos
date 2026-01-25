/**
 * Health Diagnostics Page
 * 
 * Shows system health status for debugging connectivity and configuration issues.
 * Auth-protected, accessible at /app/health
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { useCompanyModuleFlags } from "@/core/modules";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  User,
  Building2,
  ToggleRight,
  Clock
} from "lucide-react";

interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "checking";
  message: string;
  icon: React.ElementType;
}

export default function HealthPage() {
  const { user, session, loading: authLoading } = useAuth();
  const { 
    memberships, 
    activeCompanyId, 
    loading: membershipLoading 
  } = useMembership();
  const { 
    flags, 
    isLoading: flagsLoading, 
    isSafeMode, 
    error: flagsError 
  } = useCompanyModuleFlags();

  // Supabase connectivity check
  const { 
    data: dbCheck, 
    isLoading: dbLoading, 
    error: dbError,
    refetch: refetchDb
  } = useQuery({
    queryKey: ["health-check-db"],
    queryFn: async () => {
      const start = Date.now();
      const { error } = await supabase
        .from("companies")
        .select("id")
        .limit(1);
      const latency = Date.now() - start;
      
      if (error) throw error;
      return { success: true, latency };
    },
    retry: false,
    staleTime: 0,
  });

  const [lastChecked, setLastChecked] = React.useState(new Date());

  const runAllChecks = () => {
    refetchDb();
    setLastChecked(new Date());
  };

  // Build health checks array
  const healthChecks: HealthCheck[] = React.useMemo(() => {
    const checks: HealthCheck[] = [];

    // 1. Database Connectivity
    if (dbLoading) {
      checks.push({
        name: "Database Connection",
        status: "checking",
        message: "Checking connection...",
        icon: Database,
      });
    } else if (dbError) {
      checks.push({
        name: "Database Connection",
        status: "fail",
        message: "Cannot reach database",
        icon: Database,
      });
    } else if (dbCheck) {
      checks.push({
        name: "Database Connection",
        status: "pass",
        message: `Connected (${dbCheck.latency}ms)`,
        icon: Database,
      });
    }

    // 2. Auth Session
    if (authLoading) {
      checks.push({
        name: "Authentication",
        status: "checking",
        message: "Checking session...",
        icon: User,
      });
    } else if (!user || !session) {
      checks.push({
        name: "Authentication",
        status: "fail",
        message: "No active session",
        icon: User,
      });
    } else {
      checks.push({
        name: "Authentication",
        status: "pass",
        message: `Authenticated as ${user.email?.split("@")[0]}...`,
        icon: User,
      });
    }

    // 3. Membership Load
    if (membershipLoading) {
      checks.push({
        name: "Memberships",
        status: "checking",
        message: "Loading memberships...",
        icon: Building2,
      });
    } else if (!memberships || memberships.length === 0) {
      checks.push({
        name: "Memberships",
        status: "warn",
        message: "No company memberships found",
        icon: Building2,
      });
    } else {
      checks.push({
        name: "Memberships",
        status: "pass",
        message: `${memberships.length} membership(s), active: ${activeCompanyId ? "yes" : "no"}`,
        icon: Building2,
      });
    }

    // 4. Module Flags
    if (flagsLoading) {
      checks.push({
        name: "Module Flags",
        status: "checking",
        message: "Loading flags...",
        icon: ToggleRight,
      });
    } else if (flagsError) {
      checks.push({
        name: "Module Flags",
        status: "warn",
        message: "Failed to load (safe mode active)",
        icon: ToggleRight,
      });
    } else if (isSafeMode) {
      checks.push({
        name: "Module Flags",
        status: "warn",
        message: "Running in safe mode",
        icon: ToggleRight,
      });
    } else {
      checks.push({
        name: "Module Flags",
        status: "pass",
        message: `${flags.size} flag(s) loaded`,
        icon: ToggleRight,
      });
    }

    return checks;
  }, [
    dbLoading, dbError, dbCheck,
    authLoading, user, session,
    membershipLoading, memberships, activeCompanyId,
    flagsLoading, flagsError, isSafeMode, flags
  ]);

  const allPassing = healthChecks.every((c) => c.status === "pass");
  const hasFailures = healthChecks.some((c) => c.status === "fail");

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Health"
        description="Diagnostics and connectivity status"
      />

      {/* Overall Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {allPassing ? (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              ) : hasFailures ? (
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">
                  {allPassing ? "All Systems Operational" : hasFailures ? "Issues Detected" : "Warnings"}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last checked: {lastChecked.toLocaleTimeString()}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={runAllChecks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Individual Checks */}
      <div className="grid gap-4 md:grid-cols-2">
        {healthChecks.map((check) => (
          <HealthCheckCard key={check.name} check={check} />
        ))}
      </div>

      {/* Environment Info (non-sensitive) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">App Version</dt>
            <dd className="font-mono">0.9.x-beta</dd>
            <dt className="text-muted-foreground">Build Time</dt>
            <dd className="font-mono">{new Date().toLocaleDateString()}</dd>
            <dt className="text-muted-foreground">Safe Mode</dt>
            <dd>
              <Badge variant={isSafeMode ? "destructive" : "secondary"}>
                {isSafeMode ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCheckCard({ check }: { check: HealthCheck }) {
  const Icon = check.icon;
  
  const statusConfig = {
    pass: { 
      bg: "bg-green-100 dark:bg-green-900/30", 
      text: "text-green-600 dark:text-green-400",
      badge: "default" as const,
      label: "Pass"
    },
    fail: { 
      bg: "bg-red-100 dark:bg-red-900/30", 
      text: "text-red-600 dark:text-red-400",
      badge: "destructive" as const,
      label: "Fail"
    },
    warn: { 
      bg: "bg-amber-100 dark:bg-amber-900/30", 
      text: "text-amber-600 dark:text-amber-400",
      badge: "secondary" as const,
      label: "Warning"
    },
    checking: { 
      bg: "bg-muted", 
      text: "text-muted-foreground",
      badge: "outline" as const,
      label: "Checking"
    },
  };

  const config = statusConfig[check.status];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${config.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-sm">{check.name}</h3>
              <Badge variant={config.badge} className="text-xs">
                {check.status === "checking" ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {check.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
