import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { memberships, activeCompanyId, loading: membershipsLoading } = useMembership();
  const [isRedirectResolved, setIsRedirectResolved] = React.useState(false);

  // Combined loading state: true until both auth AND memberships are resolved
  const isLoading = authLoading || membershipsLoading;

  // Redirect logic based on memberships and active company
  React.useEffect(() => {
    // CRITICAL: Do not make any routing decisions until loading is complete
    if (isLoading || !user) {
      setIsRedirectResolved(false);
      return;
    }

    const isOnboardingRoute = location.pathname === "/app/onboarding";
    const isDevRoute = location.pathname.startsWith("/app/dev");
    const isSelectCompanyRoute = location.pathname === "/app/select-company";

    // Skip redirect for special routes - mark as resolved
    if (isOnboardingRoute || isDevRoute || isSelectCompanyRoute) {
      setIsRedirectResolved(true);
      return;
    }

    // Only redirect to onboarding when we have CONFIRMED zero memberships
    // (isLoading is false at this point, so memberships query is complete)
    if (memberships.length === 0) {
      navigate("/app/onboarding", { replace: true });
      return;
    }

    // If user has multiple companies but no active company selected, redirect to selector
    if (memberships.length > 1 && !activeCompanyId) {
      navigate("/app/select-company", { replace: true });
      return;
    }

    // All checks passed, user can view the current route
    setIsRedirectResolved(true);
  }, [isLoading, user, memberships, activeCompanyId, navigate, location.pathname]);

  // Show loading state while auth OR memberships are loading, OR while redirect decision is pending
  // This prevents the flash of onboarding UI for returning users
  if (isLoading || !isRedirectResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          <footer className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex justify-end">
            <span>{APP_VERSION}</span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
