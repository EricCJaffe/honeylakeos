-- Learning Management System Module Tables

-- Courses table
CREATE TABLE public.lms_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  default_duration_minutes INTEGER,
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Cohorts/Programs table
CREATE TABLE public.lms_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'archived')),
  linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Sessions table
CREATE TABLE public.lms_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.lms_cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location_text TEXT,
  meeting_url TEXT,
  linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Participant enrollments (links external contacts to cohorts)
CREATE TABLE public.lms_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.lms_cohorts(id) ON DELETE CASCADE,
  external_contact_id UUID NOT NULL REFERENCES public.external_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'waitlisted')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cohort_id, external_contact_id)
);
-- Coach assignments to cohorts
CREATE TABLE public.lms_cohort_coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.lms_cohorts(id) ON DELETE CASCADE,
  coach_profile_id UUID REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  external_contact_id UUID REFERENCES public.external_contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'instructor',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cohort_id, coach_profile_id),
  CHECK (coach_profile_id IS NOT NULL OR external_contact_id IS NOT NULL)
);
-- Session attendance tracking
CREATE TABLE public.lms_session_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.lms_sessions(id) ON DELETE CASCADE,
  external_contact_id UUID NOT NULL REFERENCES public.external_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused', 'late')),
  notes TEXT,
  marked_by UUID,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, external_contact_id)
);
-- Enable RLS on all tables
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_cohort_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_session_attendance ENABLE ROW LEVEL SECURITY;
-- RLS Policies for lms_courses
CREATE POLICY "Company members can view courses"
  ON public.lms_courses FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can create courses"
  ON public.lms_courses FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can update courses"
  ON public.lms_courses FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company admins can delete courses"
  ON public.lms_courses FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'lms'));
-- RLS Policies for lms_cohorts
CREATE POLICY "Company members can view cohorts"
  ON public.lms_cohorts FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can create cohorts"
  ON public.lms_cohorts FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can update cohorts"
  ON public.lms_cohorts FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company admins can delete cohorts"
  ON public.lms_cohorts FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'lms'));
-- RLS Policies for lms_sessions
CREATE POLICY "Company members can view sessions"
  ON public.lms_sessions FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can create sessions"
  ON public.lms_sessions FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can update sessions"
  ON public.lms_sessions FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company admins can delete sessions"
  ON public.lms_sessions FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'lms'));
-- RLS Policies for lms_enrollments
CREATE POLICY "Company members can view enrollments"
  ON public.lms_enrollments FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can create enrollments"
  ON public.lms_enrollments FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can update enrollments"
  ON public.lms_enrollments FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company admins can delete enrollments"
  ON public.lms_enrollments FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'lms'));
-- RLS Policies for lms_cohort_coaches
CREATE POLICY "Company members can view cohort coaches"
  ON public.lms_cohort_coaches FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can assign coaches"
  ON public.lms_cohort_coaches FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can update coach assignments"
  ON public.lms_cohort_coaches FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company admins can remove coaches"
  ON public.lms_cohort_coaches FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'lms'));
-- RLS Policies for lms_session_attendance
CREATE POLICY "Company members can view attendance"
  ON public.lms_session_attendance FOR SELECT
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can mark attendance"
  ON public.lms_session_attendance FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company members can update attendance"
  ON public.lms_session_attendance FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_module_enabled(company_id, 'lms'));
CREATE POLICY "Company admins can delete attendance"
  ON public.lms_session_attendance FOR DELETE
  USING (public.is_company_admin(company_id) AND public.is_module_enabled(company_id, 'lms'));
-- Indexes for performance
CREATE INDEX idx_lms_courses_company ON public.lms_courses(company_id);
CREATE INDEX idx_lms_courses_status ON public.lms_courses(status);
CREATE INDEX idx_lms_cohorts_company ON public.lms_cohorts(company_id);
CREATE INDEX idx_lms_cohorts_course ON public.lms_cohorts(course_id);
CREATE INDEX idx_lms_cohorts_status ON public.lms_cohorts(status);
CREATE INDEX idx_lms_sessions_company ON public.lms_sessions(company_id);
CREATE INDEX idx_lms_sessions_cohort ON public.lms_sessions(cohort_id);
CREATE INDEX idx_lms_sessions_course ON public.lms_sessions(course_id);
CREATE INDEX idx_lms_enrollments_company ON public.lms_enrollments(company_id);
CREATE INDEX idx_lms_enrollments_cohort ON public.lms_enrollments(cohort_id);
CREATE INDEX idx_lms_cohort_coaches_cohort ON public.lms_cohort_coaches(cohort_id);
CREATE INDEX idx_lms_session_attendance_session ON public.lms_session_attendance(session_id);
-- Insert LMS module into modules table
INSERT INTO public.modules (slug, name, description, category, is_public)
VALUES ('lms', 'Learning Management', 'Create and manage courses, cohorts, and training programs', 'premium', true)
ON CONFLICT (slug) DO NOTHING;
-- Triggers for updated_at
CREATE TRIGGER set_lms_courses_updated_at
  BEFORE UPDATE ON public.lms_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_lms_cohorts_updated_at
  BEFORE UPDATE ON public.lms_cohorts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
