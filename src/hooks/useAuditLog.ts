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
  | "form.unpublished"
  | "form.archived"
  | "form.deleted"
  | "form.field_added"
  | "form.field_updated"
  | "form.field_removed"
  | "form.field_deleted"
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
  | "framework.updated"
  // Workflow definition actions
  | "workflow.created"
  | "workflow.updated"
  | "workflow.published"
  | "workflow.unpublished"
  | "workflow.archived"
  | "workflow.deleted"
  | "workflow.step_added"
  | "workflow.step_updated"
  | "workflow.step_deleted"
  | "workflow.steps_reordered"
  // Workflow runtime actions
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
  // Sample data actions
  | "sample_data.created"
  | "sample_data.removed"
// Backup actions
  | "backup.created"
  | "backup.failed"
  | "backup.restore_started"
  | "backup.restore_completed"
  // Soft delete actions
  | "entity.soft_deleted"
  | "entity.restored"
  | "entity.hard_deleted"
  // Plan / entitlement actions
  | "plan.assigned"
  | "plan.changed"
  | "plan.expired"
  | "entitlement.denied"
  | "entitlement.override_added"
  | "entitlement.override_removed"
  // Coach monetization actions
  | "coach_plan.created"
  | "coach_plan.updated"
  | "coach_plan.deactivated"
  | "attribution.created"
  | "attribution.updated"
  | "attribution.deactivated"
  | "referral_link.created"
  | "referral_link.used"
  | "revenue_event.recorded"
  // Pilot validation actions
  | "pilot.enabled"
  | "pilot.disabled"
  | "feedback.submitted"
  | "feedback.status_changed"
  // Activation score actions
  | "activation_score.calculated"
  // Attachment actions
  | "attachment.created"
  | "attachment.deleted"
  // Integration actions
  | "integration.enabled"
  | "integration.disabled"
  | "integration.configured"
  | "integration.secrets_deleted"
  // Finance actions
  | "finance_mode_changed"
  | "finance_permission_changed"
  | "financial_import.created"
  | "financial_import.completed"
  | "financial_import.failed"
  | "financial_category.mapped"
  | "reconciliation.started"
  | "reconciliation.completed"
  | "journal_entry.posted"
  | "bill.created"
  | "bill.updated"
  | "bill.status_changed"
  | "bill.deleted"
  | "bill.paid"
  | "vendor.created"
  | "vendor.updated"
  | "vendor.deleted"
  | "coa.account_created"
  | "coa.account_updated"
  | "coa.account_deactivated"
  | "coa.template_applied"
  | "coa.import_completed"
  | "journal_entry.created"
  | "journal_entry.updated"
  | "journal_entry.posted"
  | "journal_entry.voided"
  | "bank_account.created"
  | "bank_account.updated"
  | "bank_account.mapped_to_coa"
  | "bank_account.deactivated"
  | "bank_transaction.categorized"
  | "bank_transaction.posted"
  | "bank_transaction.excluded"
  | "bank_transactions.imported"
  | "reconciliation.voided";

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
  | "workflow"
  | "workflow_run"
  | "workflow_step_run"
  | "folder_acl"
  | "sample_batch"
  | "company_plan"
  | "entitlement_override"
  | "coach_plan"
  | "coach_attribution"
  | "referral_link"
  | "revenue_event"
  | "pilot_flag"
  | "activation_event"
  | "feedback"
  | "attachment"
  | "integration"
  | "financial_import"
  | "financial_statement_line"
  | "financial_category"
  | "journal_entry"
  | "bill"
  | "vendor"
  | "finance_account"
  | "coa_template"
  | "reconciliation"
  | "bank_account"
  | "bank_transaction";

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
