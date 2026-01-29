-- ============================================
-- SharePoint → BusinessOS Documents sync mapping (FSA-only usage by convention)
-- Add/update only (no auto-delete).
-- ============================================

CREATE TABLE IF NOT EXISTS public.integration_sharepoint_sync_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  sharepoint_site_id text NOT NULL,
  sharepoint_drive_id text NOT NULL,
  sharepoint_item_id text NOT NULL,
  sharepoint_parent_item_id text,

  file_name text NOT NULL,
  web_url text,
  last_modified_at timestamptz,
  etag text,

  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_file_path text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sharepoint_sync_map_item
ON public.integration_sharepoint_sync_map(company_id, sharepoint_drive_id, sharepoint_item_id);

CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_map_company
ON public.integration_sharepoint_sync_map(company_id);

CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_map_document
ON public.integration_sharepoint_sync_map(company_id, document_id);

ALTER TABLE public.integration_sharepoint_sync_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sharepoint_sync_map_select" ON public.integration_sharepoint_sync_map;
CREATE POLICY "sharepoint_sync_map_select"
ON public.integration_sharepoint_sync_map
FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "sharepoint_sync_map_insert" ON public.integration_sharepoint_sync_map;
CREATE POLICY "sharepoint_sync_map_insert"
ON public.integration_sharepoint_sync_map
FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "sharepoint_sync_map_update" ON public.integration_sharepoint_sync_map;
CREATE POLICY "sharepoint_sync_map_update"
ON public.integration_sharepoint_sync_map
FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "sharepoint_sync_map_delete" ON public.integration_sharepoint_sync_map;
CREATE POLICY "sharepoint_sync_map_delete"
ON public.integration_sharepoint_sync_map
FOR DELETE
USING (
  company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid() AND role = 'company_admin')
);

DROP TRIGGER IF EXISTS update_sharepoint_sync_map_updated_at ON public.integration_sharepoint_sync_map;
CREATE TRIGGER update_sharepoint_sync_map_updated_at
  BEFORE UPDATE ON public.integration_sharepoint_sync_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
