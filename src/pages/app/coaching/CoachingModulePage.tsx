import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoachingRole, getCoachingDashboardRoute } from "@/hooks/useCoachingRole";

/**
 * Main coaching module entry point.
 * Redirects to the appropriate dashboard based on user's coaching role.
 */
export default function CoachingModulePage() {
  const navigate = useNavigate();
  const { role, isLoading } = useCoachingRole();

  useEffect(() => {
    if (!isLoading) {
      const route = getCoachingDashboardRoute(role);
      navigate(route, { replace: true });
    }
  }, [role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
