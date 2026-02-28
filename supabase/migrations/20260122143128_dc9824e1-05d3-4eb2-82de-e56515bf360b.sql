-- ============================================================
-- Prompt 8: Content Library + LMS Integration + Program Resources
-- ============================================================

-- Enum for resource types
DO $$ BEGIN
  CREATE TYPE public.coaching_resource_type AS ENUM ('link', 'file', 'video', 'document', 'worksheet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Enum for resource status
DO $$ BEGIN
  CREATE TYPE public.coaching_resource_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Enum for assignable type
DO $$ BEGIN
  CREATE TYPE public.coaching_assignable_type AS ENUM ('resource', 'collection');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Enum for assignment status
DO $$ BEGIN
  CREATE TYPE public.coaching_assignment_status AS ENUM ('assigned', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Enum for progress status
DO $$ BEGIN
  CREATE TYPE public.coaching_progress_status AS ENUM ('not_started', 'viewed', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- 1) coaching_resources
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type public.coaching_resource_type NOT NULL,
  url TEXT,
  file_id UUID,
  tags TEXT[],
  program_key TEXT,
  status public.coaching_resource_status NOT NULL DEFAULT 'active',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_resources_org_status 
  ON public.coaching_resources(coaching_org_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_resources_org_program 
  ON public.coaching_resources(coaching_org_id, program_key);
-- ============================================================
-- 2) coaching_resource_collections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_resource_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  program_key TEXT,
  status public.coaching_resource_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coaching_org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_coaching_resource_collections_org_status 
  ON public.coaching_resource_collections(coaching_org_id, status);
-- ============================================================
-- 3) coaching_resource_collection_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_resource_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.coaching_resource_collections(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.coaching_resources(id) ON DELETE CASCADE,
  item_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, resource_id),
  UNIQUE(collection_id, item_order)
);
-- ============================================================
-- 4) coaching_resource_assignments
-- NOTE: Removed coaching_group_id reference since coaching_groups doesn't exist yet
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  coaching_engagement_id UUID REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  member_user_id UUID,
  assignable_type public.coaching_assignable_type NOT NULL,
  resource_id UUID REFERENCES public.coaching_resources(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.coaching_resource_collections(id) ON DELETE CASCADE,
  title_override TEXT,
  due_at TIMESTAMPTZ,
  status public.coaching_assignment_status NOT NULL DEFAULT 'assigned',
  assigned_by_user_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Enforce at least one target (engagement OR member_user)
  CONSTRAINT chk_one_target CHECK (
    coaching_engagement_id IS NOT NULL OR member_user_id IS NOT NULL
  ),
  
  -- Enforce matching assignable type
  CONSTRAINT chk_assignable_match CHECK (
    (assignable_type = 'resource' AND resource_id IS NOT NULL AND collection_id IS NULL) OR
    (assignable_type = 'collection' AND collection_id IS NOT NULL AND resource_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_coaching_resource_assignments_org_status 
  ON public.coaching_resource_assignments(coaching_org_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_resource_assignments_engagement 
  ON public.coaching_resource_assignments(coaching_engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_resource_assignments_user 
  ON public.coaching_resource_assignments(member_user_id, status);
-- ============================================================
-- 5) coaching_resource_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_resource_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.coaching_resource_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status public.coaching_progress_status NOT NULL DEFAULT 'not_started',
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);
-- ============================================================
-- Timestamp triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_coaching_resource_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_resources_updated
    BEFORE UPDATE ON public.coaching_resources
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_resource_collections_updated
    BEFORE UPDATE ON public.coaching_resource_collections
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_resource_collection_items_updated
    BEFORE UPDATE ON public.coaching_resource_collection_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_resource_assignments_updated
    BEFORE UPDATE ON public.coaching_resource_assignments
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_resource_progress_updated
    BEFORE UPDATE ON public.coaching_resource_progress
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS
ALTER TABLE public.coaching_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_resource_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_resource_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_resource_progress ENABLE ROW LEVEL SECURITY;
-- Helper: Check if user can access coaching org resources
CREATE OR REPLACE FUNCTION public.fn_can_access_coaching_org_resources(p_coaching_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Site admin can access all
  IF public.fn_is_site_admin(auth.uid()) THEN
    RETURN TRUE;
  END IF;
  
  -- Coaching org admin
  IF public.fn_is_coaching_org_admin(auth.uid(), p_coaching_org_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Manager in this org
  IF EXISTS (
    SELECT 1 FROM public.coaching_managers
    WHERE coaching_org_id = p_coaching_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Coach in this org
  IF EXISTS (
    SELECT 1 FROM public.coaching_coaches
    WHERE coaching_org_id = p_coaching_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Helper: Check if user can manage coaching org resources (admin/coach)
CREATE OR REPLACE FUNCTION public.fn_can_manage_coaching_org_resources(p_coaching_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Site admin
  IF public.fn_is_site_admin(auth.uid()) THEN
    RETURN TRUE;
  END IF;
  
  -- Coaching org admin
  IF public.fn_is_coaching_org_admin(auth.uid(), p_coaching_org_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Coach in this org (allowed by default per requirements)
  IF EXISTS (
    SELECT 1 FROM public.coaching_coaches
    WHERE coaching_org_id = p_coaching_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Helper: Check if user has assignment access (member view)
CREATE OR REPLACE FUNCTION public.fn_can_access_resource_assignment(p_assignment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment RECORD;
BEGIN
  SELECT * INTO v_assignment
  FROM public.coaching_resource_assignments
  WHERE id = p_assignment_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admin/manager/coach access
  IF public.fn_can_access_coaching_org_resources(v_assignment.coaching_org_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Direct user assignment
  IF v_assignment.member_user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;
  
  -- Engagement assignment - check if user is member of engagement's company
  IF v_assignment.coaching_engagement_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.coaching_org_engagements e
      JOIN public.memberships m ON m.company_id = e.member_company_id
      WHERE e.id = v_assignment.coaching_engagement_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- coaching_resources policies
CREATE POLICY "coaching_resources_select" ON public.coaching_resources
  FOR SELECT USING (public.fn_can_access_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resources_insert" ON public.coaching_resources
  FOR INSERT WITH CHECK (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resources_update" ON public.coaching_resources
  FOR UPDATE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resources_delete" ON public.coaching_resources
  FOR DELETE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
-- coaching_resource_collections policies
CREATE POLICY "coaching_resource_collections_select" ON public.coaching_resource_collections
  FOR SELECT USING (public.fn_can_access_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resource_collections_insert" ON public.coaching_resource_collections
  FOR INSERT WITH CHECK (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resource_collections_update" ON public.coaching_resource_collections
  FOR UPDATE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resource_collections_delete" ON public.coaching_resource_collections
  FOR DELETE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
-- coaching_resource_collection_items policies (inherit from collection)
CREATE POLICY "coaching_resource_collection_items_select" ON public.coaching_resource_collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_resource_collections c
      WHERE c.id = collection_id
        AND public.fn_can_access_coaching_org_resources(c.coaching_org_id)
    )
  );
CREATE POLICY "coaching_resource_collection_items_insert" ON public.coaching_resource_collection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_resource_collections c
      WHERE c.id = collection_id
        AND public.fn_can_manage_coaching_org_resources(c.coaching_org_id)
    )
  );
CREATE POLICY "coaching_resource_collection_items_update" ON public.coaching_resource_collection_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_resource_collections c
      WHERE c.id = collection_id
        AND public.fn_can_manage_coaching_org_resources(c.coaching_org_id)
    )
  );
CREATE POLICY "coaching_resource_collection_items_delete" ON public.coaching_resource_collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_resource_collections c
      WHERE c.id = collection_id
        AND public.fn_can_manage_coaching_org_resources(c.coaching_org_id)
    )
  );
-- coaching_resource_assignments policies
CREATE POLICY "coaching_resource_assignments_select" ON public.coaching_resource_assignments
  FOR SELECT USING (public.fn_can_access_resource_assignment(id));
CREATE POLICY "coaching_resource_assignments_insert" ON public.coaching_resource_assignments
  FOR INSERT WITH CHECK (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resource_assignments_update" ON public.coaching_resource_assignments
  FOR UPDATE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_resource_assignments_delete" ON public.coaching_resource_assignments
  FOR DELETE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
-- coaching_resource_progress policies
CREATE POLICY "coaching_resource_progress_select" ON public.coaching_resource_progress
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.coaching_resource_assignments a
      WHERE a.id = assignment_id
        AND public.fn_can_access_coaching_org_resources(a.coaching_org_id)
    )
  );
CREATE POLICY "coaching_resource_progress_insert" ON public.coaching_resource_progress
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    public.fn_can_access_resource_assignment(assignment_id)
  );
CREATE POLICY "coaching_resource_progress_update" ON public.coaching_resource_progress
  FOR UPDATE USING (user_id = auth.uid());
-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_resource_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_resource_collection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_resource_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_resource_progress TO authenticated;
