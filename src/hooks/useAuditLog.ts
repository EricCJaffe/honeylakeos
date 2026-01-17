import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction =
  // Employee actions
  | "employee.created"
  | "employee.updated"
  | "employee.archived"
  | "employee.restored"
  | "employee.deleted"
  | "employee.linked"
  | "employee.status_changed"
  // Employee invite actions (dot notation)
  | "employee.invite.created"
  | "employee.invite.resent"
  | "employee.invite.revoked"
  | "employee.invite.accepted"
  // Legacy invite actions (keep for backwards compatibility with triggers)
  | "invite.created"
  | "invite.sent"
  | "invite.resent"
  | "invite.revoked"
  | "invite.accepted"
  // Group actions
  | "group.created"
  | "group.updated"
  | "group.deleted"
  // Group member actions
  | "group_member.added"
  | "group_member.removed"
  | "group_member.role_changed"
  // Location actions
  | "location.created"
  | "location.updated"
  | "location.deleted"
  | "location.archived"
  | "location.restored"
  // Location member actions
  | "location_member.added"
  | "location_member.removed"
  | "location_member.role_changed"
  // Membership actions
  | "membership.created"
  | "membership.role_changed"
  | "membership.status_changed"
  | "membership.deleted"
  // Company actions
  | "company.created"
  | "company.updated"
  // Module actions
  | "module.enabled"
  | "module.disabled"
  // Template actions
  | "template.created"
  | "template.updated"
  | "template.deactivated"
  // Task occurrence actions
  | "task.occurrence_completed"
  | "task.occurrence_uncompleted"
  | "task.occurrence_skipped"
  | "task.occurrence_overridden_created"
  // Task series actions
  | "task.series_created"
  | "task.series_updated"
  | "task.series_split"
  | "task.linked_to_project"
  | "task.archived"
  | "task.reopened"
  | "task.duplicated"
  // Event actions
  | "event.series_created"
  | "event.series_updated"
  | "event.occurrence_skipped"
  | "event.occurrence_overridden"
  | "event.series_split"
  // Link actions
  | "link.created"
  | "link.deleted"
  // Terminology actions
  | "terminology.updated"
  | "terminology.reset"
  // CRM actions
  | "crm.client_created"
  | "crm.client_updated"
  | "crm.client_archived"
  | "crm.client_unarchived"
  | "crm.client_deleted"
  | "crm.client_contact_linked"
  | "crm.client_contact_unlinked"
  // External contact actions
  | "external_contact.created"
  | "external_contact.updated"
  | "external_contact.archived"
  | "external_contact.unarchived"
  | "external_contact.deleted"
  // Coach profile actions
  | "coach_profile.created"
  | "coach_profile.updated"
  | "coach_profile.archived"
  | "coach_profile.unarchived"
  | "coach_profile.deleted"
  // Form actions
  | "form.created"
  | "form.updated"
  | "form.published"
  | "form.archived"
  | "form.deleted"
  | "form.field_added"
  | "form.field_updated"
  | "form.field_removed"
  | "form.fields_reordered"
  | "form.submission_received"
  | "form.submission_deleted"
  // LMS actions
  | "lms.course_created"
  | "lms.course_updated"
  | "lms.course_published"
  | "lms.course_archived"
  | "lms.course_deleted"
  | "lms.path_created"
  | "lms.path_updated"
  | "lms.path_published"
  | "lms.path_archived"
  | "lms.path_deleted"
  | "lms.lesson_created"
  | "lms.lesson_updated"
  | "lms.lesson_published"
  | "lms.lesson_archived"
  | "lms.lesson_deleted"
  | "lms.assignment_created"
  | "lms.assignment_updated"
  | "lms.assignment_archived"
  | "lms.quiz_created"
  | "lms.quiz_updated"
  | "lms.quiz_attempt_submitted"
  | "lms.progress_updated"
  // Capability settings actions
  | "capability.settings_updated"
  // Folder actions
  | "folder.created"
  | "folder.updated"
  | "folder.archived"
  | "folder.deleted"
  | "folder.moved"
  | "folder.acl_added"
  | "folder.acl_updated"
  | "folder.acl_removed"
  // Onboarding actions
  | "onboarding.started"
  | "onboarding.completed"
  | "onboarding.skipped"
  // Framework actions
  | "framework.cloned"
  | "framework.adopted"
  // Workflow actions
  | "workflow.run_started"
  | "workflow.run_completed"
  | "workflow.run_cancelled"
  | "workflow.run_failed"
  | "workflow.step_assigned"
  | "workflow.step_started"
  | "workflow.step_completed"
  | "workflow.step_rejected"
  | "workflow.step_skipped"
  | "workflow.step_reassigned"
  | "framework.updated";

export type EntityType =
  | "employee"
  | "employee_invite"
  | "invite"
  | "group"
  | "group_member"
  | "location"
  | "location_member"
  | "membership"
  | "company"
  | "company_module"
  | "template"
  | "task"
  | "event"
  | "entity_link"
  | "project"
  | "note"
  | "document"
  | "terminology"
  | "crm_client"
  | "external_contact"
  | "coach_profile"
  | "form"
  | "lms_course"
  | "lms_learning_path"
  | "lms_lesson"
  | "lms_assignment"
  | "lms_quiz"
  | "lms_quiz_attempt"
  | "lms_progress"
  | "folder"
  | "workflow_run"
  | "workflow_step_run"
  | "folder_acl";

interface LogAuditEventParams {
  companyId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to the audit_logs table.
 * This function calls the `log_audit_event` RPC which handles
 * setting the actor_user_id from auth.uid().
 */
export async function logAuditEvent({
  companyId,
  action,
  entityType,
  entityId,
  metadata = {},
}: LogAuditEventParams): Promise<void> {
  try {
    const { error } = await supabase.rpc("log_audit_event", {
      p_company_id: companyId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_metadata: metadata as Json,
    });

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  } catch (err) {
    // Silently fail - audit logging should not break the main operation
    console.error("Audit log error:", err);
  }
}

/**
 * Hook that provides audit logging bound to the active company.
 * Can be called with a specific companyId or will use the active company.
 */
export function useAuditLog(providedCompanyId?: string | null) {
  const { activeCompanyId } = useActiveCompany();
  const companyId = providedCompanyId ?? activeCompanyId;

  const log = async (
    action: AuditAction,
    entityType: EntityType,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!companyId) {
      console.warn("Cannot log audit event: no company ID");
      return;
    }
    await logAuditEvent({
      companyId,
      action,
      entityType,
      entityId,
      metadata,
    });
  };

  return { log };
}
