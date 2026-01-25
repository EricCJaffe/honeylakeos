-- Framework Marketplace v1 - Add marketplace fields to frameworks table

-- Add marketplace columns to frameworks table
ALTER TABLE public.frameworks 
ADD COLUMN IF NOT EXISTS marketplace_visibility text DEFAULT 'private',
ADD COLUMN IF NOT EXISTS short_summary text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS source_framework_id uuid REFERENCES public.frameworks(id);

-- Add framework_adoption to recommendation_type enum
ALTER TYPE public.recommendation_type ADD VALUE IF NOT EXISTS 'framework_adoption';

-- Create index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_frameworks_marketplace 
ON public.frameworks(owner_type, status, marketplace_visibility) 
WHERE archived_at IS NULL;

-- Create index for version tracking
CREATE INDEX IF NOT EXISTS idx_frameworks_source 
ON public.frameworks(source_framework_id) 
WHERE source_framework_id IS NOT NULL;

-- RLS: Allow clients to read frameworks shared by their coaching org
CREATE POLICY "Clients can view coach org shared frameworks"
ON public.frameworks
FOR SELECT
USING (
  -- System templates are public
  is_system_template = true
  OR
  -- Own company frameworks
  company_id = ((auth.jwt()->>'active_company_id')::uuid)
  OR
  -- Coach org frameworks shared to clients
  (
    owner_type = 'coach_org'
    AND status = 'published'
    AND marketplace_visibility = 'coach_org_clients'
    AND owner_company_id IN (
      SELECT coaching_org_company_id 
      FROM coaching_engagements 
      WHERE client_company_id = ((auth.jwt()->>'active_company_id')::uuid)
      AND archived_at IS NULL
    )
  )
);

-- Add comment for documentation
COMMENT ON COLUMN public.frameworks.marketplace_visibility IS 'Controls who can see this framework: private (owner only), coach_org_clients (visible to client companies in engagements)';
COMMENT ON COLUMN public.frameworks.short_summary IS 'Brief 1-2 line summary for marketplace display';
COMMENT ON COLUMN public.frameworks.published_at IS 'Timestamp when the framework was first published to marketplace';
COMMENT ON COLUMN public.frameworks.source_framework_id IS 'Reference to the parent framework this was cloned from (for versioning)';