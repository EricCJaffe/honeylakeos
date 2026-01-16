-- LMS v2: Self-Paced Learning System (Clean Migration)
-- Replaces old instructor-led model with Learning Paths → Courses → Lessons

-- ============================================
-- 1. DEPRECATE OLD LMS TABLES
-- ============================================
ALTER TABLE IF EXISTS lms_session_attendance RENAME TO lms_session_attendance_deprecated;
ALTER TABLE IF EXISTS lms_cohort_coaches RENAME TO lms_cohort_coaches_deprecated;
ALTER TABLE IF EXISTS lms_enrollments RENAME TO lms_enrollments_deprecated;
ALTER TABLE IF EXISTS lms_sessions RENAME TO lms_sessions_deprecated;
ALTER TABLE IF EXISTS lms_cohorts RENAME TO lms_cohorts_deprecated;

-- Drop old indexes before renaming lms_courses
DROP INDEX IF EXISTS idx_lms_courses_company;
DROP INDEX IF EXISTS idx_lms_courses_status;

ALTER TABLE IF EXISTS lms_courses RENAME TO lms_courses_deprecated;

-- ============================================
-- 2. CREATE NEW LMS V2 TABLES
-- ============================================

CREATE TABLE public.lms_learning_paths (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  visibility text NOT NULL DEFAULT 'company_private' CHECK (visibility IN ('company_private', 'company_public')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  estimated_hours numeric(5,1),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.lms_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  syllabus_asset_path text,
  visibility text NOT NULL DEFAULT 'company_private' CHECK (visibility IN ('company_private', 'company_public')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  estimated_hours numeric(5,1),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.lms_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  content_type text NOT NULL DEFAULT 'rich_text_only' CHECK (content_type IN ('youtube', 'file_asset', 'external_link', 'rich_text_only')),
  youtube_url text,
  file_asset_path text,
  external_url text,
  rich_text_body text,
  estimated_minutes integer,
  visibility text NOT NULL DEFAULT 'company_private' CHECK (visibility IN ('company_private', 'company_public')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.lms_path_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES public.lms_learning_paths(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(path_id, course_id)
);

CREATE TABLE public.lms_course_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, lesson_id)
);

CREATE TABLE public.lms_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('path', 'course', 'lesson')),
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  last_viewed_at timestamptz,
  progress_percent integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE TABLE public.lms_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assignable_type text NOT NULL CHECK (assignable_type IN ('path', 'course', 'lesson')),
  assignable_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user', 'group', 'location', 'company')),
  target_id uuid,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  is_required boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.lms_quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
  title text,
  passing_score_percent integer,
  allow_retries boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id)
);

CREATE TABLE public.lms_quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_select')),
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer jsonb NOT NULL,
  explanation text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score_percent integer,
  passed boolean,
  answers jsonb NOT NULL DEFAULT '[]'
);

-- ============================================
-- 3. INDEXES (with v2 prefix to avoid conflicts)
-- ============================================
CREATE INDEX idx_lms_v2_paths_company ON lms_learning_paths(company_id);
CREATE INDEX idx_lms_v2_paths_status ON lms_learning_paths(status);
CREATE INDEX idx_lms_v2_courses_company ON lms_courses(company_id);
CREATE INDEX idx_lms_v2_courses_status ON lms_courses(status);
CREATE INDEX idx_lms_v2_lessons_company ON lms_lessons(company_id);
CREATE INDEX idx_lms_v2_lessons_type ON lms_lessons(content_type);
CREATE INDEX idx_lms_v2_path_courses_path ON lms_path_courses(path_id);
CREATE INDEX idx_lms_v2_course_lessons_course ON lms_course_lessons(course_id);
CREATE INDEX idx_lms_v2_progress_user ON lms_progress(user_id);
CREATE INDEX idx_lms_v2_progress_entity ON lms_progress(entity_type, entity_id);
CREATE INDEX idx_lms_v2_assignments_company ON lms_assignments(company_id);
CREATE INDEX idx_lms_v2_assignments_target ON lms_assignments(target_type, target_id);
CREATE INDEX idx_lms_v2_attempts_user ON lms_quiz_attempts(user_id, quiz_id);

-- ============================================
-- 4. ENABLE RLS
-- ============================================
ALTER TABLE lms_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Learning Paths
CREATE POLICY "lms_paths_select" ON lms_learning_paths FOR SELECT
  USING (is_company_member(company_id) AND (status = 'published' OR created_by = auth.uid() OR is_company_admin(company_id)));

CREATE POLICY "lms_paths_admin" ON lms_learning_paths FOR ALL
  USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

CREATE POLICY "lms_paths_capability" ON lms_learning_paths FOR ALL
  USING (is_company_member(company_id) AND EXISTS (SELECT 1 FROM company_capability_settings WHERE company_id = lms_learning_paths.company_id AND lms_member_manage_enabled = true))
  WITH CHECK (is_company_member(company_id) AND EXISTS (SELECT 1 FROM company_capability_settings WHERE company_id = lms_learning_paths.company_id AND lms_member_manage_enabled = true));

-- Courses
CREATE POLICY "lms_courses_select" ON lms_courses FOR SELECT
  USING (is_company_member(company_id) AND (status = 'published' OR created_by = auth.uid() OR is_company_admin(company_id)));

CREATE POLICY "lms_courses_admin" ON lms_courses FOR ALL
  USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

CREATE POLICY "lms_courses_capability" ON lms_courses FOR ALL
  USING (is_company_member(company_id) AND EXISTS (SELECT 1 FROM company_capability_settings WHERE company_id = lms_courses.company_id AND lms_member_manage_enabled = true))
  WITH CHECK (is_company_member(company_id) AND EXISTS (SELECT 1 FROM company_capability_settings WHERE company_id = lms_courses.company_id AND lms_member_manage_enabled = true));

-- Lessons
CREATE POLICY "lms_lessons_select" ON lms_lessons FOR SELECT
  USING (is_company_member(company_id) AND (status = 'published' OR created_by = auth.uid() OR is_company_admin(company_id)));

CREATE POLICY "lms_lessons_admin" ON lms_lessons FOR ALL
  USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

CREATE POLICY "lms_lessons_capability" ON lms_lessons FOR ALL
  USING (is_company_member(company_id) AND EXISTS (SELECT 1 FROM company_capability_settings WHERE company_id = lms_lessons.company_id AND lms_member_manage_enabled = true))
  WITH CHECK (is_company_member(company_id) AND EXISTS (SELECT 1 FROM company_capability_settings WHERE company_id = lms_lessons.company_id AND lms_member_manage_enabled = true));

-- Path-Courses junction
CREATE POLICY "lms_path_courses_select" ON lms_path_courses FOR SELECT
  USING (EXISTS (SELECT 1 FROM lms_learning_paths p WHERE p.id = path_id AND is_company_member(p.company_id)));

CREATE POLICY "lms_path_courses_admin" ON lms_path_courses FOR ALL
  USING (EXISTS (SELECT 1 FROM lms_learning_paths p WHERE p.id = path_id AND is_company_admin(p.company_id)));

-- Course-Lessons junction
CREATE POLICY "lms_course_lessons_select" ON lms_course_lessons FOR SELECT
  USING (EXISTS (SELECT 1 FROM lms_courses c WHERE c.id = course_id AND is_company_member(c.company_id)));

CREATE POLICY "lms_course_lessons_admin" ON lms_course_lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM lms_courses c WHERE c.id = course_id AND is_company_admin(c.company_id)));

-- Progress
CREATE POLICY "lms_progress_own" ON lms_progress FOR SELECT
  USING (user_id = auth.uid() OR is_company_admin(company_id));

CREATE POLICY "lms_progress_insert" ON lms_progress FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_company_member(company_id));

CREATE POLICY "lms_progress_update" ON lms_progress FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Assignments
CREATE POLICY "lms_assignments_select" ON lms_assignments FOR SELECT
  USING (is_company_member(company_id) AND (
    is_company_admin(company_id) OR
    (target_type = 'user' AND target_id = auth.uid()) OR
    (target_type = 'company') OR
    (target_type = 'group' AND EXISTS (SELECT 1 FROM group_members WHERE group_id = target_id AND user_id = auth.uid())) OR
    (target_type = 'location' AND EXISTS (SELECT 1 FROM location_members WHERE location_id = target_id AND user_id = auth.uid()))
  ));

CREATE POLICY "lms_assignments_admin" ON lms_assignments FOR ALL
  USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Quizzes
CREATE POLICY "lms_quizzes_select" ON lms_quizzes FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "lms_quizzes_admin" ON lms_quizzes FOR ALL
  USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Quiz Questions
CREATE POLICY "lms_questions_select" ON lms_quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM lms_quizzes q WHERE q.id = quiz_id AND is_company_member(q.company_id)));

CREATE POLICY "lms_questions_admin" ON lms_quiz_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM lms_quizzes q WHERE q.id = quiz_id AND is_company_admin(q.company_id)));

-- Quiz Attempts
CREATE POLICY "lms_attempts_own" ON lms_quiz_attempts FOR SELECT
  USING (user_id = auth.uid() OR is_company_admin(company_id));

CREATE POLICY "lms_attempts_insert" ON lms_quiz_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_company_member(company_id));

CREATE POLICY "lms_attempts_update" ON lms_quiz_attempts FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. TIMESTAMP TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_lms_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_lms_paths_updated BEFORE UPDATE ON lms_learning_paths FOR EACH ROW EXECUTE FUNCTION update_lms_updated_at();
CREATE TRIGGER trg_lms_courses_updated BEFORE UPDATE ON lms_courses FOR EACH ROW EXECUTE FUNCTION update_lms_updated_at();
CREATE TRIGGER trg_lms_lessons_updated BEFORE UPDATE ON lms_lessons FOR EACH ROW EXECUTE FUNCTION update_lms_updated_at();
CREATE TRIGGER trg_lms_progress_updated BEFORE UPDATE ON lms_progress FOR EACH ROW EXECUTE FUNCTION update_lms_updated_at();
CREATE TRIGGER trg_lms_quizzes_updated BEFORE UPDATE ON lms_quizzes FOR EACH ROW EXECUTE FUNCTION update_lms_updated_at();

-- ============================================
-- 7. AUDIT LOGGING
-- ============================================
CREATE OR REPLACE FUNCTION audit_lms_path_changes()
RETURNS trigger AS $$
DECLARE v_action text; v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'lms.path_created'; v_meta := jsonb_build_object('title', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN v_action := 'lms.path_status_changed'; v_meta := jsonb_build_object('title', NEW.title, 'from', OLD.status, 'to', NEW.status);
    ELSIF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN v_action := 'lms.path_archived'; v_meta := jsonb_build_object('title', NEW.title);
    ELSE v_action := 'lms.path_updated'; v_meta := jsonb_build_object('title', NEW.title); END IF;
  ELSIF TG_OP = 'DELETE' THEN v_action := 'lms.path_deleted'; v_meta := jsonb_build_object('title', OLD.title);
    PERFORM log_audit_event(OLD.company_id, v_action, 'lms_learning_path', OLD.id, v_meta); RETURN OLD;
  END IF;
  PERFORM log_audit_event(NEW.company_id, v_action, 'lms_learning_path', NEW.id, v_meta); RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_lms_paths AFTER INSERT OR UPDATE OR DELETE ON lms_learning_paths FOR EACH ROW EXECUTE FUNCTION audit_lms_path_changes();

CREATE OR REPLACE FUNCTION audit_lms_course_changes()
RETURNS trigger AS $$
DECLARE v_action text; v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'lms.course_created'; v_meta := jsonb_build_object('title', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN v_action := 'lms.course_status_changed'; v_meta := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSE v_action := 'lms.course_updated'; v_meta := jsonb_build_object('title', NEW.title); END IF;
  END IF;
  PERFORM log_audit_event(NEW.company_id, v_action, 'lms_course', NEW.id, v_meta); RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_lms_courses AFTER INSERT OR UPDATE ON lms_courses FOR EACH ROW EXECUTE FUNCTION audit_lms_course_changes();

CREATE OR REPLACE FUNCTION audit_lms_lesson_changes()
RETURNS trigger AS $$
DECLARE v_action text; v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'lms.lesson_created';
  ELSE v_action := 'lms.lesson_updated'; END IF;
  v_meta := jsonb_build_object('title', NEW.title, 'content_type', NEW.content_type);
  PERFORM log_audit_event(NEW.company_id, v_action, 'lms_lesson', NEW.id, v_meta); RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_lms_lessons AFTER INSERT OR UPDATE ON lms_lessons FOR EACH ROW EXECUTE FUNCTION audit_lms_lesson_changes();

CREATE OR REPLACE FUNCTION audit_lms_assignment_changes()
RETURNS trigger AS $$
DECLARE v_action text; v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'lms.assignment_created';
  ELSIF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN v_action := 'lms.assignment_archived';
  ELSE v_action := 'lms.assignment_updated'; END IF;
  v_meta := jsonb_build_object('assignable_type', NEW.assignable_type, 'target_type', NEW.target_type);
  PERFORM log_audit_event(NEW.company_id, v_action, 'lms_assignment', NEW.id, v_meta); RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_lms_assignments AFTER INSERT OR UPDATE ON lms_assignments FOR EACH ROW EXECUTE FUNCTION audit_lms_assignment_changes();