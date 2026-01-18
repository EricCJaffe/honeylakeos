import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from './useActiveCompany';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';

export type SampleBatchType = 'business' | 'nonprofit' | 'church';

export interface SampleBatch {
  id: string;
  batch_type: SampleBatchType;
  created_at: string;
}

export function useSampleData() {
  const { activeCompanyId: companyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  // Check if company has active sample data
  const { data: hasSampleData, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['sample-data-status', companyId],
    queryFn: async () => {
      if (!companyId) return false;
      const { data, error } = await supabase.rpc('has_active_sample_data', {
        p_company_id: companyId,
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!companyId,
  });

  // Get active sample batch info
  const { data: activeBatch, isLoading: isLoadingBatch } = useQuery({
    queryKey: ['sample-batch', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc('get_active_sample_batch', {
        p_company_id: companyId,
      });
      if (error) throw error;
      return (data as SampleBatch[] | null)?.[0] ?? null;
    },
    enabled: !!companyId && hasSampleData === true,
  });

  // Create sample data
  const createMutation = useMutation({
    mutationFn: async (batchType: SampleBatchType) => {
      if (!companyId) throw new Error('No company selected');
      const { data, error } = await supabase.rpc('create_sample_data', {
        p_company_id: companyId,
        p_batch_type: batchType,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (batchId, batchType) => {
      await log('sample_data.created', 'sample_batch', batchId, { batch_type: batchType });
      queryClient.invalidateQueries({ queryKey: ['sample-data-status', companyId] });
      queryClient.invalidateQueries({ queryKey: ['sample-batch', companyId] });
      // Invalidate all entity queries to show new sample data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      toast.success('Sample data created successfully');
    },
    onError: (error) => {
      console.error('Failed to create sample data:', error);
      toast.error('Failed to create sample data');
    },
  });

  // Remove sample data
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company selected');
      const { data, error } = await supabase.rpc('remove_sample_data', {
        p_company_id: companyId,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: async () => {
      await log('sample_data.removed', 'sample_batch', activeBatch?.id);
      queryClient.invalidateQueries({ queryKey: ['sample-data-status', companyId] });
      queryClient.invalidateQueries({ queryKey: ['sample-batch', companyId] });
      // Invalidate all entity queries to remove sample data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      toast.success('Sample data removed successfully');
    },
    onError: (error) => {
      console.error('Failed to remove sample data:', error);
      toast.error('Failed to remove sample data');
    },
  });

  return {
    hasSampleData: hasSampleData ?? false,
    activeBatch,
    isLoading: isCheckingStatus || isLoadingBatch,
    createSampleData: createMutation.mutate,
    isCreating: createMutation.isPending,
    removeSampleData: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
  };
}
