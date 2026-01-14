import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { memberships, activeCompanyId, loading } = useMembership();

  // Redirect logic based on memberships and active company
  React.useEffect(() => {
    if (loading || !user) return;

    const isOnboardingRoute = location.pathname === "/app/onboarding";
    const isDevRoute = location.pathname.startsWith("/app/dev");
    const isSelectCompanyRoute = location.pathname === "/app/select-company";

    // Skip redirect for special routes
    if (isOnboardingRoute || isDevRoute || isSelectCompanyRoute) return;

    // If no memberships, redirect to onboarding
    if (memberships.length === 0) {
      navigate("/app/onboarding");
      return;
    }

    // If user has multiple companies but no active company selected, redirect to selector
    if (memberships.length > 1 && !activeCompanyId) {
      navigate("/app/select-company");
      return;
    }
  }, [loading, user, memberships, activeCompanyId, navigate, location.pathname]);

  // Show loading state while checking memberships
  if (loading) {
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
        </div>
      </div>
    </SidebarProvider>
  );
}
