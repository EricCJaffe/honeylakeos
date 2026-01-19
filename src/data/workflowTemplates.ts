// Workflow & Form Starter Templates
// These are seeded template definitions that companies can add to their library

export type TemplateCategory = 
  | "employee_lifecycle" 
  | "requests" 
  | "surveys" 
  | "coaching"
  | "knowledge_management";

export type RequiredModule = 
  | "employees" 
  | "tasks" 
  | "calendar" 
  | "documents" 
  | "lms" 
  | "crm"
  | "groups";

// Must match wf_field_type enum: short_text, long_text, number, email, phone, date, dropdown, multi_select, checkbox, rating, yes_no
export type TemplateFieldType = "short_text" | "long_text" | "number" | "email" | "phone" | "date" | "dropdown" | "multi_select" | "checkbox" | "rating" | "yes_no";

// Must match wf_step_type enum
export type TemplateStepType = "approval_step" | "form_step" | "task_step" | "notify_step" | "document_step" | "calendar_step" | "assign_lms_step" | "note_step" | "project_step" | "support_ticket_step";

// Must match wf_assignee_type enum
export type TemplateAssigneeType = "workflow_initiator" | "company_admin" | "group" | "user" | "employee";

export interface FormFieldTemplate {
  label: string;
  field_type: TemplateFieldType;
  is_required: boolean;
  helper_text?: string;
  options?: string[];
  sort_order: number;
}

export interface FormTemplate {
  id: string;
  type: "form";
  category: TemplateCategory;
  title: string;
  description: string;
  summary: string;
  required_modules: RequiredModule[];
  fields: FormFieldTemplate[];
  tags?: string[];
}

export interface WorkflowStepTemplate {
  step_type: TemplateStepType;
  title: string;
  instructions?: string;
  assignee_type: TemplateAssigneeType;
  due_offset_days?: number;
  config?: Record<string, unknown>;
  sort_order: number;
  required_module?: RequiredModule;
}

export interface WorkflowTemplate {
  id: string;
  type: "workflow";
  category: TemplateCategory;
  title: string;
  description: string;
  summary: string;
  trigger_type: "manual" | "form_submission" | "employee_event" | "scheduled";
  required_modules: RequiredModule[];
  steps: WorkflowStepTemplate[];
  linked_form_template_id?: string;
  tags?: string[];
}

export type StarterTemplate = FormTemplate | WorkflowTemplate;

// =============================================
// EMPLOYEE LIFECYCLE TEMPLATES
// =============================================

export const onboardingIntakeForm: FormTemplate = {
  id: "tpl-onboarding-intake",
  type: "form",
  category: "employee_lifecycle",
  title: "Employee Onboarding Intake",
  description: "Collect essential information for new employee setup including equipment needs, system access, and initial orientation details.",
  summary: "Gather new hire details for IT, HR, and manager setup",
  required_modules: ["employees"],
  tags: ["onboarding", "new hire", "intake"],
  fields: [
    { label: "Employee Name", field_type: "short_text", is_required: true, sort_order: 0 },
    { label: "Start Date", field_type: "date", is_required: true, sort_order: 1 },
    { label: "Department", field_type: "dropdown", is_required: true, options: ["Engineering", "Sales", "Marketing", "Operations", "HR", "Finance", "Other"], sort_order: 2 },
    { label: "Manager Email", field_type: "email", is_required: true, helper_text: "Direct manager's email address", sort_order: 3 },
    { label: "Work Location", field_type: "dropdown", is_required: false, options: ["Remote", "Office - HQ", "Office - Branch", "Hybrid"], sort_order: 4 },
    { label: "Equipment Needs", field_type: "multi_select", is_required: true, options: ["Laptop", "Monitor", "Keyboard & Mouse", "Headset", "Phone", "Office Chair", "Standing Desk"], sort_order: 5 },
    { label: "System Access Required", field_type: "long_text", is_required: true, helper_text: "List all systems and tools this employee will need access to", sort_order: 6 },
    { label: "Additional Notes", field_type: "long_text", is_required: false, sort_order: 7 },
  ],
};

export const onboardingWorkflow: WorkflowTemplate = {
  id: "tpl-onboarding-workflow",
  type: "workflow",
  category: "employee_lifecycle",
  title: "New Employee Onboarding",
  description: "Complete onboarding workflow for new hires including IT setup, manager orientation, and optional learning path assignment.",
  summary: "Automated checklist for IT, HR, and manager tasks",
  trigger_type: "manual",
  required_modules: ["employees", "tasks"],
  linked_form_template_id: "tpl-onboarding-intake",
  tags: ["onboarding", "new hire", "checklist"],
  steps: [
    { step_type: "form_step", title: "Collect Onboarding Details", instructions: "Fill in the new employee's information and requirements", assignee_type: "workflow_initiator", sort_order: 0 },
    { step_type: "task_step", title: "Manager Onboarding Checklist", instructions: "Complete these items:\n- Schedule 1:1 meeting\n- Prepare team introduction\n- Set 30/60/90 day goals\n- Assign initial projects", assignee_type: "company_admin", due_offset_days: 3, sort_order: 1 },
    { step_type: "task_step", title: "IT Setup Checklist", instructions: "Complete these items:\n- Provision laptop\n- Create email account\n- Set up system access\n- Configure VPN", assignee_type: "company_admin", due_offset_days: 1, sort_order: 2, required_module: "tasks" },
    { step_type: "calendar_step", title: "Schedule Orientation", instructions: "Schedule the new employee orientation session", assignee_type: "company_admin", due_offset_days: 2, sort_order: 3, required_module: "calendar" },
    { step_type: "document_step", title: "Create Welcome Packet", instructions: "Generate the employee welcome document with policies and procedures", assignee_type: "company_admin", due_offset_days: 1, sort_order: 4, required_module: "documents" },
    { step_type: "assign_lms_step", title: "Assign Onboarding Learning Path", instructions: "Assign required compliance and company culture training", assignee_type: "company_admin", due_offset_days: 7, sort_order: 5, required_module: "lms" },
    { step_type: "notify_step", title: "Notify Stakeholders", instructions: "Send completion notification to HR and manager", assignee_type: "workflow_initiator", sort_order: 6 },
  ],
};

export const exitSurveyForm: FormTemplate = {
  id: "tpl-exit-survey",
  type: "form",
  category: "employee_lifecycle",
  title: "Exit Survey",
  description: "Confidential exit survey to gather feedback from departing employees about their experience.",
  summary: "Gather insights from departing team members",
  required_modules: ["employees"],
  tags: ["offboarding", "exit", "feedback", "survey"],
  fields: [
    { label: "Reason for Leaving", field_type: "dropdown", is_required: true, options: ["New Opportunity", "Career Change", "Relocation", "Compensation", "Work-Life Balance", "Management", "Personal Reasons", "Retirement", "Other"], sort_order: 0 },
    { label: "How would you rate your manager?", field_type: "rating", is_required: true, helper_text: "1 = Poor, 5 = Excellent", sort_order: 1 },
    { label: "Manager Feedback", field_type: "long_text", is_required: false, helper_text: "Please share any specific feedback about your manager", sort_order: 2 },
    { label: "How would you rate our company culture?", field_type: "rating", is_required: true, helper_text: "1 = Poor, 5 = Excellent", sort_order: 3 },
    { label: "Culture Feedback", field_type: "long_text", is_required: false, sort_order: 4 },
    { label: "What should we improve?", field_type: "long_text", is_required: true, helper_text: "Your honest feedback helps us improve", sort_order: 5 },
    { label: "Would you recommend us to others?", field_type: "yes_no", is_required: true, sort_order: 6 },
    { label: "Additional Comments", field_type: "long_text", is_required: false, sort_order: 7 },
  ],
};

export const offboardingWorkflow: WorkflowTemplate = {
  id: "tpl-offboarding-workflow",
  type: "workflow",
  category: "employee_lifecycle",
  title: "Employee Offboarding",
  description: "Structured offboarding process including access revocation, equipment recovery, and exit interview.",
  summary: "Ensure smooth departures with IT, HR, and manager tasks",
  trigger_type: "manual",
  required_modules: ["employees", "tasks"],
  linked_form_template_id: "tpl-exit-survey",
  tags: ["offboarding", "exit", "checklist"],
  steps: [
    { step_type: "approval_step", title: "Confirm Offboarding Start", instructions: "Confirm the employee's departure and initiate the offboarding process", assignee_type: "company_admin", sort_order: 0 },
    { step_type: "task_step", title: "Disable Access Checklist", instructions: "Complete these items:\n- Revoke system access\n- Disable email account\n- Remove from security groups\n- Deactivate VPN access", assignee_type: "company_admin", due_offset_days: 1, sort_order: 1 },
    { step_type: "task_step", title: "Recover Equipment Checklist", instructions: "Complete these items:\n- Collect laptop\n- Collect phone\n- Collect badges/keys\n- Collect any other company property", assignee_type: "company_admin", due_offset_days: 3, sort_order: 2 },
    { step_type: "form_step", title: "Exit Survey", instructions: "Please complete this confidential exit survey", assignee_type: "employee", sort_order: 3 },
    { step_type: "document_step", title: "Generate Offboarding Summary", instructions: "Create a summary document of the offboarding process", assignee_type: "company_admin", due_offset_days: 5, sort_order: 4, required_module: "documents" },
    { step_type: "notify_step", title: "Close Out Notification", instructions: "Notify relevant stakeholders that offboarding is complete", assignee_type: "workflow_initiator", sort_order: 5 },
  ],
};

// =============================================
// DEPARTMENT REQUEST TEMPLATES
// =============================================

export const itSupportRequestForm: FormTemplate = {
  id: "tpl-it-support-request",
  type: "form",
  category: "requests",
  title: "IT Support Request",
  description: "Submit IT support requests for technical issues, equipment problems, or system access needs.",
  summary: "Report technical issues or request IT assistance",
  required_modules: [],
  tags: ["it", "support", "technical", "request"],
  fields: [
    { label: "Request Type", field_type: "dropdown", is_required: true, options: ["Hardware Issue", "Software Issue", "Network/Connectivity", "Account Access", "New Software Request", "Security Concern", "Other"], sort_order: 0 },
    { label: "Urgency", field_type: "dropdown", is_required: true, options: ["Low - Can wait a few days", "Medium - Impacting work", "High - Blocking critical work", "Critical - System down"], sort_order: 1 },
    { label: "Description", field_type: "long_text", is_required: true, helper_text: "Please describe the issue in detail", sort_order: 2 },
    { label: "Steps to Reproduce (if applicable)", field_type: "long_text", is_required: false, sort_order: 3 },
    { label: "Preferred Contact Method", field_type: "dropdown", is_required: false, options: ["Email", "Phone", "Instant Message"], sort_order: 4 },
    { label: "Best Time to Reach You", field_type: "short_text", is_required: false, sort_order: 5 },
  ],
};

export const itSupportWorkflow: WorkflowTemplate = {
  id: "tpl-it-support-workflow",
  type: "workflow",
  category: "requests",
  title: "IT Support Request Process",
  description: "Route IT support requests to the appropriate team for resolution.",
  summary: "Automated routing and tracking for IT requests",
  trigger_type: "form_submission",
  required_modules: ["tasks"],
  linked_form_template_id: "tpl-it-support-request",
  tags: ["it", "support", "workflow"],
  steps: [
    { step_type: "task_step", title: "Review IT Request", instructions: "Review the submitted IT request and assess priority", assignee_type: "company_admin", due_offset_days: 1, sort_order: 0 },
    { step_type: "task_step", title: "Resolve Issue", instructions: "Work on resolving the reported issue", assignee_type: "company_admin", due_offset_days: 3, sort_order: 1 },
    { step_type: "notify_step", title: "Notify Requester", instructions: "Inform the requester that their issue has been resolved", assignee_type: "workflow_initiator", sort_order: 2 },
  ],
};

export const facilitiesRequestForm: FormTemplate = {
  id: "tpl-facilities-request",
  type: "form",
  category: "requests",
  title: "Facilities Request",
  description: "Submit requests for building maintenance, office supplies, or workspace changes.",
  summary: "Request office maintenance or supplies",
  required_modules: [],
  tags: ["facilities", "maintenance", "office", "request"],
  fields: [
    { label: "Request Type", field_type: "dropdown", is_required: true, options: ["Maintenance/Repair", "Cleaning", "Office Supplies", "Furniture Request", "Workspace Change", "Safety Concern", "Other"], sort_order: 0 },
    { label: "Location", field_type: "short_text", is_required: true, helper_text: "Building, floor, room number or area", sort_order: 1 },
    { label: "Urgency", field_type: "dropdown", is_required: true, options: ["Low - Can wait", "Medium - Within a week", "High - Within 24 hours", "Critical - Immediate attention needed"], sort_order: 2 },
    { label: "Description", field_type: "long_text", is_required: true, helper_text: "Please describe what you need", sort_order: 3 },
    { label: "Preferred Timing", field_type: "short_text", is_required: false, helper_text: "Any time constraints or preferences?", sort_order: 4 },
  ],
};

export const facilitiesWorkflow: WorkflowTemplate = {
  id: "tpl-facilities-workflow",
  type: "workflow",
  category: "requests",
  title: "Facilities Request Process",
  description: "Route facilities requests to the appropriate team for action.",
  summary: "Automated routing for facilities and maintenance requests",
  trigger_type: "form_submission",
  required_modules: ["tasks"],
  linked_form_template_id: "tpl-facilities-request",
  tags: ["facilities", "workflow"],
  steps: [
    { step_type: "task_step", title: "Assess Facilities Request", instructions: "Review the request and determine resource requirements", assignee_type: "company_admin", due_offset_days: 1, sort_order: 0 },
    { step_type: "task_step", title: "Complete Request", instructions: "Fulfill the facilities request", assignee_type: "company_admin", due_offset_days: 5, sort_order: 1 },
    { step_type: "notify_step", title: "Notify Completion", instructions: "Inform requester that the request has been completed", assignee_type: "workflow_initiator", sort_order: 2 },
  ],
};

export const hrRequestForm: FormTemplate = {
  id: "tpl-hr-request",
  type: "form",
  category: "requests",
  title: "HR Request",
  description: "Submit HR-related requests including policy questions, benefits inquiries, or documentation needs.",
  summary: "Contact HR for policy, benefits, or documentation",
  required_modules: [],
  tags: ["hr", "human resources", "request", "benefits"],
  fields: [
    { label: "Request Category", field_type: "dropdown", is_required: true, options: ["Benefits Question", "Policy Inquiry", "Time Off/Leave", "Documentation Request", "Payroll Issue", "Training Request", "Workplace Concern", "Other"], sort_order: 0 },
    { label: "Subject", field_type: "short_text", is_required: true, sort_order: 1 },
    { label: "Description", field_type: "long_text", is_required: true, helper_text: "Please provide details about your request", sort_order: 2 },
    { label: "Is this time-sensitive?", field_type: "yes_no", is_required: true, sort_order: 3 },
    { label: "Preferred Response Method", field_type: "dropdown", is_required: false, options: ["Email", "Phone Call", "In-Person Meeting"], sort_order: 4 },
    { label: "Additional Information", field_type: "long_text", is_required: false, sort_order: 5 },
  ],
};

export const hrRequestWorkflow: WorkflowTemplate = {
  id: "tpl-hr-request-workflow",
  type: "workflow",
  category: "requests",
  title: "HR Request Process",
  description: "Route HR requests for review and response.",
  summary: "Automated routing for HR inquiries",
  trigger_type: "form_submission",
  required_modules: ["tasks"],
  linked_form_template_id: "tpl-hr-request",
  tags: ["hr", "workflow"],
  steps: [
    { step_type: "approval_step", title: "Review HR Request", instructions: "Review the submitted HR request and determine next steps", assignee_type: "company_admin", sort_order: 0 },
    { step_type: "task_step", title: "Process Request", instructions: "Handle the HR request and prepare response", assignee_type: "company_admin", due_offset_days: 3, sort_order: 1 },
    { step_type: "notify_step", title: "Respond to Employee", instructions: "Send response to the employee who submitted the request", assignee_type: "workflow_initiator", sort_order: 2 },
  ],
};

// =============================================
// SURVEY TEMPLATES
// =============================================

export const pulseSurveyForm: FormTemplate = {
  id: "tpl-pulse-survey",
  type: "form",
  category: "surveys",
  title: "Quarterly Pulse Survey",
  description: "Quick check-in survey to gauge employee satisfaction and engagement on a regular basis.",
  summary: "Measure team satisfaction and engagement",
  required_modules: [],
  tags: ["survey", "pulse", "engagement", "feedback"],
  fields: [
    { label: "How satisfied are you with your role?", field_type: "rating", is_required: true, helper_text: "1 = Very Unsatisfied, 5 = Very Satisfied", sort_order: 0 },
    { label: "How would you rate team collaboration?", field_type: "rating", is_required: true, helper_text: "1 = Poor, 5 = Excellent", sort_order: 1 },
    { label: "Do you feel supported by leadership?", field_type: "rating", is_required: true, helper_text: "1 = Not at all, 5 = Completely", sort_order: 2 },
    { label: "How is your work-life balance?", field_type: "rating", is_required: true, helper_text: "1 = Poor, 5 = Excellent", sort_order: 3 },
    { label: "Do you have the tools you need to succeed?", field_type: "yes_no", is_required: true, sort_order: 4 },
    { label: "What's going well?", field_type: "long_text", is_required: false, sort_order: 5 },
    { label: "What could be improved?", field_type: "long_text", is_required: false, sort_order: 6 },
    { label: "Any other feedback?", field_type: "long_text", is_required: false, sort_order: 7 },
  ],
};

export const trainingFeedbackForm: FormTemplate = {
  id: "tpl-training-feedback",
  type: "form",
  category: "surveys",
  title: "Training Feedback Survey",
  description: "Collect feedback after training sessions to improve future learning experiences.",
  summary: "Evaluate training effectiveness and satisfaction",
  required_modules: [],
  tags: ["survey", "training", "feedback", "lms"],
  fields: [
    { label: "Training/Course Name", field_type: "short_text", is_required: true, sort_order: 0 },
    { label: "Overall rating of the training", field_type: "rating", is_required: true, helper_text: "1 = Poor, 5 = Excellent", sort_order: 1 },
    { label: "How relevant was the content to your role?", field_type: "rating", is_required: true, helper_text: "1 = Not relevant, 5 = Highly relevant", sort_order: 2 },
    { label: "How would you rate the instructor/materials?", field_type: "rating", is_required: true, helper_text: "1 = Poor, 5 = Excellent", sort_order: 3 },
    { label: "Was the training length appropriate?", field_type: "dropdown", is_required: true, options: ["Too Short", "Just Right", "Too Long"], sort_order: 4 },
    { label: "What did you find most valuable?", field_type: "long_text", is_required: false, sort_order: 5 },
    { label: "What could be improved?", field_type: "long_text", is_required: false, sort_order: 6 },
    { label: "Would you recommend this training to others?", field_type: "yes_no", is_required: true, sort_order: 7 },
    { label: "What additional training would you like?", field_type: "long_text", is_required: false, sort_order: 8 },
  ],
};

export const meetingEffectivenessSurvey: FormTemplate = {
  id: "tpl-meeting-effectiveness",
  type: "form",
  category: "surveys",
  title: "Meeting Effectiveness Survey",
  description: "Quick survey to evaluate meeting productivity and gather suggestions for improvement.",
  summary: "Evaluate meeting quality and productivity",
  required_modules: [],
  tags: ["survey", "meeting", "feedback", "productivity"],
  fields: [
    { label: "Meeting Name/Topic", field_type: "short_text", is_required: true, sort_order: 0 },
    { label: "Meeting Date", field_type: "date", is_required: true, sort_order: 1 },
    { label: "Was the meeting purpose clear?", field_type: "rating", is_required: true, helper_text: "1 = Not at all, 5 = Very clear", sort_order: 2 },
    { label: "Was the meeting a good use of time?", field_type: "rating", is_required: true, helper_text: "1 = Waste of time, 5 = Very productive", sort_order: 3 },
    { label: "Did you have a chance to contribute?", field_type: "yes_no", is_required: true, sort_order: 4 },
    { label: "Were action items clearly defined?", field_type: "yes_no", is_required: true, sort_order: 5 },
    { label: "Could this meeting have been an email?", field_type: "yes_no", is_required: false, sort_order: 6 },
    { label: "Suggestions for improvement", field_type: "long_text", is_required: false, sort_order: 7 },
  ],
};

// =============================================
// KNOWLEDGE MANAGEMENT TEMPLATES
// =============================================

export const sopLifecycleWorkflow: WorkflowTemplate = {
  id: "tpl-sop-lifecycle",
  type: "workflow",
  category: "knowledge_management",
  title: "SOP Lifecycle Management",
  description: "Manage the complete lifecycle of Standard Operating Procedures from draft creation through publication, review cycles, and archival. Ensures SOPs stay current with configurable review periods and approval gates.",
  summary: "Automate SOP creation, review, approval, and archival",
  trigger_type: "manual",
  required_modules: [],
  tags: ["sop", "documentation", "compliance", "knowledge", "review"],
  steps: [
    { 
      step_type: "form_step", 
      title: "Draft Created", 
      instructions: "Create or edit the SOP content. Fill in all required sections including purpose, scope, procedure steps, and ownership details.", 
      assignee_type: "workflow_initiator", 
      sort_order: 0 
    },
    { 
      step_type: "approval_step", 
      title: "Review & Approval", 
      instructions: "Review the SOP for accuracy, completeness, and compliance. Approve to publish or request revisions.\n\nNote: This step can be skipped if department policy allows direct publishing.", 
      assignee_type: "company_admin", 
      due_offset_days: 5,
      sort_order: 1,
      config: { optional: true, configurable_per_department: true }
    },
    { 
      step_type: "notify_step", 
      title: "Published", 
      instructions: "SOP has been approved and is now published. Notify relevant stakeholders that the SOP is now active and available.", 
      assignee_type: "workflow_initiator", 
      sort_order: 2 
    },
    { 
      step_type: "note_step", 
      title: "Active", 
      instructions: "SOP is now active and visible to authorized users. The SOP will remain in this state until a review is due or manual revision is initiated.", 
      assignee_type: "workflow_initiator", 
      sort_order: 3 
    },
    { 
      step_type: "task_step", 
      title: "Review Due", 
      instructions: "This SOP is due for periodic review. Please:\n- Verify all information is still accurate\n- Update any outdated procedures\n- Confirm tools and systems references are current\n- Document any changes in revision history\n\nComplete review to keep the SOP active, or archive if obsolete.", 
      assignee_type: "company_admin", 
      due_offset_days: 7,
      sort_order: 4,
      config: { triggered_by: "next_review_date", notify_owner: true, escalate_if_overdue: true }
    },
    { 
      step_type: "note_step", 
      title: "Archived", 
      instructions: "This version of the SOP has been archived. Previous versions are locked and read-only for historical reference. A new version may be created to replace this SOP.", 
      assignee_type: "company_admin", 
      sort_order: 5,
      config: { applies_to: "previous_versions_only" }
    },
  ],
};

// =============================================
// ALL TEMPLATES COLLECTION
// =============================================

export const allTemplates: StarterTemplate[] = [
  // Employee Lifecycle
  onboardingIntakeForm,
  onboardingWorkflow,
  exitSurveyForm,
  offboardingWorkflow,
  // Department Requests
  itSupportRequestForm,
  itSupportWorkflow,
  facilitiesRequestForm,
  facilitiesWorkflow,
  hrRequestForm,
  hrRequestWorkflow,
  // Surveys
  pulseSurveyForm,
  trainingFeedbackForm,
  meetingEffectivenessSurvey,
  // Knowledge Management
  sopLifecycleWorkflow,
];

export const templatesByCategory: Record<TemplateCategory, StarterTemplate[]> = {
  employee_lifecycle: [onboardingIntakeForm, onboardingWorkflow, exitSurveyForm, offboardingWorkflow],
  requests: [itSupportRequestForm, itSupportWorkflow, facilitiesRequestForm, facilitiesWorkflow, hrRequestForm, hrRequestWorkflow],
  surveys: [pulseSurveyForm, trainingFeedbackForm, meetingEffectivenessSurvey],
  coaching: [],
  knowledge_management: [sopLifecycleWorkflow],
};

export const categoryLabels: Record<TemplateCategory, { label: string; description: string }> = {
  employee_lifecycle: { 
    label: "Employee Lifecycle", 
    description: "Onboarding, offboarding, and employee journey templates" 
  },
  requests: { 
    label: "Department Requests", 
    description: "IT, Facilities, and HR request workflows" 
  },
  surveys: { 
    label: "Surveys", 
    description: "Pulse surveys, training feedback, and engagement forms" 
  },
  coaching: { 
    label: "Coaching", 
    description: "Coaching and development workflow templates" 
  },
  knowledge_management: { 
    label: "Knowledge Management", 
    description: "SOP lifecycle, documentation, and compliance workflows" 
  },
};
