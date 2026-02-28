-- ============================================================
-- Prompt 9: Create Missing Enums and Tables
-- ============================================================

-- Template type enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.coaching_template_type AS ENUM ('link', 'document', 'worksheet', 'video', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Default assignee enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.coaching_default_assignee AS ENUM ('coach', 'member_admin', 'member_user', 'unassigned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Assignment type enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.coaching_assignment_type AS ENUM ('resource', 'task_set', 'project_blueprint', 'lms_item', 'form_request');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Instance status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.coaching_instance_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- B) COACHING ORG TEMPLATE LIBRARIES
-- ============================================================

-- 1) coaching_template_resources
CREATE TABLE IF NOT EXISTS public.coaching_template_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  template_type public.coaching_template_type NOT NULL,
  url TEXT,
  file_id UUID,
  tags TEXT[],
  program_key TEXT,
  status public.coaching_resource_status NOT NULL DEFAULT 'active',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_template_resources_org ON public.coaching_template_resources(coaching_org_id, status);
-- 2) coaching_template_task_sets
CREATE TABLE IF NOT EXISTS public.coaching_template_task_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  program_key TEXT,
  status public.coaching_resource_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_template_task_sets_org ON public.coaching_template_task_sets(coaching_org_id, status);
-- 3) coaching_template_tasks
CREATE TABLE IF NOT EXISTS public.coaching_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_set_id UUID NOT NULL REFERENCES public.coaching_template_task_sets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_offset_days INT DEFAULT 0,
  default_assignee public.coaching_default_assignee DEFAULT 'unassigned',
  task_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_template_tasks_set ON public.coaching_template_tasks(task_set_id);
-- ============================================================
-- C) UNIFIED ASSIGNMENT MODEL
-- ============================================================

-- 1) coaching_assignments (unified)
CREATE TABLE IF NOT EXISTS public.coaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  coaching_engagement_id UUID REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  member_user_id UUID,
  assignment_type public.coaching_assignment_type NOT NULL,
  template_id UUID,
  title_override TEXT,
  due_at TIMESTAMPTZ,
  status public.coaching_assignment_status NOT NULL DEFAULT 'assigned',
  assigned_by_user_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  legacy_assignment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT chk_assignment_target CHECK (
    coaching_engagement_id IS NOT NULL OR member_user_id IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_coaching_assignments_org ON public.coaching_assignments(coaching_org_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_assignments_engagement ON public.coaching_assignments(coaching_engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_assignments_user ON public.coaching_assignments(member_user_id, status);
-- 2) coaching_assignment_instances
CREATE TABLE IF NOT EXISTS public.coaching_assignment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_assignment_id UUID NOT NULL REFERENCES public.coaching_assignments(id) ON DELETE CASCADE,
  member_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_table TEXT NOT NULL,
  created_id UUID NOT NULL,
  status public.coaching_instance_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_assignment_instances_assignment ON public.coaching_assignment_instances(coaching_assignment_id);
CREATE INDEX IF NOT EXISTS idx_coaching_assignment_instances_entity ON public.coaching_assignment_instances(created_table, created_id);
-- ============================================================
-- D) MIGRATE FROM PROMPT 8 TABLES
-- ============================================================

ALTER TABLE public.coaching_resources ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;
ALTER TABLE public.coaching_resource_collections ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;
ALTER TABLE public.coaching_resource_assignments ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;
ALTER TABLE public.coaching_resource_progress ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;
-- Migrate resources
INSERT INTO public.coaching_template_resources (
  id, coaching_org_id, title, description, template_type, url, file_id, tags, 
  program_key, status, created_by_user_id, created_at, updated_at
)
SELECT 
  id, coaching_org_id, title, description,
  CASE resource_type 
    WHEN 'link' THEN 'link'::public.coaching_template_type
    WHEN 'video' THEN 'video'::public.coaching_template_type
    WHEN 'document' THEN 'document'::public.coaching_template_type
    WHEN 'worksheet' THEN 'worksheet'::public.coaching_template_type
    ELSE 'file'::public.coaching_template_type
  END,
  url, file_id, tags, program_key, status, created_by_user_id, created_at, updated_at
FROM public.coaching_resources
WHERE deprecated_at IS NULL
ON CONFLICT (id) DO NOTHING;
-- Migrate assignments
INSERT INTO public.coaching_assignments (
  coaching_org_id, coaching_engagement_id, member_user_id,
  assignment_type, template_id, title_override, due_at, status,
  assigned_by_user_id, assigned_at, completed_at, legacy_assignment_id,
  created_at, updated_at
)
SELECT 
  a.coaching_org_id, a.coaching_engagement_id, a.member_user_id,
  'resource'::public.coaching_assignment_type,
  COALESCE(a.resource_id, a.collection_id),
  a.title_override, a.due_at, a.status,
  a.assigned_by_user_id, a.assigned_at, a.completed_at, a.id,
  a.created_at, a.updated_at
FROM public.coaching_resource_assignments a
WHERE a.deprecated_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM public.coaching_assignments ca WHERE ca.legacy_assignment_id = a.id
);
-- Mark as deprecated
UPDATE public.coaching_resources SET deprecated_at = now() WHERE deprecated_at IS NULL;
UPDATE public.coaching_resource_collections SET deprecated_at = now() WHERE deprecated_at IS NULL;
UPDATE public.coaching_resource_assignments SET deprecated_at = now() WHERE deprecated_at IS NULL;
UPDATE public.coaching_resource_progress SET deprecated_at = now() WHERE deprecated_at IS NULL;
-- Extend access_grants
ALTER TABLE public.access_grants 
  ADD COLUMN IF NOT EXISTS coaching_scoped_only BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_non_scoped_create BOOLEAN DEFAULT false;
-- ============================================================
-- TRIGGERS
-- ============================================================

DO $$ BEGIN
  CREATE TRIGGER trg_coaching_template_resources_updated
    BEFORE UPDATE ON public.coaching_template_resources
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_template_task_sets_updated
    BEFORE UPDATE ON public.coaching_template_task_sets
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_template_tasks_updated
    BEFORE UPDATE ON public.coaching_template_tasks
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_assignments_updated
    BEFORE UPDATE ON public.coaching_assignments
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_coaching_assignment_instances_updated
    BEFORE UPDATE ON public.coaching_assignment_instances
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_coaching_resource_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.coaching_template_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_template_task_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_assignment_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaching_template_resources_select" ON public.coaching_template_resources
  FOR SELECT USING (public.fn_can_access_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_resources_insert" ON public.coaching_template_resources
  FOR INSERT WITH CHECK (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_resources_update" ON public.coaching_template_resources
  FOR UPDATE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_resources_delete" ON public.coaching_template_resources
  FOR DELETE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_task_sets_select" ON public.coaching_template_task_sets
  FOR SELECT USING (public.fn_can_access_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_task_sets_insert" ON public.coaching_template_task_sets
  FOR INSERT WITH CHECK (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_task_sets_update" ON public.coaching_template_task_sets
  FOR UPDATE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_task_sets_delete" ON public.coaching_template_task_sets
  FOR DELETE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_template_tasks_select" ON public.coaching_template_tasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.coaching_template_task_sets ts WHERE ts.id = task_set_id AND public.fn_can_access_coaching_org_resources(ts.coaching_org_id)));
CREATE POLICY "coaching_template_tasks_insert" ON public.coaching_template_tasks
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.coaching_template_task_sets ts WHERE ts.id = task_set_id AND public.fn_can_manage_coaching_org_resources(ts.coaching_org_id)));
CREATE POLICY "coaching_template_tasks_update" ON public.coaching_template_tasks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.coaching_template_task_sets ts WHERE ts.id = task_set_id AND public.fn_can_manage_coaching_org_resources(ts.coaching_org_id)));
CREATE POLICY "coaching_template_tasks_delete" ON public.coaching_template_tasks
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.coaching_template_task_sets ts WHERE ts.id = task_set_id AND public.fn_can_manage_coaching_org_resources(ts.coaching_org_id)));
CREATE POLICY "coaching_assignments_select" ON public.coaching_assignments
  FOR SELECT USING (
    public.fn_can_access_coaching_org_resources(coaching_org_id) OR
    member_user_id = auth.uid() OR
    (coaching_engagement_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.coaching_org_engagements e
      JOIN public.memberships m ON m.company_id = e.member_company_id
      WHERE e.id = coaching_engagement_id AND m.user_id = auth.uid() AND m.status = 'active'
    ))
  );
CREATE POLICY "coaching_assignments_insert" ON public.coaching_assignments
  FOR INSERT WITH CHECK (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_assignments_update" ON public.coaching_assignments
  FOR UPDATE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_assignments_delete" ON public.coaching_assignments
  FOR DELETE USING (public.fn_can_manage_coaching_org_resources(coaching_org_id));
CREATE POLICY "coaching_assignment_instances_select" ON public.coaching_assignment_instances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.coaching_assignments a WHERE a.id = coaching_assignment_id AND public.fn_can_access_coaching_org_resources(a.coaching_org_id))
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.company_id = member_company_id AND m.user_id = auth.uid() AND m.status = 'active')
  );
CREATE POLICY "coaching_assignment_instances_insert" ON public.coaching_assignment_instances
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.coaching_assignments a WHERE a.id = coaching_assignment_id AND public.fn_can_manage_coaching_org_resources(a.coaching_org_id)));
CREATE POLICY "coaching_assignment_instances_update" ON public.coaching_assignment_instances
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.coaching_assignments a WHERE a.id = coaching_assignment_id AND public.fn_can_manage_coaching_org_resources(a.coaching_org_id))
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.company_id = member_company_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role = 'company_admin')
  );
-- Make Prompt 8 tables READ-ONLY
DROP POLICY IF EXISTS "coaching_resources_insert" ON public.coaching_resources;
DROP POLICY IF EXISTS "coaching_resources_update" ON public.coaching_resources;
DROP POLICY IF EXISTS "coaching_resources_delete" ON public.coaching_resources;
DROP POLICY IF EXISTS "coaching_resource_collections_insert" ON public.coaching_resource_collections;
DROP POLICY IF EXISTS "coaching_resource_collections_update" ON public.coaching_resource_collections;
DROP POLICY IF EXISTS "coaching_resource_collections_delete" ON public.coaching_resource_collections;
DROP POLICY IF EXISTS "coaching_resource_assignments_insert" ON public.coaching_resource_assignments;
DROP POLICY IF EXISTS "coaching_resource_assignments_update" ON public.coaching_resource_assignments;
DROP POLICY IF EXISTS "coaching_resource_assignments_delete" ON public.coaching_resource_assignments;
DROP POLICY IF EXISTS "coaching_resource_progress_insert" ON public.coaching_resource_progress;
DROP POLICY IF EXISTS "coaching_resource_progress_update" ON public.coaching_resource_progress;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_template_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_template_task_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_template_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_assignment_instances TO authenticated;
