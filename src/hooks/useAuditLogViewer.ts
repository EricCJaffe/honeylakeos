import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from './useActiveCompany';

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  total_count: number;
}

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  actionPrefix?: string;
  actorUserId?: string;
  actorEmail?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

const PAGE_SIZE = 50;

export function useAuditLogViewer() {
  const { activeCompanyId: companyId } = useActiveCompany();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', companyId, page, filters],
    queryFn: async () => {
      if (!companyId) return { logs: [], totalCount: 0 };
      let resolvedActorUserId = filters.actorUserId || null;
      const actorEmail = filters.actorEmail?.trim();

      if (!resolvedActorUserId && actorEmail) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", actorEmail)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.user_id) return { logs: [], totalCount: 0 };
        resolvedActorUserId = profile.user_id;
      }

      const { data, error } = await supabase.rpc('list_audit_logs', {
        p_company_id: companyId,
        p_page_size: PAGE_SIZE,
        p_page: page,
        p_entity_type: filters.entityType || null,
        p_action: filters.action || filters.actionPrefix || null,
        p_actor_user_id: resolvedActorUserId,
        p_start_date: filters.startDate?.toISOString() || null,
        p_end_date: filters.endDate?.toISOString() || null,
        p_search: filters.search || null,
      });

      if (error) throw error;

      const logs = (data as AuditLogEntry[]) || [];
      const totalCount = logs[0]?.total_count ?? 0;

      return { logs, totalCount };
    },
    enabled: !!companyId,
  });

  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  const updateFilters = (newFilters: Partial<AuditLogFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  return {
    logs: data?.logs ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    page,
    totalPages,
    setPage,
    filters,
    updateFilters,
    clearFilters,
    refetch,
  };
}

// Get distinct entity types from audit logs
export function useAuditEntityTypes() {
  const { activeCompanyId: companyId } = useActiveCompany();

  return useQuery({
    queryKey: ['audit-entity-types', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('entity_type')
        .eq('company_id', companyId)
        .limit(1000);

      if (error) throw error;

      const types = [...new Set(data?.map((d) => d.entity_type) ?? [])];
      return types.sort();
    },
    enabled: !!companyId,
  });
}
