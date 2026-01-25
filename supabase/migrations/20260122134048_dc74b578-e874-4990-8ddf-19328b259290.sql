-- ============================================================
-- COACHES MODULE RLS RETROFIT - PROMPT 2
-- Helper Functions + RLS Policies for Coaching Hierarchy
-- ============================================================

-- ============================================================
-- A) HELPER FUNCTIONS (Authorization Building Blocks)
-- ============================================================

-- 1) fn_current_user_id() -> uuid
CREATE OR REPLACE FUNCTION public.fn_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- 2) fn_active_company_id() -> uuid
CREATE OR REPLACE FUNCTION public.fn_active_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
$$;

-- 3) fn_is_site_admin(user_id uuid) -> boolean
CREATE OR REPLACE FUNCTION public.fn_is_site_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.site_memberships sm
    WHERE sm.user_id = _user_id 
      AND sm.role = 'super_admin'
  )
$$;

-- 4) fn_is_company_admin(user_id uuid, company_id uuid) -> boolean
-- FIXED: Use 'company_admin' instead of 'admin'
CREATE OR REPLACE FUNCTION public.fn_is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.user_id = _user_id 
      AND m.company_id = _company_id 
      AND m.role = 'company_admin'
  )
$$;

-- 5) fn_user_coaching_org_ids(user_id uuid) -> setof uuid
CREATE OR REPLACE FUNCTION public.fn_user_coaching_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coaching_org_id FROM public.coaching_org_memberships
  WHERE user_id = _user_id AND status = 'active'
  UNION
  SELECT coaching_org_id FROM public.coaching_managers
  WHERE user_id = _user_id AND status = 'active'
  UNION
  SELECT coaching_org_id FROM public.coaching_coaches
  WHERE user_id = _user_id AND status = 'active'
$$;

-- 6) fn_is_coaching_org_admin(user_id uuid, coaching_org_id uuid) -> boolean
CREATE OR REPLACE FUNCTION public.fn_is_coaching_org_admin(_user_id uuid, _coaching_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.fn_is_site_admin(_user_id)
    OR EXISTS (
      SELECT 1 
      FROM public.coaching_org_memberships com
      WHERE com.user_id = _user_id 
        AND com.coaching_org_id = _coaching_org_id
        AND com.role = 'org_admin'
        AND com.status = 'active'
    )
$$;

-- 7) fn_is_coaching_manager(user_id uuid, coaching_org_id uuid) -> boolean
CREATE OR REPLACE FUNCTION public.fn_is_coaching_manager(_user_id uuid, _coaching_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.fn_is_coaching_org_admin(_user_id, _coaching_org_id)
    OR EXISTS (
      SELECT 1 
      FROM public.coaching_managers cm
      WHERE cm.user_id = _user_id 
        AND cm.coaching_org_id = _coaching_org_id
        AND cm.status = 'active'
    )
$$;

-- 8) fn_is_coach(user_id uuid, coaching_org_id uuid) -> boolean
CREATE OR REPLACE FUNCTION public.fn_is_coach(_user_id uuid, _coaching_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.fn_is_coaching_manager(_user_id, _coaching_org_id)
    OR EXISTS (
      SELECT 1 
      FROM public.coaching_coaches cc
      WHERE cc.user_id = _user_id 
        AND cc.coaching_org_id = _coaching_org_id
        AND cc.status = 'active'
    )
$$;

-- 9) fn_manager_coach_ids(user_id uuid, coaching_org_id uuid) -> setof uuid
CREATE OR REPLACE FUNCTION public.fn_manager_coach_ids(_user_id uuid, _coaching_org_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cc.id 
  FROM public.coaching_coaches cc
  WHERE cc.coaching_org_id = _coaching_org_id
    AND cc.status = 'active'
    AND public.fn_is_coaching_org_admin(_user_id, _coaching_org_id)
  UNION
  SELECT cma.coach_id
  FROM public.coaching_manager_assignments cma
  JOIN public.coaching_managers cm ON cm.id = cma.manager_id
  WHERE cm.user_id = _user_id
    AND cm.coaching_org_id = _coaching_org_id
    AND cm.status = 'active'
    AND cma.status = 'active'
$$;

-- 10) fn_user_coach_ids(user_id uuid, coaching_org_id uuid) -> setof uuid
CREATE OR REPLACE FUNCTION public.fn_user_coach_ids(_user_id uuid, _coaching_org_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cc.id 
  FROM public.coaching_coaches cc
  WHERE cc.user_id = _user_id
    AND cc.coaching_org_id = _coaching_org_id
    AND cc.status = 'active'
  UNION
  SELECT * FROM public.fn_manager_coach_ids(_user_id, _coaching_org_id)
$$;

-- 11) fn_user_engagement_ids(user_id uuid, coaching_org_id uuid) -> setof uuid
CREATE OR REPLACE FUNCTION public.fn_user_engagement_ids(_user_id uuid, _coaching_org_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coe.id 
  FROM public.coaching_org_engagements coe
  WHERE coe.coaching_org_id = _coaching_org_id
    AND coe.status IN ('active', 'suspended')
    AND public.fn_is_coaching_org_admin(_user_id, _coaching_org_id)
  UNION
  SELECT coea.coaching_engagement_id
  FROM public.coaching_org_engagement_assignments coea
  JOIN public.coaching_org_engagements coe ON coe.id = coea.coaching_engagement_id
  WHERE coea.coach_id IN (SELECT * FROM public.fn_user_coach_ids(_user_id, _coaching_org_id))
    AND coea.status = 'active'
    AND coe.status IN ('active', 'suspended')
$$;

-- 12) fn_has_grant -> boolean
CREATE OR REPLACE FUNCTION public.fn_has_grant(
  _user_id uuid,
  _company_id uuid,
  _module text,
  _min_role text,
  _source_engagement_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_order text[] := ARRAY['none', 'read', 'comment', 'write', 'admin'];
  min_role_idx int;
BEGIN
  min_role_idx := array_position(role_order, _min_role);
  IF min_role_idx IS NULL THEN
    min_role_idx := 1;
  END IF;
  
  IF _source_engagement_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coaching_org_engagements
      WHERE id = _source_engagement_id
        AND status IN ('active', 'suspended')
    ) THEN
      RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
      SELECT 1 
      FROM public.access_grants ag
      WHERE ag.grantor_company_id = _company_id
        AND ag.grantee_user_id = _user_id
        AND ag.module::text = _module
        AND ag.status = 'active'
        AND ag.source_type = 'coaching_engagement'
        AND ag.source_id = _source_engagement_id
        AND array_position(role_order, ag.role::text) >= min_role_idx
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 
      FROM public.access_grants ag
      WHERE ag.grantor_company_id = _company_id
        AND ag.grantee_user_id = _user_id
        AND ag.module::text = _module
        AND ag.status = 'active'
        AND array_position(role_order, ag.role::text) >= min_role_idx
    );
  END IF;
END;
$$;

-- 13) fn_grant_constraints -> jsonb
CREATE OR REPLACE FUNCTION public.fn_grant_constraints(
  _user_id uuid,
  _company_id uuid,
  _module text,
  _source_engagement_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ag.constraints, '{"coaching_scoped_only": true}'::jsonb)
  FROM public.access_grants ag
  WHERE ag.grantor_company_id = _company_id
    AND ag.grantee_user_id = _user_id
    AND ag.module::text = _module
    AND ag.status = 'active'
    AND ag.source_type = 'coaching_engagement'
    AND ag.source_id = _source_engagement_id
  ORDER BY 
    CASE ag.role 
      WHEN 'admin' THEN 5
      WHEN 'write' THEN 4
      WHEN 'comment' THEN 3
      WHEN 'read' THEN 2
      ELSE 1
    END DESC
  LIMIT 1
$$;

-- 14) fn_coaching_scoped_only -> boolean
CREATE OR REPLACE FUNCTION public.fn_coaching_scoped_only(
  _user_id uuid,
  _company_id uuid,
  _module text,
  _source_engagement_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (public.fn_grant_constraints(_user_id, _company_id, _module, _source_engagement_id)->>'coaching_scoped_only')::boolean,
    true
  )
$$;

-- Helper: Check if user is member of a company
CREATE OR REPLACE FUNCTION public.fn_is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.user_id = _user_id 
      AND m.company_id = _company_id
  )
$$;

-- Helper: Get coaching org ID from a company
CREATE OR REPLACE FUNCTION public.fn_get_coaching_org_id(_company_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.coaching_orgs WHERE company_id = _company_id LIMIT 1
$$;

-- Helper: Check if user can access engagement
CREATE OR REPLACE FUNCTION public.fn_can_access_engagement(_user_id uuid, _engagement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coaching_org_engagements coe
    JOIN public.coaching_orgs co ON co.id = coe.coaching_org_id
    WHERE coe.id = _engagement_id
      AND coe.status IN ('active', 'suspended')
      AND coe.id IN (SELECT public.fn_user_engagement_ids(_user_id, coe.coaching_org_id))
  )
$$;

-- Helper function to check coaching cross-tenant access
CREATE OR REPLACE FUNCTION public.fn_has_coaching_access(
  _user_id uuid,
  _company_id uuid,
  _engagement_id uuid,
  _module text,
  _min_role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _engagement_id IS NOT NULL
    AND public.fn_can_access_engagement(_user_id, _engagement_id)
    AND public.fn_has_grant(_user_id, _company_id, _module, _min_role, _engagement_id)
$$;

-- ============================================================
-- B) ENABLE RLS ON COACHING TABLES
-- ============================================================

ALTER TABLE public.coaching_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_org_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_org_engagement_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_org_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_org_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_engagement_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- C) RLS POLICIES
-- ============================================================

-- 1) coaching_orgs
DROP POLICY IF EXISTS "coaching_orgs_select" ON public.coaching_orgs;
DROP POLICY IF EXISTS "coaching_orgs_insert" ON public.coaching_orgs;
DROP POLICY IF EXISTS "coaching_orgs_update" ON public.coaching_orgs;
DROP POLICY IF EXISTS "coaching_orgs_delete" ON public.coaching_orgs;

CREATE POLICY "coaching_orgs_select" ON public.coaching_orgs
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR id IN (SELECT public.fn_user_coaching_org_ids(auth.uid()))
);

CREATE POLICY "coaching_orgs_insert" ON public.coaching_orgs
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "coaching_orgs_update" ON public.coaching_orgs
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), id)
);

CREATE POLICY "coaching_orgs_delete" ON public.coaching_orgs
FOR DELETE USING (public.fn_is_site_admin(auth.uid()));

-- 2) coaching_org_memberships
DROP POLICY IF EXISTS "coaching_org_memberships_select" ON public.coaching_org_memberships;
DROP POLICY IF EXISTS "coaching_org_memberships_insert" ON public.coaching_org_memberships;
DROP POLICY IF EXISTS "coaching_org_memberships_update" ON public.coaching_org_memberships;
DROP POLICY IF EXISTS "coaching_org_memberships_delete" ON public.coaching_org_memberships;

CREATE POLICY "coaching_org_memberships_select" ON public.coaching_org_memberships
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR user_id = auth.uid()
);

CREATE POLICY "coaching_org_memberships_insert" ON public.coaching_org_memberships
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_org_memberships_update" ON public.coaching_org_memberships
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_org_memberships_delete" ON public.coaching_org_memberships
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- 3) coaching_managers
DROP POLICY IF EXISTS "coaching_managers_select" ON public.coaching_managers;
DROP POLICY IF EXISTS "coaching_managers_insert" ON public.coaching_managers;
DROP POLICY IF EXISTS "coaching_managers_update" ON public.coaching_managers;
DROP POLICY IF EXISTS "coaching_managers_delete" ON public.coaching_managers;

CREATE POLICY "coaching_managers_select" ON public.coaching_managers
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR user_id = auth.uid()
);

CREATE POLICY "coaching_managers_insert" ON public.coaching_managers
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_managers_update" ON public.coaching_managers
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_managers_delete" ON public.coaching_managers
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- 4) coaching_coaches
DROP POLICY IF EXISTS "coaching_coaches_select" ON public.coaching_coaches;
DROP POLICY IF EXISTS "coaching_coaches_insert" ON public.coaching_coaches;
DROP POLICY IF EXISTS "coaching_coaches_update" ON public.coaching_coaches;
DROP POLICY IF EXISTS "coaching_coaches_delete" ON public.coaching_coaches;

CREATE POLICY "coaching_coaches_select" ON public.coaching_coaches
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR user_id = auth.uid()
  OR id IN (SELECT public.fn_manager_coach_ids(auth.uid(), coaching_org_id))
);

CREATE POLICY "coaching_coaches_insert" ON public.coaching_coaches
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_coaches_update" ON public.coaching_coaches
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_coaches_delete" ON public.coaching_coaches
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- 5) coaching_manager_assignments
DROP POLICY IF EXISTS "coaching_manager_assignments_select" ON public.coaching_manager_assignments;
DROP POLICY IF EXISTS "coaching_manager_assignments_insert" ON public.coaching_manager_assignments;
DROP POLICY IF EXISTS "coaching_manager_assignments_update" ON public.coaching_manager_assignments;
DROP POLICY IF EXISTS "coaching_manager_assignments_delete" ON public.coaching_manager_assignments;

CREATE POLICY "coaching_manager_assignments_select" ON public.coaching_manager_assignments
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR manager_id IN (SELECT id FROM public.coaching_managers WHERE user_id = auth.uid())
  OR coach_id IN (SELECT id FROM public.coaching_coaches WHERE user_id = auth.uid())
);

CREATE POLICY "coaching_manager_assignments_insert" ON public.coaching_manager_assignments
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_manager_assignments_update" ON public.coaching_manager_assignments
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_manager_assignments_delete" ON public.coaching_manager_assignments
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- 6) coaching_org_engagements
DROP POLICY IF EXISTS "coaching_org_engagements_select" ON public.coaching_org_engagements;
DROP POLICY IF EXISTS "coaching_org_engagements_insert" ON public.coaching_org_engagements;
DROP POLICY IF EXISTS "coaching_org_engagements_update" ON public.coaching_org_engagements;
DROP POLICY IF EXISTS "coaching_org_engagements_delete" ON public.coaching_org_engagements;

CREATE POLICY "coaching_org_engagements_select" ON public.coaching_org_engagements
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR id IN (SELECT public.fn_user_engagement_ids(auth.uid(), coaching_org_id))
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), member_company_id))
);

CREATE POLICY "coaching_org_engagements_insert" ON public.coaching_org_engagements
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_org_engagements_update" ON public.coaching_org_engagements
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), member_company_id))
);

CREATE POLICY "coaching_org_engagements_delete" ON public.coaching_org_engagements
FOR DELETE USING (public.fn_is_site_admin(auth.uid()));

-- 7) coaching_org_engagement_assignments
DROP POLICY IF EXISTS "coaching_org_engagement_assignments_select" ON public.coaching_org_engagement_assignments;
DROP POLICY IF EXISTS "coaching_org_engagement_assignments_insert" ON public.coaching_org_engagement_assignments;
DROP POLICY IF EXISTS "coaching_org_engagement_assignments_update" ON public.coaching_org_engagement_assignments;
DROP POLICY IF EXISTS "coaching_org_engagement_assignments_delete" ON public.coaching_org_engagement_assignments;

CREATE POLICY "coaching_org_engagement_assignments_select" ON public.coaching_org_engagement_assignments
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND (
        public.fn_is_coaching_org_admin(auth.uid(), coe.coaching_org_id)
        OR coaching_engagement_id IN (SELECT public.fn_user_engagement_ids(auth.uid(), coe.coaching_org_id))
        OR (coe.member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), coe.member_company_id))
      )
  )
);

CREATE POLICY "coaching_org_engagement_assignments_insert" ON public.coaching_org_engagement_assignments
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND public.fn_is_coaching_org_admin(auth.uid(), coe.coaching_org_id)
  )
);

CREATE POLICY "coaching_org_engagement_assignments_update" ON public.coaching_org_engagement_assignments
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND public.fn_is_coaching_org_admin(auth.uid(), coe.coaching_org_id)
  )
);

CREATE POLICY "coaching_org_engagement_assignments_delete" ON public.coaching_org_engagement_assignments
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND public.fn_is_coaching_org_admin(auth.uid(), coe.coaching_org_id)
  )
);

-- 8) coaching_org_groups
DROP POLICY IF EXISTS "coaching_org_groups_select" ON public.coaching_org_groups;
DROP POLICY IF EXISTS "coaching_org_groups_insert" ON public.coaching_org_groups;
DROP POLICY IF EXISTS "coaching_org_groups_update" ON public.coaching_org_groups;
DROP POLICY IF EXISTS "coaching_org_groups_delete" ON public.coaching_org_groups;

CREATE POLICY "coaching_org_groups_select" ON public.coaching_org_groups
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR coach_id IN (SELECT public.fn_user_coach_ids(auth.uid(), coaching_org_id))
);

CREATE POLICY "coaching_org_groups_insert" ON public.coaching_org_groups
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR coach_id IN (SELECT id FROM public.coaching_coaches WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "coaching_org_groups_update" ON public.coaching_org_groups
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR coach_id IN (SELECT id FROM public.coaching_coaches WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "coaching_org_groups_delete" ON public.coaching_org_groups
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- 9) coaching_org_group_members
DROP POLICY IF EXISTS "coaching_org_group_members_select" ON public.coaching_org_group_members;
DROP POLICY IF EXISTS "coaching_org_group_members_insert" ON public.coaching_org_group_members;
DROP POLICY IF EXISTS "coaching_org_group_members_update" ON public.coaching_org_group_members;
DROP POLICY IF EXISTS "coaching_org_group_members_delete" ON public.coaching_org_group_members;

CREATE POLICY "coaching_org_group_members_select" ON public.coaching_org_group_members
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_groups cog
    WHERE cog.id = coaching_group_id
      AND (
        public.fn_is_coaching_org_admin(auth.uid(), cog.coaching_org_id)
        OR cog.coach_id IN (SELECT public.fn_user_coach_ids(auth.uid(), cog.coaching_org_id))
      )
  )
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), member_company_id))
);

CREATE POLICY "coaching_org_group_members_insert" ON public.coaching_org_group_members
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_groups cog
    WHERE cog.id = coaching_group_id
      AND (
        public.fn_is_coaching_org_admin(auth.uid(), cog.coaching_org_id)
        OR cog.coach_id IN (SELECT id FROM public.coaching_coaches WHERE user_id = auth.uid() AND status = 'active')
      )
  )
);

CREATE POLICY "coaching_org_group_members_update" ON public.coaching_org_group_members
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_groups cog
    WHERE cog.id = coaching_group_id
      AND (
        public.fn_is_coaching_org_admin(auth.uid(), cog.coaching_org_id)
        OR cog.coach_id IN (SELECT id FROM public.coaching_coaches WHERE user_id = auth.uid() AND status = 'active')
      )
  )
);

CREATE POLICY "coaching_org_group_members_delete" ON public.coaching_org_group_members
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_groups cog
    WHERE cog.id = coaching_group_id
      AND (
        public.fn_is_coaching_org_admin(auth.uid(), cog.coaching_org_id)
        OR cog.coach_id IN (SELECT id FROM public.coaching_coaches WHERE user_id = auth.uid() AND status = 'active')
      )
  )
);

-- 10) coaching_permission_templates
DROP POLICY IF EXISTS "coaching_permission_templates_select" ON public.coaching_permission_templates;
DROP POLICY IF EXISTS "coaching_permission_templates_insert" ON public.coaching_permission_templates;
DROP POLICY IF EXISTS "coaching_permission_templates_update" ON public.coaching_permission_templates;
DROP POLICY IF EXISTS "coaching_permission_templates_delete" ON public.coaching_permission_templates;

CREATE POLICY "coaching_permission_templates_select" ON public.coaching_permission_templates
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_permission_templates_insert" ON public.coaching_permission_templates
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_permission_templates_update" ON public.coaching_permission_templates
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_permission_templates_delete" ON public.coaching_permission_templates
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- 11) coaching_engagement_onboarding
DROP POLICY IF EXISTS "coaching_engagement_onboarding_select" ON public.coaching_engagement_onboarding;
DROP POLICY IF EXISTS "coaching_engagement_onboarding_insert" ON public.coaching_engagement_onboarding;
DROP POLICY IF EXISTS "coaching_engagement_onboarding_update" ON public.coaching_engagement_onboarding;

CREATE POLICY "coaching_engagement_onboarding_select" ON public.coaching_engagement_onboarding
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), member_company_id))
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND public.fn_is_coaching_org_admin(auth.uid(), coe.coaching_org_id)
  )
);

CREATE POLICY "coaching_engagement_onboarding_insert" ON public.coaching_engagement_onboarding
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND public.fn_is_coaching_org_admin(auth.uid(), coe.coaching_org_id)
  )
);

CREATE POLICY "coaching_engagement_onboarding_update" ON public.coaching_engagement_onboarding
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), member_company_id))
);

-- 12) access_grants
DROP POLICY IF EXISTS "access_grants_select" ON public.access_grants;
DROP POLICY IF EXISTS "access_grants_insert" ON public.access_grants;
DROP POLICY IF EXISTS "access_grants_update" ON public.access_grants;
DROP POLICY IF EXISTS "access_grants_delete" ON public.access_grants;

CREATE POLICY "access_grants_select" ON public.access_grants
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR (grantor_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), grantor_company_id))
  OR grantee_user_id = auth.uid()
  OR (
    source_type = 'coaching_engagement'
    AND source_id IS NOT NULL
    AND public.fn_can_access_engagement(auth.uid(), source_id)
  )
);

CREATE POLICY "access_grants_insert" ON public.access_grants
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR (grantor_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), grantor_company_id))
);

CREATE POLICY "access_grants_update" ON public.access_grants
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR (grantor_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), grantor_company_id))
);

CREATE POLICY "access_grants_delete" ON public.access_grants
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR (grantor_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), grantor_company_id))
);

-- ============================================================
-- D) CROSS-MODULE COACHING ACCESS (Tasks/Projects/Notes)
-- ============================================================

DROP POLICY IF EXISTS "tasks_coaching_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_coaching_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_coaching_update" ON public.tasks;

CREATE POLICY "tasks_coaching_select" ON public.tasks
FOR SELECT USING (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'tasks', 'read')
  )
);

CREATE POLICY "tasks_coaching_insert" ON public.tasks
FOR INSERT WITH CHECK (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'tasks', 'write')
  )
);

CREATE POLICY "tasks_coaching_update" ON public.tasks
FOR UPDATE USING (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'tasks', 'write')
  )
);

DROP POLICY IF EXISTS "projects_coaching_select" ON public.projects;
DROP POLICY IF EXISTS "projects_coaching_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_coaching_update" ON public.projects;

CREATE POLICY "projects_coaching_select" ON public.projects
FOR SELECT USING (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'projects', 'read')
  )
);

CREATE POLICY "projects_coaching_insert" ON public.projects
FOR INSERT WITH CHECK (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'projects', 'write')
  )
);

CREATE POLICY "projects_coaching_update" ON public.projects
FOR UPDATE USING (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'projects', 'write')
  )
);

DROP POLICY IF EXISTS "notes_coaching_select" ON public.notes;
DROP POLICY IF EXISTS "notes_coaching_insert" ON public.notes;
DROP POLICY IF EXISTS "notes_coaching_update" ON public.notes;

CREATE POLICY "notes_coaching_select" ON public.notes
FOR SELECT USING (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'notes', 'read')
  )
);

CREATE POLICY "notes_coaching_insert" ON public.notes
FOR INSERT WITH CHECK (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'notes', 'write')
  )
);

CREATE POLICY "notes_coaching_update" ON public.notes
FOR UPDATE USING (
  company_id = public.fn_active_company_id()
  OR public.fn_is_site_admin(auth.uid())
  OR (
    coaching_engagement_id IS NOT NULL
    AND public.fn_has_coaching_access(auth.uid(), company_id, coaching_engagement_id, 'notes', 'write')
  )
);

-- ============================================================
-- E) DELEGATED PROVISIONING (Companies)
-- ============================================================

DROP POLICY IF EXISTS "companies_coaching_org_select" ON public.companies;
DROP POLICY IF EXISTS "companies_coaching_org_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_coaching_org_update" ON public.companies;

CREATE POLICY "companies_coaching_org_select" ON public.companies
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_company_member(auth.uid(), id)
  OR (
    created_by_coaching_org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.coaching_orgs co
      WHERE co.id = created_by_coaching_org_id
        AND public.fn_is_coaching_org_admin(auth.uid(), co.id)
    )
  )
);

CREATE POLICY "companies_coaching_org_insert" ON public.companies
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR (
    company_type = 'standard'
    AND created_by_coaching_org_id IS NOT NULL
    AND onboarding_source = 'created_by_coaching_org'
    AND EXISTS (
      SELECT 1 FROM public.coaching_orgs co
      WHERE co.id = created_by_coaching_org_id
        AND public.fn_is_coaching_org_admin(auth.uid(), co.id)
    )
  )
);

CREATE POLICY "companies_coaching_org_update" ON public.companies
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_company_admin(auth.uid(), id)
  OR (
    created_by_coaching_org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.coaching_orgs co
      WHERE co.id = created_by_coaching_org_id
        AND public.fn_is_coaching_org_admin(auth.uid(), co.id)
    )
  )
);

-- ============================================================
-- F) AUTO-GRANT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_create_default_coaching_grants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coach_user_ids uuid[];
  coach_user_id uuid;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT array_agg(DISTINCT cc.user_id)
    INTO coach_user_ids
    FROM public.coaching_org_engagement_assignments coea
    JOIN public.coaching_coaches cc ON cc.id = coea.coach_id
    WHERE coea.coaching_engagement_id = NEW.id
      AND coea.status = 'active';
    
    SELECT array_agg(DISTINCT user_id) || COALESCE(coach_user_ids, ARRAY[]::uuid[])
    INTO coach_user_ids
    FROM (
      SELECT user_id FROM public.coaching_org_memberships
      WHERE coaching_org_id = NEW.coaching_org_id AND status = 'active'
      UNION
      SELECT user_id FROM public.coaching_managers
      WHERE coaching_org_id = NEW.coaching_org_id AND status = 'active'
    ) users;
    
    IF coach_user_ids IS NOT NULL THEN
      FOREACH coach_user_id IN ARRAY coach_user_ids
      LOOP
        INSERT INTO public.access_grants (
          grantor_company_id, grantee_user_id, source_type, source_id,
          module, role, constraints, status
        ) VALUES (
          NEW.member_company_id, coach_user_id, 'coaching_engagement', NEW.id,
          'coaching', 'admin', '{"coaching_scoped_only": true}'::jsonb, 'active'
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO public.access_grants (
          grantor_company_id, grantee_user_id, source_type, source_id,
          module, role, constraints, status
        ) VALUES (
          NEW.member_company_id, coach_user_id, 'coaching_engagement', NEW.id,
          'tasks', 'write', '{"coaching_scoped_only": true}'::jsonb, 'active'
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO public.access_grants (
          grantor_company_id, grantee_user_id, source_type, source_id,
          module, role, constraints, status
        ) VALUES (
          NEW.member_company_id, coach_user_id, 'coaching_engagement', NEW.id,
          'projects', 'write', '{"coaching_scoped_only": true}'::jsonb, 'active'
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO public.access_grants (
          grantor_company_id, grantee_user_id, source_type, source_id,
          module, role, constraints, status
        ) VALUES (
          NEW.member_company_id, coach_user_id, 'coaching_engagement', NEW.id,
          'notes', 'write', '{"coaching_scoped_only": true}'::jsonb, 'active'
        ) ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_coaching_grants ON public.coaching_org_engagements;
CREATE TRIGGER trg_create_default_coaching_grants
  AFTER INSERT ON public.coaching_org_engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_default_coaching_grants();

CREATE OR REPLACE FUNCTION public.fn_revoke_coaching_grants_on_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    UPDATE public.access_grants
    SET status = 'revoked', updated_at = now()
    WHERE source_type = 'coaching_engagement'
      AND source_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_coaching_grants_on_end ON public.coaching_org_engagements;
CREATE TRIGGER trg_revoke_coaching_grants_on_end
  AFTER UPDATE ON public.coaching_org_engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_revoke_coaching_grants_on_end();