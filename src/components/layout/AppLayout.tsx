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
  const { user } = useAuth();
  const { memberships, activeCompanyId, loading } = useMembership();
  const [isRedirectResolved, setIsRedirectResolved] = React.useState(false);

  // Redirect logic based on memberships and active company
  React.useEffect(() => {
    if (loading || !user) {
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

    // If no memberships, redirect to onboarding
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
  }, [loading, user, memberships, activeCompanyId, navigate, location.pathname]);

  // Show loading state while checking memberships OR while redirect decision is pending
  // This prevents the flash of onboarding UI for returning users
  if (loading || !isRedirectResolved) {
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
