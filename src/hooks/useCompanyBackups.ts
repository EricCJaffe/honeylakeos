import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from './useActiveCompany';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';

export interface CompanyBackup {
  id: string;
  company_id: string;
  backup_type: 'manual' | 'scheduled';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata_json: {
    tables?: Record<string, number>;
    total_records?: number;
    schema_version?: number;
  };
  storage_path: string | null;
  error_message: string | null;
  file_size_bytes: number | null;
  schema_version: number;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  restored_at: string | null;
  restored_by: string | null;
}

export interface BackupStats {
  total_backups: number;
  last_successful_backup: string | null;
  last_backup_type: string | null;
}

export function useCompanyBackups() {
  const { activeCompanyId: companyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  // List backups for the company
  const { data: backups, isLoading, refetch } = useQuery({
    queryKey: ['company-backups', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_backups')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as CompanyBackup[];
    },
    enabled: !!companyId,
  });

  // Get backup stats
  const { data: stats } = useQuery({
    queryKey: ['backup-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc('get_backup_stats', {
        p_company_id: companyId,
      });
      if (error) throw error;
      return (data as BackupStats[])?.[0] ?? null;
    },
    enabled: !!companyId,
  });

  // Check if manual backup is allowed
  const { data: canCreateBackup } = useQuery({
    queryKey: ['can-create-backup', companyId],
    queryFn: async () => {
      if (!companyId) return false;
      const { data, error } = await supabase.rpc('can_create_manual_backup', {
        p_company_id: companyId,
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!companyId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company selected');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create backup record
      const { data: backup, error: insertError } = await supabase
        .from('company_backups')
        .insert({
          company_id: companyId,
          backup_type: 'manual',
          status: 'pending',
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger edge function
      const { error: fnError } = await supabase.functions.invoke('create-backup', {
        body: { backup_id: backup.id, company_id: companyId },
      });

      if (fnError) throw fnError;

      return backup.id;
    },
    onSuccess: async (backupId) => {
      await log('backup.created', 'company', companyId, { backup_id: backupId });
      queryClient.invalidateQueries({ queryKey: ['company-backups', companyId] });
      queryClient.invalidateQueries({ queryKey: ['backup-stats', companyId] });
      queryClient.invalidateQueries({ queryKey: ['can-create-backup', companyId] });
      toast.success('Backup started');
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('company_backups')
          .select('status')
          .eq('id', backupId)
          .single();
        
        if (data?.status === 'completed') {
          clearInterval(pollInterval);
          queryClient.invalidateQueries({ queryKey: ['company-backups', companyId] });
          queryClient.invalidateQueries({ queryKey: ['backup-stats', companyId] });
          toast.success('Backup completed successfully');
        } else if (data?.status === 'failed') {
          clearInterval(pollInterval);
          queryClient.invalidateQueries({ queryKey: ['company-backups', companyId] });
          toast.error('Backup failed');
        }
      }, 2000);

      // Clear interval after 5 minutes max
      setTimeout(() => clearInterval(pollInterval), 300000);
    },
    onError: (error) => {
      console.error('Backup creation error:', error);
      toast.error('Failed to create backup');
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      if (!companyId) throw new Error('No company selected');

      await log('backup.restore_started', 'company', companyId, { backup_id: backupId });

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { backup_id: backupId, company_id: companyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, backupId) => {
      await log('backup.restore_completed', 'company', companyId, { backup_id: backupId });
      
      // Invalidate all data queries
      queryClient.invalidateQueries();
      toast.success('Restore completed successfully');
    },
    onError: (error) => {
      console.error('Restore error:', error);
      toast.error('Failed to restore backup');
    },
  });

  return {
    backups: backups ?? [],
    stats,
    isLoading,
    canCreateBackup: canCreateBackup ?? false,
    createBackup: createBackupMutation.mutate,
    isCreatingBackup: createBackupMutation.isPending,
    restoreBackup: restoreBackupMutation.mutate,
    isRestoring: restoreBackupMutation.isPending,
    refetch,
  };
}
