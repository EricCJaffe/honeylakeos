/**
 * Program Framework Registry
 * 
 * Maps program_key values to display metadata, terminology overrides,
 * and description templates for dashboard widgets.
 */

export interface ProgramFramework {
  key: string;
  displayName: string;
  shortName: string;
  terminology: Record<string, string>;
  widgetDescriptions: Record<string, string>;
  defaultSetupSteps: string[];
}

/**
 * Core framework definitions
 */
export const PROGRAM_FRAMEWORKS: Record<string, ProgramFramework> = {
  generic: {
    key: "generic",
    displayName: "Generic Coaching",
    shortName: "Generic",
    terminology: {
      coach: "Coach",
      member: "Member",
      group: "Group",
      engagement: "Engagement",
      plan: "Plan",
      goal: "Goal",
      meeting: "Meeting",
      healthCheck: "Health Check",
      workflow: "Workflow",
      form: "Form",
    },
    widgetDescriptions: {
      active_engagements: "View and manage active coaching engagements",
      coach_performance: "Track coach metrics and engagement outcomes",
      org_health_trends: "Monitor organizational health scores over time",
      org_workflows: "Manage workflow templates for your organization",
      org_forms: "Create and manage assessment forms",
      coach_workflows: "Track workflow progress for your clients",
      coach_forms: "View and send forms to your clients",
      my_workflows: "View your assigned workflows and tasks",
      my_forms: "Complete forms assigned to you",
      manager_workflows: "Monitor workflow completion across your team",
      manager_forms: "Review form submissions from your team",
      upcoming_meetings: "View your upcoming coaching sessions",
      client_goals: "Track progress on client goals",
      prep_required: "Items requiring preparation before meetings",
      active_plans: "Active coaching plans in progress",
      goals_progress: "Track your progress toward set goals",
      health_trends: "View your health check results over time",
      my_plans: "Your active coaching plans",
      my_upcoming_meetings: "Your scheduled coaching sessions",
      coaches_overview: "Overview of all coaches in the organization",
      engagement_status: "Current status of all engagements",
      overdue_workflows: "Workflows with overdue steps needing attention",
      team_meetings: "Team meeting schedule and history",
    },
    defaultSetupSteps: [
      "Create your first engagement",
      "Invite coaches to your organization",
      "Set up workflow templates",
      "Configure assessment forms",
    ],
  },
  convene: {
    key: "convene",
    displayName: "Convene Forums",
    shortName: "Convene",
    terminology: {
      coach: "Chair",
      member: "Forum Member",
      group: "Forum",
      engagement: "Forum Engagement",
      plan: "Annual Plan",
      goal: "Forum Goal",
      meeting: "Forum Session",
      healthCheck: "Forum Health Check",
      workflow: "Forum Process",
      form: "Forum Assessment",
    },
    widgetDescriptions: {
      active_engagements: "View and manage active forum cohorts and member engagements",
      coach_performance: "Track chair facilitation metrics and forum outcomes",
      org_health_trends: "Monitor forum health scores and cohort trends over time",
      org_workflows: "Manage forum launch and facilitation cadence workflows",
      org_forms: "Create assessments for forum readiness and member feedback",
      coach_workflows: "Track forum session workflows and cohort progress",
      coach_forms: "Send forum assessments and gather member feedback",
      my_workflows: "View your forum tasks and session preparation items",
      my_forms: "Complete forum assessments and feedback forms",
      manager_workflows: "Monitor chair completion of forum workflows",
      manager_forms: "Review forum health assessments across all cohorts",
      upcoming_meetings: "Your upcoming forum sessions and one-on-ones",
      client_goals: "Track forum member annual plan progress",
      prep_required: "Session prep items for upcoming forum meetings",
      active_plans: "Active annual plans for your forum members",
      goals_progress: "Track your annual plan milestones",
      health_trends: "View your forum engagement health over time",
      my_plans: "Your current annual plan and objectives",
      my_upcoming_meetings: "Your scheduled forum sessions",
      coaches_overview: "Overview of all chairs across forums",
      engagement_status: "Status of all forum cohorts",
      overdue_workflows: "Forum processes with overdue facilitation steps",
      team_meetings: "Forum session schedule across all cohorts",
    },
    defaultSetupSteps: [
      "Launch your first forum cohort",
      "Recruit and onboard chairs",
      "Configure forum facilitation workflows",
      "Set up member intake assessments",
    ],
  },
  c12: {
    key: "c12",
    displayName: "C12 Groups",
    shortName: "C12",
    terminology: {
      coach: "Chair",
      member: "C12 Member",
      group: "C12 Group",
      engagement: "Membership",
      plan: "Business Plan",
      goal: "Business Goal",
      meeting: "C12 Meeting",
      healthCheck: "Business Health Check",
      workflow: "C12 Process",
      form: "C12 Assessment",
    },
    widgetDescriptions: {
      active_engagements: "View and manage active C12 group memberships",
      coach_performance: "Track chair effectiveness and group outcomes",
      org_health_trends: "Monitor business health scores across groups",
      org_workflows: "Manage C12 group processes and chair workflows",
      org_forms: "Create business assessments and member evaluations",
      coach_workflows: "Track C12 meeting workflows and member progress",
      coach_forms: "Send business assessments to group members",
      my_workflows: "View your C12 tasks and meeting preparation",
      my_forms: "Complete business assessments and feedback",
      manager_workflows: "Monitor chair workflow completion",
      manager_forms: "Review business health assessments",
      upcoming_meetings: "Your upcoming C12 group meetings",
      client_goals: "Track member business goal progress",
      prep_required: "Meeting prep items for C12 sessions",
      active_plans: "Active business plans for your members",
      goals_progress: "Track your business goal milestones",
      health_trends: "View your business health trends",
      my_plans: "Your current business plan",
      my_upcoming_meetings: "Your scheduled C12 meetings",
      coaches_overview: "Overview of all C12 chairs",
      engagement_status: "Status of all C12 memberships",
      overdue_workflows: "C12 processes with overdue steps",
      team_meetings: "C12 meeting schedule across all groups",
    },
    defaultSetupSteps: [
      "Create your first C12 group",
      "Recruit and certify chairs",
      "Configure C12 meeting workflows",
      "Set up business health assessments",
    ],
  },
};

/**
 * Get framework by key with fallback to generic
 */
export function getFramework(programKey: string | null | undefined): ProgramFramework {
  if (!programKey) return PROGRAM_FRAMEWORKS.generic;
  return PROGRAM_FRAMEWORKS[programKey] || PROGRAM_FRAMEWORKS.generic;
}

/**
 * Get display name for a program key
 */
export function getFrameworkDisplayName(programKey: string | null | undefined): string {
  return getFramework(programKey).displayName;
}

/**
 * Get short name for badges
 */
export function getFrameworkShortName(programKey: string | null | undefined): string {
  return getFramework(programKey).shortName;
}

/**
 * Get terminology for a specific term
 */
export function getFrameworkTerm(
  programKey: string | null | undefined,
  termKey: string,
  defaultValue?: string
): string {
  const framework = getFramework(programKey);
  return framework.terminology[termKey] || defaultValue || termKey;
}

/**
 * Get widget description with program-specific language
 */
export function getWidgetDescription(
  programKey: string | null | undefined,
  widgetKey: string,
  fallbackDescription?: string | null
): string {
  const framework = getFramework(programKey);
  return framework.widgetDescriptions[widgetKey] || fallbackDescription || "";
}

/**
 * Format program badge text
 */
export function formatProgramBadge(
  programKey: string | null | undefined,
  version?: string | number | null
): string {
  const framework = getFramework(programKey);
  const versionSuffix = version ? ` v${version}` : "";
  return `${framework.shortName}${versionSuffix}`;
}

/**
 * Get all available framework keys
 */
export function getAvailableFrameworks(): string[] {
  return Object.keys(PROGRAM_FRAMEWORKS);
}

/**
 * Get framework options for selectors
 */
export function getFrameworkOptions(): Array<{ value: string; label: string }> {
  return Object.values(PROGRAM_FRAMEWORKS).map((f) => ({
    value: f.key,
    label: f.displayName,
  }));
}
