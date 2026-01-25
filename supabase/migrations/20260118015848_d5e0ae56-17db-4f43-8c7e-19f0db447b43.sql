-- Company Backups table
CREATE TABLE public.company_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  metadata_json JSONB NOT NULL DEFAULT '{}',
  storage_path TEXT,
  error_message TEXT,
  file_size_bytes BIGINT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  restored_by UUID
);

-- Enable RLS
ALTER TABLE public.company_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies - Company admins only
CREATE POLICY "Company admins can view backups"
  ON public.company_backups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = company_backups.company_id
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );

CREATE POLICY "Company admins can create backups"
  ON public.company_backups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = company_backups.company_id
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );

CREATE POLICY "Company admins can update backups"
  ON public.company_backups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = company_backups.company_id
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );

-- Index for listing backups
CREATE INDEX idx_company_backups_company_created 
  ON public.company_backups(company_id, created_at DESC);

-- Function to check if manual backup is allowed (rate limiting)
CREATE OR REPLACE FUNCTION public.can_create_manual_backup(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM company_backups
    WHERE company_id = p_company_id
      AND backup_type = 'manual'
      AND created_at > now() - INTERVAL '1 hour'
      AND status IN ('pending', 'in_progress', 'completed')
  );
$$;

-- Function to get backup stats for a company
CREATE OR REPLACE FUNCTION public.get_backup_stats(p_company_id UUID)
RETURNS TABLE(
  total_backups BIGINT,
  last_successful_backup TIMESTAMPTZ,
  last_backup_type TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_backups,
    MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_successful_backup,
    (SELECT backup_type FROM company_backups 
     WHERE company_id = p_company_id AND status = 'completed' 
     ORDER BY completed_at DESC LIMIT 1) as last_backup_type
  FROM company_backups
  WHERE company_id = p_company_id;
$$;

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-backups', 'company-backups', false, 104857600, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Company admins can upload backups"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-backups' 
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = (storage.foldername(name))[1]::uuid
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );

CREATE POLICY "Company admins can read backups"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-backups'
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = (storage.foldername(name))[1]::uuid
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );

CREATE POLICY "Company admins can delete backups"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-backups'
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = (storage.foldername(name))[1]::uuid
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );