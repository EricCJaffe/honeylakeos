import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { MembershipProvider } from "@/lib/membership";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleGuard } from "@/components/ModuleGuard";
import { AppErrorBoundary } from "@/core/errors";
import { AppLayout } from "@/components/layout/AppLayout";
const PublicFormPage = React.lazy(() => import("@/pages/public/PublicFormPage"));
const AiSmokeStandalonePage = React.lazy(() => import("@/pages/AiSmokeStandalonePage"));
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const SignUpPage = React.lazy(() => import("@/pages/auth/SignUpPage"));
const ResetPasswordPage = React.lazy(() => import("@/pages/auth/ResetPasswordPage"));
const AppDashboard = React.lazy(() => import("@/pages/app/AppDashboard"));
const CompanySelector = React.lazy(() => import("@/pages/app/CompanySelector"));
const ProjectsPage = React.lazy(() => import("@/pages/app/projects/ProjectsPage"));
const ProjectDetailPage = React.lazy(() => import("@/pages/app/projects/ProjectDetailPage"));
const TasksPage = React.lazy(() => import("@/pages/app/tasks/TasksPage"));
const TaskDetailPage = React.lazy(() => import("@/pages/app/tasks/TaskDetailPage"));
const CalendarPage = React.lazy(() => import("@/pages/app/calendar/CalendarPage"));
const EventDetailPage = React.lazy(() => import("@/pages/app/calendar/EventDetailPage"));
const GroupsPage = React.lazy(() => import("@/pages/app/groups/GroupsPage"));
const LocationsPage = React.lazy(() => import("@/pages/app/locations/LocationsPage"));
const NotesPage = React.lazy(() => import("@/pages/app/notes/NotesPage"));
const NoteDetailPage = React.lazy(() => import("@/pages/app/notes/NoteDetailPage"));
const DocumentsPage = React.lazy(() => import("@/pages/app/documents/DocumentsPage"));
const DocumentDetailPage = React.lazy(() => import("@/pages/app/documents/DocumentDetailPage"));
const CompanySettingsPage = React.lazy(() => import("@/pages/app/admin/CompanySettingsPage"));
const CompanyConsolePage = React.lazy(() => import("@/pages/app/admin/CompanyConsolePage"));
const MembersPage = React.lazy(() => import("@/pages/app/admin/MembersPage"));
const EmployeesPage = React.lazy(() => import("@/pages/app/admin/EmployeesPage"));
const AuditLogPage = React.lazy(() => import("@/pages/app/admin/AuditLogPage"));
const PermissionsCheckPage = React.lazy(() => import("@/pages/app/admin/PermissionsCheckPage"));
const AdminDeferredTasksPage = React.lazy(() => import("@/pages/app/admin/DeferredTasksPage"));
const DevDeferredTasksPage = React.lazy(() => import("@/pages/app/dev/DeferredTasksPage"));
const InvitePage = React.lazy(() => import("@/pages/app/InvitePage"));
const SitesPage = React.lazy(() => import("@/pages/app/admin/SitesPage"));
const CompaniesPage = React.lazy(() => import("@/pages/app/admin/CompaniesPage"));
const ModulesPage = React.lazy(() => import("@/pages/app/admin/ModulesPage"));
const UsersPage = React.lazy(() => import("@/pages/app/admin/UsersPage"));
const SiteSettingsPage = React.lazy(() => import("@/pages/app/admin/SiteSettingsPage"));
const SiteConsolePage = React.lazy(() => import("@/pages/app/admin/SiteConsolePage"));
const DbCheckPage = React.lazy(() => import("@/pages/app/dev/DbCheckPage"));
const BootstrapPage = React.lazy(() => import("@/pages/app/dev/BootstrapPage"));
const DevCompaniesPage = React.lazy(() => import("@/pages/app/dev/DevCompaniesPage"));
const RlsTestPage = React.lazy(() => import("@/pages/app/dev/RlsTestPage"));
const OnboardingPage = React.lazy(() => import("@/pages/app/onboarding/OnboardingPage"));
const FrameworkOnboardingPage = React.lazy(() => import("@/pages/app/onboarding/FrameworkOnboardingPage"));
const SettingsPage = React.lazy(() => import("@/pages/app/settings/SettingsPage"));
const HealthPage = React.lazy(() => import("@/pages/app/health/HealthPage"));
const TemplatesPage = React.lazy(() => import("@/pages/app/admin/TemplatesPage"));
const FrameworksPage = React.lazy(() => import("@/pages/app/frameworks/FrameworksPage"));
const FrameworkMarketplacePage = React.lazy(() => import("@/pages/app/frameworks/FrameworkMarketplacePage"));
const LmsPage = React.lazy(() => import("@/pages/app/lms/LmsPage"));
const LmsPathsPage = React.lazy(() => import("@/pages/app/lms/PathsPage"));
const LmsPathDetailPage = React.lazy(() => import("@/pages/app/lms/PathDetailPage"));
const LmsCoursesPage = React.lazy(() => import("@/pages/app/lms/CoursesPage"));
const LmsCourseDetailPage = React.lazy(() => import("@/pages/app/lms/CourseDetailPage"));
const LmsLessonsPage = React.lazy(() => import("@/pages/app/lms/LessonsPage"));
const LmsLessonDetailPage = React.lazy(() => import("@/pages/app/lms/LessonDetailPage"));
const LmsAssignmentsPage = React.lazy(() => import("@/pages/app/lms/AssignmentsPage"));
const LmsReportsPage = React.lazy(() => import("@/pages/app/lms/LmsReportsPage"));
const AssignmentReportPage = React.lazy(() => import("@/pages/app/lms/AssignmentReportPage"));
const LearnerReportPage = React.lazy(() => import("@/pages/app/lms/LearnerReportPage"));
const MyLearningPage = React.lazy(() => import("@/pages/app/lms/MyLearningPage"));
const CrmPage = React.lazy(() => import("@/pages/app/crm/CrmPage"));
const CrmDetailPage = React.lazy(() => import("@/pages/app/crm/CrmDetailPage"));
const ExternalContactsPage = React.lazy(() => import("@/pages/app/contacts/ExternalContactsPage"));
const ExternalContactDetailPage = React.lazy(() => import("@/pages/app/contacts/ExternalContactDetailPage"));
const PlansUsagePage = React.lazy(() => import("@/pages/app/admin/PlansUsagePage"));
const KnowledgeBasePage = React.lazy(() => import("@/pages/app/support/KnowledgeBasePage"));
const ArticleDetailPage = React.lazy(() => import("@/pages/app/support/ArticleDetailPage"));
const SubmitTicketPage = React.lazy(() => import("@/pages/app/support/SubmitTicketPage"));
const MyTicketsPage = React.lazy(() => import("@/pages/app/support/MyTicketsPage"));
const TicketDetailPage = React.lazy(() => import("@/pages/app/support/TicketDetailPage"));
const TicketDashboardPage = React.lazy(() => import("@/pages/app/support/TicketDashboardPage"));
const KbAdminPage = React.lazy(() => import("@/pages/app/support/KbAdminPage"));
const SalesPage = React.lazy(() => import("@/pages/app/sales/SalesPage"));
const QuotesPage = React.lazy(() => import("@/pages/app/sales/QuotesPage"));
const QuoteDetailPage = React.lazy(() => import("@/pages/app/sales/QuoteDetailPage"));
const PipelinesPage = React.lazy(() => import("@/pages/app/sales/PipelinesPage"));
const OpportunityDetailPage = React.lazy(() => import("@/pages/app/sales/OpportunityDetailPage"));
const CampaignsPage = React.lazy(() => import("@/pages/app/sales/CampaignsPage"));
const FinancePage = React.lazy(() => import("@/pages/app/finance/FinancePage"));
const InvoicesPage = React.lazy(() => import("@/pages/app/finance/InvoicesPage"));
const InvoiceDetailPage = React.lazy(() => import("@/pages/app/finance/InvoiceDetailPage"));
const PaymentsPage = React.lazy(() => import("@/pages/app/finance/PaymentsPage"));
const ReceiptsPage = React.lazy(() => import("@/pages/app/finance/ReceiptsPage"));
const ChartOfAccountsPage = React.lazy(() => import("@/pages/app/finance/ChartOfAccountsPage"));
const DonorsPage = React.lazy(() => import("@/pages/app/donors/DonorsPage"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const WorkflowsPage = React.lazy(() => import("@/pages/app/workflows/WorkflowsPage"));
const WorkflowDetailPage = React.lazy(() => import("@/pages/app/workflows/WorkflowDetailPage"));
const FormDetailPage = React.lazy(() => import("@/pages/app/workflows/FormDetailPage"));
const FormSubmitPage = React.lazy(() => import("@/pages/app/workflows/FormSubmitPage"));
const MyWorkPage = React.lazy(() => import("@/pages/app/workflows/MyWorkPage"));
const WorkflowRunsPage = React.lazy(() => import("@/pages/app/workflows/WorkflowRunsPage"));
const ReportsPage = React.lazy(() => import("@/pages/app/reports/ReportsPage"));
const ReportFormPage = React.lazy(() => import("@/pages/app/reports/ReportFormPage"));
const ReportDetailPage = React.lazy(() => import("@/pages/app/reports/ReportDetailPage"));
const ExportsPage = React.lazy(() => import("@/pages/app/reports/ExportsPage"));
const RunDetailPage = React.lazy(() => import("@/pages/app/workflows/RunDetailPage"));
const ValidationDashboardPage = React.lazy(() => import("@/pages/app/admin/ValidationDashboardPage"));
const PilotCompanyDetailPage = React.lazy(() => import("@/pages/app/admin/PilotCompanyDetailPage"));
const AiSmokeTestPage = React.lazy(() => import("@/pages/app/admin/AiSmokeTestPage"));
const IntegrationsPage = React.lazy(() => import("@/pages/app/integrations/IntegrationsPage"));
const DepartmentsPage = React.lazy(() => import("@/pages/app/departments/DepartmentsPage"));
const DepartmentDetailPage = React.lazy(() => import("@/pages/app/departments/DepartmentDetailPage"));
const TemplateFormPage = React.lazy(() => import("@/pages/app/forms/TemplateFormPage"));
const FormSubmissionsListPage = React.lazy(() => import("@/pages/app/forms/FormSubmissionsListPage"));
const FormSubmissionDetailPage = React.lazy(() => import("@/pages/app/forms/FormSubmissionDetailPage"));

const queryClient = new QueryClient();

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <MembershipProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
                  <Routes>
                  {/* Root redirects to login */}
                  <Route path="/" element={<Navigate to="/login" replace />} />

                  {/* Public Form Route (no auth required) */}
                  <Route path="/f/:token" element={<PublicFormPage />} />
                  
                  {/* Auth Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/auth/reset" element={<ResetPasswordPage />} />
                  
                  {/* Invite Route */}
                  <Route path="/invite" element={<InvitePage />} />

                  {/* Standalone admin utility route outside app shell */}
                  <Route
                    path="/ai-smoke"
                    element={
                      <ProtectedRoute>
                        <AiSmokeStandalonePage />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Company Selection */}
                  <Route
                    path="/app/select-company"
                    element={
                      <ProtectedRoute>
                        <CompanySelector />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Protected App Routes */}
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AppDashboard />} />
                    <Route path="onboarding" element={<OnboardingPage />} />
                    <Route path="onboarding/framework" element={<FrameworkOnboardingPage />} />
                    <Route path="projects" element={<ModuleGuard moduleKey="projects" moduleName="Projects"><ProjectsPage /></ModuleGuard>} />
                    <Route path="projects/:projectId" element={<ModuleGuard moduleKey="projects" moduleName="Projects"><ProjectDetailPage /></ModuleGuard>} />
                    <Route path="tasks" element={<ModuleGuard moduleKey="tasks" moduleName="Tasks"><TasksPage /></ModuleGuard>} />
                    <Route path="tasks/:taskId" element={<ModuleGuard moduleKey="tasks" moduleName="Tasks"><TaskDetailPage /></ModuleGuard>} />
                    <Route path="calendar" element={<ModuleGuard moduleKey="calendar" moduleName="Calendar"><CalendarPage /></ModuleGuard>} />
                    <Route path="calendar/:eventId" element={<ModuleGuard moduleKey="calendar" moduleName="Calendar"><EventDetailPage /></ModuleGuard>} />
                    <Route path="org/groups" element={<ModuleGuard moduleKey="groups" moduleName="Groups"><GroupsPage /></ModuleGuard>} />
                    <Route path="org/locations" element={<ModuleGuard moduleKey="locations" moduleName="Locations"><LocationsPage /></ModuleGuard>} />
                    <Route path="groups" element={<ModuleGuard moduleKey="groups" moduleName="Groups"><GroupsPage /></ModuleGuard>} /> {/* Legacy route alias */}
                    <Route path="notes" element={<ModuleGuard moduleKey="notes" moduleName="Notes"><NotesPage /></ModuleGuard>} />
                    <Route path="notes/:noteId" element={<ModuleGuard moduleKey="notes" moduleName="Notes"><NoteDetailPage /></ModuleGuard>} />
                    <Route path="documents" element={<ModuleGuard moduleKey="documents" moduleName="Documents"><DocumentsPage /></ModuleGuard>} />
                    <Route path="documents/:documentId" element={<ModuleGuard moduleKey="documents" moduleName="Documents"><DocumentDetailPage /></ModuleGuard>} />
                    <Route path="forms" element={<ModuleGuard moduleKey="forms" moduleName="Forms"><WorkflowsPage /></ModuleGuard>} />
                    <Route path="forms/:templateKey" element={<TemplateFormPage />} />
                    <Route path="forms/submissions" element={<FormSubmissionsListPage />} />
                    <Route path="forms/submissions/:submissionId" element={<FormSubmissionDetailPage />} />
                    <Route path="workflows" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><WorkflowsPage /></ModuleGuard>} />
                    <Route path="workflows/:workflowId" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><WorkflowDetailPage /></ModuleGuard>} />
                    <Route path="workflows/forms/:formId" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><FormDetailPage /></ModuleGuard>} />
                    <Route path="workflows/forms/:formId/submit" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><FormSubmitPage /></ModuleGuard>} />
                    <Route path="workflows/my-work" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><MyWorkPage /></ModuleGuard>} />
                    <Route path="workflows/runs" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><WorkflowRunsPage /></ModuleGuard>} />
                    <Route path="workflows/runs/:runId" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><RunDetailPage /></ModuleGuard>} />
                    <Route path="workflows/submissions/:submissionId" element={<FormSubmissionDetailPage />} />
                    <Route path="lms" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsPage /></ModuleGuard>} />
                    <Route path="lms/my-learning" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><MyLearningPage /></ModuleGuard>} />
                    <Route path="lms/paths" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsPathsPage /></ModuleGuard>} />
                    <Route path="lms/paths/:pathId" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsPathDetailPage /></ModuleGuard>} />
                    <Route path="lms/courses" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsCoursesPage /></ModuleGuard>} />
                    <Route path="lms/courses/:courseId" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsCourseDetailPage /></ModuleGuard>} />
                    <Route path="lms/lessons" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsLessonsPage /></ModuleGuard>} />
                    <Route path="lms/lessons/:lessonId" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsLessonDetailPage /></ModuleGuard>} />
                    <Route path="lms/assignments" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsAssignmentsPage /></ModuleGuard>} />
                    <Route path="lms/reports" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsReportsPage /></ModuleGuard>} />
                    <Route path="lms/reports/assignment/:assignmentId" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><AssignmentReportPage /></ModuleGuard>} />
                    <Route path="lms/reports/learner/:userId" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LearnerReportPage /></ModuleGuard>} />
                    <Route path="crm" element={<ModuleGuard moduleKey="crm" moduleName="CRM"><CrmPage /></ModuleGuard>} />
                    <Route path="crm/:clientId" element={<ModuleGuard moduleKey="crm" moduleName="CRM"><CrmDetailPage /></ModuleGuard>} />
                    <Route path="contacts" element={<ModuleGuard moduleKey="crm" moduleName="Contacts"><ExternalContactsPage /></ModuleGuard>} />
                    <Route path="contacts/:contactId" element={<ModuleGuard moduleKey="crm" moduleName="Contacts"><ExternalContactDetailPage /></ModuleGuard>} />
                    <Route path="support/kb" element={<KnowledgeBasePage />} />
                    <Route path="support/kb/:articleId" element={<ArticleDetailPage />} />
                    <Route path="support/kb/admin" element={<KbAdminPage />} />
                    <Route path="support/tickets" element={<MyTicketsPage />} />
                    <Route path="support/tickets/new" element={<SubmitTicketPage />} />
                    <Route path="support/tickets/:ticketId" element={<TicketDetailPage />} />
                    <Route path="support/dashboard" element={<TicketDashboardPage />} />
                    <Route path="sales" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><SalesPage /></ModuleGuard>} />
                    <Route path="sales/quotes" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><QuotesPage /></ModuleGuard>} />
                    <Route path="sales/quotes/:quoteId" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><QuoteDetailPage /></ModuleGuard>} />
                    <Route path="sales/pipelines" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><PipelinesPage /></ModuleGuard>} />
                    <Route path="sales/opportunities/:opportunityId" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><OpportunityDetailPage /></ModuleGuard>} />
                    <Route path="sales/campaigns" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><CampaignsPage /></ModuleGuard>} />
                    <Route path="finance" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><FinancePage /></ModuleGuard>} />
                    <Route path="finance/invoices" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><InvoicesPage /></ModuleGuard>} />
                    <Route path="finance/invoices/:invoiceId" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><InvoiceDetailPage /></ModuleGuard>} />
                    <Route path="finance/payments" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><PaymentsPage /></ModuleGuard>} />
                    <Route path="finance/receipts" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><ReceiptsPage /></ModuleGuard>} />
                    <Route path="finance/accounts" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><ChartOfAccountsPage /></ModuleGuard>} />
                    <Route path="donors" element={<ModuleGuard moduleKey="donors" moduleName="Donors"><DonorsPage /></ModuleGuard>} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="reports/new" element={<ReportFormPage />} />
                    <Route path="reports/exports" element={<ExportsPage />} />
                    <Route path="reports/:reportId" element={<ReportDetailPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="health" element={<HealthPage />} />
                    <Route path="integrations" element={<IntegrationsPage />} />
                    <Route path="departments" element={<DepartmentsPage />} />
                    <Route path="departments/:departmentId" element={<DepartmentDetailPage />} />
                    <Route path="framework" element={<FrameworksPage />} />
                    <Route path="framework/marketplace" element={<FrameworkMarketplacePage />} />
                    <Route path="admin/company-console" element={<CompanyConsolePage />} />
                    <Route path="admin/company" element={<CompanySettingsPage />} />
                    <Route path="admin/members" element={<MembersPage />} />
                    <Route path="admin/employees" element={<EmployeesPage />} />
                    <Route path="admin/audit-log" element={<AuditLogPage />} />
                    <Route path="admin/permissions-check" element={<PermissionsCheckPage />} />
                    <Route path="admin/deferred" element={<AdminDeferredTasksPage />} />
                    <Route path="admin/templates" element={<TemplatesPage />} />
                    <Route path="admin/plans-usage" element={<PlansUsagePage />} />
                    <Route path="admin/site-console" element={<SiteConsolePage />} />
                    <Route path="admin/validation" element={<ValidationDashboardPage />} />
                    <Route path="admin/validation/:companyId" element={<PilotCompanyDetailPage />} />
                    <Route path="admin/ai-smoke" element={<AiSmokeTestPage />} />
                    <Route path="admin/sites" element={<SitesPage />} />
                    <Route path="admin/companies" element={<CompaniesPage />} />
                    <Route path="admin/users" element={<UsersPage />} />
                    <Route path="admin/modules" element={<ModulesPage />} />
                    <Route path="admin/settings" element={<SiteSettingsPage />} />
                    <Route path="dev/db-check" element={<DbCheckPage />} />
                    <Route path="dev/bootstrap" element={<BootstrapPage />} />
                    <Route path="dev/companies" element={<DevCompaniesPage />} />
                    <Route path="dev/rls-test" element={<RlsTestPage />} />
                    <Route path="dev/deferred" element={<DevDeferredTasksPage />} />
                  </Route>
                  
                  {/* Catch all */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                  </React.Suspense>
                </BrowserRouter>
            </TooltipProvider>
          </MembershipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
  );
}

export default App;
