/**
 * Safe Mode Shell
 * 
 * A minimal app shell that renders when critical providers fail.
 * Allows users to sign out or switch companies without full app functionality.
 */

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Logo } from "@/components/Logo";
import { AlertTriangle, LogOut, RefreshCw, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SafeModeShellProps {
  /** Reason for safe mode activation */
  reason: "membership_failed" | "flags_failed" | "unknown";
  /** Error details (will be logged, not displayed) */
  error?: Error | null;
  /** Whether user can switch companies */
  canSwitchCompany?: boolean;
}

export function SafeModeShell({ reason, canSwitchCompany = false }: SafeModeShellProps) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Failed to sign out");
      setSigningOut(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSwitchCompany = () => {
    navigate("/app/select-company");
  };

  const getMessage = () => {
    switch (reason) {
      case "membership_failed":
        return "We couldn't load your organization memberships. This may be a temporary issue.";
      case "flags_failed":
        return "We couldn't load your module settings. Some features may be unavailable.";
      default:
        return "Something went wrong while loading the application.";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <Logo size="sm" showText />
        <div className="flex items-center gap-2">
          {canSwitchCompany && (
            <Button variant="ghost" size="sm" onClick={handleSwitchCompany}>
              <Building2 className="h-4 w-4 mr-2" />
              Switch Company
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle>Limited Mode</CardTitle>
            <CardDescription className="mt-2">
              {getMessage()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Safe Mode Active</AlertTitle>
              <AlertDescription>
                Only essential features are available. Your data is safe.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
              
              {canSwitchCompany && (
                <Button variant="outline" onClick={handleSwitchCompany} className="w-full">
                  <Building2 className="h-4 w-4 mr-2" />
                  Switch Company
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleSignOut} 
                disabled={signingOut}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              If this persists, please contact support.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
