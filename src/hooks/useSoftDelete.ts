import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from './useActiveCompany';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';

export type TrashEntityType = 
  | 'tasks'
  | 'projects'
  | 'notes'
  | 'documents'
  | 'crm_clients'
  | 'external_contacts'
  | 'events'
  | 'invoices'
  | 'donations';

export interface TrashItem {
  id: string;
  name: string;
  entity_type: TrashEntityType;
  deleted_at: string;
  deleted_by_user_id: string | null;
  deleted_by_email?: string;
}

export interface TrashCounts {
  [key: string]: number;
}

const NAME_COLUMNS: Record<TrashEntityType, string> = {
  tasks: 'title',
  projects: 'name',
  notes: 'title',
  documents: 'name',
  crm_clients: 'org_name',
  external_contacts: 'full_name',
  events: 'title',
  invoices: 'invoice_number',
  donations: 'id',
};

export function useSoftDelete() {
  const { activeCompanyId: companyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  // Get trash counts manually for each entity type
  const { data: trashCounts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['trash-counts', companyId],
    queryFn: async () => {
      if (!companyId) return {};
      
      const counts: TrashCounts = {};
      
      // Fetch counts for each entity type
      for (const entityType of Object.keys(NAME_COLUMNS) as TrashEntityType[]) {
        try {
          const { count, error } = await supabase
            .from(entityType)
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .not('deleted_at', 'is', null);
          
          if (!error && count !== null) {
            counts[entityType.replace(/s$/, '')] = count;
          }
        } catch {
          // Table might not have deleted_at column yet
        }
      }
      
      return counts;
    },
    enabled: !!companyId,
  });

  // Get trash items for a specific entity type
  const getTrashItems = async (entityType: TrashEntityType): Promise<TrashItem[]> => {
    if (!companyId) return [];

    const nameColumn = NAME_COLUMNS[entityType];
    
    // Use raw query to handle dynamic column selection
    const { data, error } = await supabase
      .from(entityType)
      .select('*')
      .eq('company_id', companyId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: (item[nameColumn] as string) || 'Untitled',
      entity_type: entityType,
      deleted_at: item.deleted_at as string,
      deleted_by_user_id: item.deleted_by_user_id as string | null,
    }));
  };

  // Soft delete mutation
  const softDeleteMutation = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: TrashEntityType; entityId: string }) => {
      if (!companyId) throw new Error('No company selected');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use raw update since deleted_at isn't in TypeScript types yet
      const { error } = await supabase
        .from(entityType)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by_user_id: user?.id,
        } as any)
        .eq('id', entityId)
        .eq('company_id', companyId);

      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: async ({ entityType, entityId }) => {
      await log('entity.soft_deleted', entityType.slice(0, -1) as any, entityId, { entity_type: entityType });
      queryClient.invalidateQueries({ queryKey: ['trash-counts', companyId] });
      queryClient.invalidateQueries({ queryKey: [entityType] });
      toast.success('Moved to trash');
    },
    onError: (error) => {
      console.error('Soft delete error:', error);
      toast.error('Failed to delete');
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: TrashEntityType; entityId: string }) => {
      if (!companyId) throw new Error('No company selected');
      
      // Use raw update since deleted_at isn't in TypeScript types yet
      const { error } = await supabase
        .from(entityType)
        .update({
          deleted_at: null,
          deleted_by_user_id: null,
        } as any)
        .eq('id', entityId)
        .eq('company_id', companyId);

      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: async ({ entityType, entityId }) => {
      await log('entity.restored', entityType.slice(0, -1) as any, entityId, { entity_type: entityType });
      queryClient.invalidateQueries({ queryKey: ['trash-counts', companyId] });
      queryClient.invalidateQueries({ queryKey: [entityType] });
      toast.success('Restored successfully');
    },
    onError: (error) => {
      console.error('Restore error:', error);
      toast.error('Failed to restore');
    },
  });

  const totalTrashCount = Object.values(trashCounts || {}).reduce((sum, count) => sum + count, 0);

  return {
    trashCounts: trashCounts ?? {},
    totalTrashCount,
    isLoadingCounts,
    getTrashItems,
    softDelete: softDeleteMutation.mutate,
    isSoftDeleting: softDeleteMutation.isPending,
    restore: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
  };
}
