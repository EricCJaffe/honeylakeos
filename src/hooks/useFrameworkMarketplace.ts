import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import { Framework } from "./useFrameworks";

// Extended Framework type with marketplace fields
export interface MarketplaceFramework extends Framework {
  marketplace_visibility: "private" | "coach_org_clients";
  short_summary: string | null;
  tags: string[];
  published_at: string | null;
  source_framework_id: string | null;
  owner_company?: {
    id: string;
    name: string;
  } | null;
}

export interface FrameworkVersion {
  id: string;
  name: string;
  version_label: string | null;
  published_at: string | null;
  created_at: string;
}

// ==========================================
// MARKETPLACE BROWSING (Client-Side)
// ==========================================
export function useMarketplaceFrameworks() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["marketplace-frameworks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return { systemTemplates: [], coachRecommended: [] };

      // Fetch system templates
      const { data: systemTemplates, error: systemError } = await supabase
        .from("frameworks")
        .select("*")
        .eq("is_system_template", true)
        .eq("status", "published")
        .is("archived_at", null);

      if (systemError) throw systemError;

      // Fetch coach org frameworks shared via engagements
      const { data: engagements, error: engError } = await supabase
        .from("coaching_engagements")
        .select("coaching_org_company_id")
        .eq("client_company_id", activeCompanyId)
        .is("archived_at", null);

      if (engError) throw engError;

      const coachOrgIds = [...new Set(engagements?.map(e => e.coaching_org_company_id) || [])];
      
      let coachRecommended: MarketplaceFramework[] = [];
      if (coachOrgIds.length > 0) {
        const { data: coachFrameworks, error: coachError } = await supabase
          .from("frameworks")
          .select(`
            *,
            owner_company:companies!frameworks_owner_company_id_fkey(id, name)
          `)
          .eq("owner_type", "coach_org")
          .eq("status", "published")
          .eq("marketplace_visibility", "coach_org_clients")
          .in("owner_company_id", coachOrgIds)
          .is("archived_at", null);

        if (coachError) throw coachError;
        coachRecommended = (coachFrameworks || []) as MarketplaceFramework[];
      }

      return {
        systemTemplates: (systemTemplates || []) as MarketplaceFramework[],
        coachRecommended,
      };
    },
    enabled: !!activeCompanyId,
  });
}

// ==========================================
// COACH ORG FRAMEWORK MANAGEMENT
// ==========================================
export function useCoachOrgFrameworks() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["coach-org-frameworks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("frameworks")
        .select("*")
        .eq("owner_company_id", activeCompanyId)
        .eq("owner_type", "coach_org")
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as MarketplaceFramework[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useFrameworkVersions(sourceFrameworkId: string | null) {
  return useQuery({
    queryKey: ["framework-versions", sourceFrameworkId],
    queryFn: async () => {
      if (!sourceFrameworkId) return [];

      // Get all frameworks that share this source or are this source
      const { data, error } = await supabase
        .from("frameworks")
        .select("id, name, version_label, published_at, created_at")
        .or(`id.eq.${sourceFrameworkId},source_framework_id.eq.${sourceFrameworkId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FrameworkVersion[];
    },
    enabled: !!sourceFrameworkId,
  });
}

// ==========================================
// PUBLISHING MUTATIONS
// ==========================================
export function useFrameworkPublishingMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const publishFramework = useMutation({
    mutationFn: async ({
      frameworkId,
      visibility,
      shortSummary,
      tags,
    }: {
      frameworkId: string;
      visibility: "private" | "coach_org_clients";
      shortSummary?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("frameworks")
        .update({
          status: "published",
          marketplace_visibility: visibility,
          short_summary: shortSummary,
          tags: tags || [],
          published_at: new Date().toISOString(),
        })
        .eq("id", frameworkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-org-frameworks"] });
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
      toast.success("Framework published");
    },
    onError: (error: Error) => {
      toast.error(`Failed to publish: ${error.message}`);
    },
  });

  const updateMarketplaceVisibility = useMutation({
    mutationFn: async ({
      frameworkId,
      visibility,
    }: {
      frameworkId: string;
      visibility: "private" | "coach_org_clients";
    }) => {
      const { data, error } = await supabase
        .from("frameworks")
        .update({ marketplace_visibility: visibility })
        .eq("id", frameworkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-org-frameworks"] });
      toast.success("Visibility updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update visibility: ${error.message}`);
    },
  });

  const createNewVersion = useMutation({
    mutationFn: async ({
      sourceFrameworkId,
      newVersionLabel,
    }: {
      sourceFrameworkId: string;
      newVersionLabel: string;
    }) => {
      if (!activeCompanyId) throw new Error("No company selected");

      // Clone the framework with new version label
      const { data, error } = await supabase.rpc("clone_framework", {
        p_source_framework_id: sourceFrameworkId,
        p_target_company_id: activeCompanyId,
        p_new_name: null, // Keep same name
        p_new_description: null,
      });

      if (error) throw error;
      
      // Update with version info and source reference
      const { error: updateError } = await supabase
        .from("frameworks")
        .update({
          version_label: newVersionLabel,
          source_framework_id: sourceFrameworkId,
          owner_type: "coach_org",
          owner_company_id: activeCompanyId,
        })
        .eq("id", data);

      if (updateError) throw updateError;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-org-frameworks"] });
      queryClient.invalidateQueries({ queryKey: ["framework-versions"] });
      toast.success("New version created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });

  const archiveFramework = useMutation({
    mutationFn: async (frameworkId: string) => {
      const { error } = await supabase
        .from("frameworks")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", frameworkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-org-frameworks"] });
      toast.success("Framework archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive: ${error.message}`);
    },
  });

  const updateFrameworkMetadata = useMutation({
    mutationFn: async ({
      frameworkId,
      shortSummary,
      tags,
    }: {
      frameworkId: string;
      shortSummary?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("frameworks")
        .update({
          short_summary: shortSummary,
          tags: tags || [],
        })
        .eq("id", frameworkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-org-frameworks"] });
      toast.success("Metadata updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return {
    publishFramework,
    updateMarketplaceVisibility,
    createNewVersion,
    archiveFramework,
    updateFrameworkMetadata,
  };
}

// ==========================================
// FRAMEWORK VALIDATION
// ==========================================
export function useFrameworkValidation(frameworkId: string | null) {
  return useQuery({
    queryKey: ["framework-validation", frameworkId],
    queryFn: async () => {
      if (!frameworkId) return null;

      // Check concepts
      const { data: concepts, error: conceptsError } = await supabase
        .from("framework_concepts")
        .select("id")
        .eq("framework_id", frameworkId)
        .eq("enabled", true);

      if (conceptsError) throw conceptsError;

      // Check dashboards
      const { data: dashboards, error: dashboardsError } = await supabase
        .from("framework_dashboards")
        .select("id")
        .eq("framework_id", frameworkId)
        .eq("enabled", true);

      if (dashboardsError) throw dashboardsError;

      const issues: string[] = [];
      if (!concepts || concepts.length === 0) {
        issues.push("At least one concept must be enabled");
      }
      if (!dashboards || dashboards.length === 0) {
        issues.push("At least one dashboard must be enabled");
      }

      return {
        isValid: issues.length === 0,
        issues,
        conceptCount: concepts?.length || 0,
        dashboardCount: dashboards?.length || 0,
      };
    },
    enabled: !!frameworkId,
  });
}
