import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, RefreshCw } from "lucide-react";

interface EngagementContext {
  engagementId: string;
  coachingOrgId: string;
  coachingOrgName: string;
  programName: string | null;
  status: string;
}

/**
 * Hook to manage which coaching engagement context the user is viewing.
 * For member companies with multiple active engagements.
 */
export function useEngagementContext() {
  const { activeCompanyId } = useActiveCompany();
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);

  // Fetch all active engagements for this company
  const { data: engagements, isLoading } = useQuery({
    queryKey: ["member-company-engagements", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("coaching_org_engagements")
        .select(`
          id,
          coaching_org_id,
          program_name_snapshot,
          status,
          coaching_org:coaching_org_id(name)
        `)
        .eq("member_company_id", activeCompanyId)
        .in("status", ["active", "suspended"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((e: any) => ({
        engagementId: e.id,
        coachingOrgId: e.coaching_org_id,
        coachingOrgName: e.coaching_org?.name || "Unknown",
        programName: e.program_name_snapshot,
        status: e.status,
      })) as EngagementContext[];
    },
    enabled: !!activeCompanyId,
  });

  // Auto-select first engagement if none selected
  const activeEngagement =
    engagements?.find((e) => e.engagementId === selectedEngagementId) ||
    engagements?.[0] ||
    null;

  return {
    engagements: engagements || [],
    activeEngagement,
    selectedEngagementId: activeEngagement?.engagementId || null,
    setSelectedEngagementId,
    hasMultipleEngagements: (engagements?.length || 0) > 1,
    isLoading,
  };
}

/**
 * Selector for switching between multiple coaching engagement contexts.
 * Only visible when member company has multiple active engagements.
 */
export function EngagementContextSelector() {
  const { engagements, activeEngagement, setSelectedEngagementId, hasMultipleEngagements, isLoading } =
    useEngagementContext();

  if (isLoading) return null;
  if (!hasMultipleEngagements) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeEngagement?.engagementId || ""}
        onValueChange={setSelectedEngagementId}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select coaching org" />
        </SelectTrigger>
        <SelectContent>
          {engagements.map((eng) => (
            <SelectItem key={eng.engagementId} value={eng.engagementId}>
              <div className="flex items-center gap-2">
                <span>{eng.coachingOrgName}</span>
                {eng.status === "suspended" && (
                  <Badge variant="outline" className="text-xs">
                    Suspended
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Hook to detect if user has multiple roles in coaching context.
 * Returns role switching capability for users who are both org admin and coach.
 */
export function useCoachingRoleContext() {
  const { activeCompanyId } = useActiveCompany();
  const { isSiteAdmin } = useMembership();

  const [activeRole, setActiveRole] = useState<"org_admin" | "manager" | "coach">("coach");

  // Check user's roles in the coaching org
  const { data: roles, isLoading } = useQuery({
    queryKey: ["coaching-user-roles", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return { isOrgAdmin: false, isManager: false, isCoach: false };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isOrgAdmin: false, isManager: false, isCoach: false };

      // Check if user is org admin (has company_admin role in the coaching org company)
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      const isOrgAdmin = membership?.role === "company_admin";

      // Check if user is a manager
      const { data: managerData } = await supabase
        .from("coaching_managers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check if user is a coach
      const { data: coachData } = await supabase
        .from("coaching_coaches")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        isOrgAdmin: isOrgAdmin || isSiteAdmin,
        isManager: !!managerData,
        isCoach: !!coachData,
      };
    },
    enabled: !!activeCompanyId,
  });

  const hasMultipleRoles =
    [roles?.isOrgAdmin, roles?.isManager, roles?.isCoach].filter(Boolean).length > 1;

  const availableRoles: Array<"org_admin" | "manager" | "coach"> = [];
  if (roles?.isOrgAdmin) availableRoles.push("org_admin");
  if (roles?.isManager) availableRoles.push("manager");
  if (roles?.isCoach) availableRoles.push("coach");

  return {
    ...roles,
    activeRole,
    setActiveRole,
    hasMultipleRoles,
    availableRoles,
    isLoading,
  };
}

/**
 * Role switcher for users with multiple coaching roles.
 */
export function CoachingRoleSwitcher() {
  const { activeRole, setActiveRole, hasMultipleRoles, availableRoles, isLoading } =
    useCoachingRoleContext();

  if (isLoading) return null;
  if (!hasMultipleRoles) return null;

  const roleLabels: Record<string, string> = {
    org_admin: "Org Admin",
    manager: "Manager",
    coach: "Coach",
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">View as:</span>
      <div className="flex gap-1">
        {availableRoles.map((role) => (
          <Button
            key={role}
            variant={activeRole === role ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveRole(role)}
            className="h-7 text-xs"
          >
            {roleLabels[role]}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Banner shown when viewing an ended engagement (history mode)
 */
export function EndedEngagementBanner({ engagementEndedAt }: { engagementEndedAt: string }) {
  return (
    <div className="bg-muted/50 border border-border rounded-md p-3 flex items-center gap-3">
      <RefreshCw className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Coaching Ended</p>
        <p className="text-xs text-muted-foreground">
          This engagement ended on {new Date(engagementEndedAt).toLocaleDateString()}.
          Data is preserved but read-only from the coaching perspective.
        </p>
      </div>
    </div>
  );
}
