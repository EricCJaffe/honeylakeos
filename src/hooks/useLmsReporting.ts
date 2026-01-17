import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCompanyModules } from "./useCompanyModules";
import { LmsProgress } from "./useLmsProgress";
import { LmsAssignment } from "./useLmsAssignments";
import { isPast } from "date-fns";

export interface LmsOverviewStats {
  totalPaths: number;
  totalCourses: number;
  totalLessons: number;
  publishedPaths: number;
  publishedCourses: number;
  publishedLessons: number;
  activeAssignments: number;
  overdueAssignments: number;
  learnerProgress: {
    notStarted: number;
    inProgress: number;
    completed: number;
    total: number;
  };
}

export interface AssignmentReportRow {
  userId: string;
  userName: string;
  userEmail: string;
  targetType: string;
  status: "not_started" | "in_progress" | "completed";
  completedAt: string | null;
  isOverdue: boolean;
}

export interface LearnerProgressItem {
  entityType: string;
  entityId: string;
  entityTitle: string;
  status: "not_started" | "in_progress" | "completed";
  progressPercent: number | null;
  dueAt: string | null;
  isRequired: boolean;
  isOverdue: boolean;
  completedAt: string | null;
}

// Get LMS overview stats for admin dashboard
export function useLmsOverviewStats() {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-overview-stats", activeCompanyId],
    queryFn: async (): Promise<LmsOverviewStats> => {
      if (!activeCompanyId || !lmsEnabled) {
        return {
          totalPaths: 0,
          totalCourses: 0,
          totalLessons: 0,
          publishedPaths: 0,
          publishedCourses: 0,
          publishedLessons: 0,
          activeAssignments: 0,
          overdueAssignments: 0,
          learnerProgress: { notStarted: 0, inProgress: 0, completed: 0, total: 0 },
        };
      }

      // Fetch counts in parallel
      const [pathsRes, coursesRes, lessonsRes, assignmentsRes, progressRes] = await Promise.all([
        supabase
          .from("lms_learning_paths")
          .select("id, status", { count: "exact", head: false })
          .eq("company_id", activeCompanyId)
          .is("archived_at", null),
        supabase
          .from("lms_courses")
          .select("id, status", { count: "exact", head: false })
          .eq("company_id", activeCompanyId)
          .is("archived_at", null),
        supabase
          .from("lms_lessons")
          .select("id, status", { count: "exact", head: false })
          .eq("company_id", activeCompanyId)
          .is("archived_at", null),
        supabase
          .from("lms_assignments")
          .select("id, due_at", { count: "exact", head: false })
          .eq("company_id", activeCompanyId)
          .is("archived_at", null),
        supabase
          .from("lms_progress")
          .select("id, status, user_id")
          .eq("company_id", activeCompanyId),
      ]);

      const paths = pathsRes.data || [];
      const courses = coursesRes.data || [];
      const lessons = lessonsRes.data || [];
      const assignments = assignmentsRes.data || [];
      const progress = progressRes.data || [];

      // Calculate overdue assignments
      const now = new Date();
      const overdueAssignments = assignments.filter(a => a.due_at && isPast(new Date(a.due_at))).length;

      // Calculate progress distribution (unique users)
      const userProgressMap = new Map<string, string>();
      progress.forEach((p: LmsProgress) => {
        const current = userProgressMap.get(p.user_id);
        // Priority: completed > in_progress > not_started
        if (p.status === "completed") {
          userProgressMap.set(p.user_id, "completed");
        } else if (p.status === "in_progress" && current !== "completed") {
          userProgressMap.set(p.user_id, "in_progress");
        } else if (!current) {
          userProgressMap.set(p.user_id, "not_started");
        }
      });

      const progressCounts = { notStarted: 0, inProgress: 0, completed: 0 };
      userProgressMap.forEach((status) => {
        if (status === "completed") progressCounts.completed++;
        else if (status === "in_progress") progressCounts.inProgress++;
        else progressCounts.notStarted++;
      });

      return {
        totalPaths: paths.length,
        totalCourses: courses.length,
        totalLessons: lessons.length,
        publishedPaths: paths.filter(p => p.status === "published").length,
        publishedCourses: courses.filter(c => c.status === "published").length,
        publishedLessons: lessons.filter(l => l.status === "published").length,
        activeAssignments: assignments.length,
        overdueAssignments,
        learnerProgress: {
          ...progressCounts,
          total: userProgressMap.size,
        },
      };
    },
    enabled: !!activeCompanyId && lmsEnabled,
    staleTime: 2 * 60 * 1000, // 2 min cache
  });
}

// Get all assignments with learner status for admin
export function useLmsAssignmentsWithStatus() {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-assignments-with-status", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      const { data: assignments, error } = await supabase
        .from("lms_assignments")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("assigned_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich with assignable details
      const enriched = await Promise.all(
        (assignments || []).map(async (assignment: LmsAssignment) => {
          let title = "Unknown";
          
          if (assignment.assignable_type === "learning_path") {
            const { data } = await supabase
              .from("lms_learning_paths")
              .select("title")
              .eq("id", assignment.assignable_id)
              .maybeSingle();
            title = data?.title || "Unknown Path";
          } else if (assignment.assignable_type === "course") {
            const { data } = await supabase
              .from("lms_courses")
              .select("title")
              .eq("id", assignment.assignable_id)
              .maybeSingle();
            title = data?.title || "Unknown Course";
          } else if (assignment.assignable_type === "lesson") {
            const { data } = await supabase
              .from("lms_lessons")
              .select("title")
              .eq("id", assignment.assignable_id)
              .maybeSingle();
            title = data?.title || "Unknown Lesson";
          }

          const isOverdue = assignment.due_at ? isPast(new Date(assignment.due_at)) : false;

          return {
            ...assignment,
            assignableTitle: title,
            isOverdue,
          };
        })
      );

      return enriched;
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

// Get learner progress for a specific assignment
export function useAssignmentLearnerProgress(assignmentId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["assignment-learner-progress", assignmentId, activeCompanyId],
    queryFn: async (): Promise<{ assignment: any | null; learners: AssignmentReportRow[] }> => {
      if (!activeCompanyId || !lmsEnabled || !assignmentId) {
        return { assignment: null, learners: [] };
      }

      // Get assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from("lms_assignments")
        .select("*")
        .eq("id", assignmentId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (assignmentError || !assignment) {
        return { assignment: null, learners: [] };
      }

      // Get relevant users based on target type
      let userIds: string[] = [];
      
      if (assignment.target_type === "user" && assignment.target_id) {
        userIds = [assignment.target_id];
      } else if (assignment.target_type === "group" && assignment.target_id) {
        // Get group members
        const { data: groupMembers } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", assignment.target_id);
        userIds = (groupMembers || []).map(gm => gm.user_id);
      } else if (assignment.target_type === "all_members") {
        // Get all company members
        const { data: memberships } = await supabase
          .from("memberships")
          .select("user_id")
          .eq("company_id", activeCompanyId)
          .eq("status", "active");
        userIds = (memberships || []).map(m => m.user_id);
      }

      if (userIds.length === 0) {
        return { assignment, learners: [] };
      }

      // Get profiles for users (use user_id not id)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds.slice(0, 100)); // Limit for safety

      // Get progress for these users on this assignable
      const { data: progressRecords } = await supabase
        .from("lms_progress")
        .select("user_id, status, completed_at")
        .eq("company_id", activeCompanyId)
        .eq("entity_type", assignment.assignable_type)
        .eq("entity_id", assignment.assignable_id)
        .in("user_id", userIds);

      const progressMap = new Map<string, LmsProgress>();
      (progressRecords || []).forEach((p: any) => {
        progressMap.set(p.user_id, p);
      });

      const isOverdue = assignment.due_at ? isPast(new Date(assignment.due_at)) : false;

      const learners: AssignmentReportRow[] = (profiles || []).map((profile: any) => {
        const progress = progressMap.get(profile.user_id);
        const status = progress?.status || "not_started";
        
        return {
          userId: profile.user_id,
          userName: profile.full_name || "Unknown",
          userEmail: profile.email || "",
          targetType: assignment.target_type,
          status: status as "not_started" | "in_progress" | "completed",
          completedAt: progress?.completed_at || null,
          isOverdue: isOverdue && status !== "completed",
        };
      });

      return { assignment, learners };
    },
    enabled: !!activeCompanyId && lmsEnabled && !!assignmentId,
  });
}

// Get all LMS progress for a specific user (admin view)
export function useUserLmsProgress(userId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["user-lms-progress", userId, activeCompanyId],
    queryFn: async (): Promise<LearnerProgressItem[]> => {
      if (!activeCompanyId || !lmsEnabled || !userId) return [];

      // Get user's assignments
      const { data: assignments } = await supabase
        .from("lms_assignments")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .or(`target_id.eq.${userId},target_type.eq.all_members`);

      // Get user's progress
      const { data: progress } = await supabase
        .from("lms_progress")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", userId);

      const progressMap = new Map<string, LmsProgress>();
      (progress || []).forEach((p: LmsProgress) => {
        progressMap.set(`${p.entity_type}:${p.entity_id}`, p);
      });

      // Build items from assignments
      const items: LearnerProgressItem[] = [];
      
      for (const assignment of (assignments || [])) {
        let title = "Unknown";
        
        if (assignment.assignable_type === "learning_path") {
          const { data } = await supabase
            .from("lms_learning_paths")
            .select("title")
            .eq("id", assignment.assignable_id)
            .maybeSingle();
          title = data?.title || "Unknown Path";
        } else if (assignment.assignable_type === "course") {
          const { data } = await supabase
            .from("lms_courses")
            .select("title")
            .eq("id", assignment.assignable_id)
            .maybeSingle();
          title = data?.title || "Unknown Course";
        } else if (assignment.assignable_type === "lesson") {
          const { data } = await supabase
            .from("lms_lessons")
            .select("title")
            .eq("id", assignment.assignable_id)
            .maybeSingle();
          title = data?.title || "Unknown Lesson";
        }

        const progressRecord = progressMap.get(`${assignment.assignable_type}:${assignment.assignable_id}`);
        const isOverdue = assignment.due_at ? isPast(new Date(assignment.due_at)) : false;

        items.push({
          entityType: assignment.assignable_type,
          entityId: assignment.assignable_id,
          entityTitle: title,
          status: (progressRecord?.status || "not_started") as "not_started" | "in_progress" | "completed",
          progressPercent: progressRecord?.progress_percent || null,
          dueAt: assignment.due_at,
          isRequired: assignment.is_required,
          isOverdue: isOverdue && progressRecord?.status !== "completed",
          completedAt: progressRecord?.completed_at || null,
        });
      }

      // Sort: required + overdue first
      items.sort((a, b) => {
        if (a.isOverdue && a.isRequired && !b.isOverdue) return -1;
        if (b.isOverdue && b.isRequired && !a.isOverdue) return 1;
        if (a.isRequired && !b.isRequired) return -1;
        if (b.isRequired && !a.isRequired) return 1;
        return 0;
      });

      return items;
    },
    enabled: !!activeCompanyId && lmsEnabled && !!userId,
  });
}

// Get quiz stats for a lesson
export function useLessonQuizStats(lessonId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["lesson-quiz-stats", lessonId, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId || !lessonId) return null;

      // Get quiz for lesson
      const { data: quiz } = await supabase
        .from("lms_quizzes")
        .select("id, title, passing_score_percent")
        .eq("lesson_id", lessonId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (!quiz) return null;

      // Get attempt stats
      const { data: attempts } = await supabase
        .from("lms_quiz_attempts")
        .select("id, user_id, passed, score_percent")
        .eq("quiz_id", quiz.id)
        .eq("company_id", activeCompanyId);

      const uniqueUsers = new Set((attempts || []).map(a => a.user_id));
      const passedUsers = new Set((attempts || []).filter(a => a.passed).map(a => a.user_id));
      const scores = (attempts || []).map(a => a.score_percent).filter(Boolean) as number[];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        passingScore: quiz.passing_score_percent,
        totalAttempts: attempts?.length || 0,
        uniqueLearners: uniqueUsers.size,
        passedLearners: passedUsers.size,
        averageScore: avgScore ? Math.round(avgScore) : null,
      };
    },
    enabled: !!activeCompanyId && !!lessonId,
  });
}
