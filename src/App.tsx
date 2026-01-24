import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { MembershipProvider } from "@/lib/membership";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleGuard } from "@/components/ModuleGuard";
import { AppErrorBoundary } from "@/core/errors";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import HomePage from "@/pages/public/HomePage";
import FeaturesPage from "@/pages/public/FeaturesPage";
import PricingPage from "@/pages/public/PricingPage";
import AboutPage from "@/pages/public/AboutPage";
import ContactPage from "@/pages/public/ContactPage";
import PublicFormPage from "@/pages/public/PublicFormPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import AppDashboard from "@/pages/app/AppDashboard";
import CompanySelector from "@/pages/app/CompanySelector";
import ModulePage from "@/pages/app/ModulePage";
import ProjectsPage from "@/pages/app/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/app/projects/ProjectDetailPage";
import TasksPage from "@/pages/app/tasks/TasksPage";
import TaskDetailPage from "@/pages/app/tasks/TaskDetailPage";
import CalendarPage from "@/pages/app/calendar/CalendarPage";
import EventDetailPage from "@/pages/app/calendar/EventDetailPage";
import GroupsPage from "@/pages/app/groups/GroupsPage";
import LocationsPage from "@/pages/app/locations/LocationsPage";
import NotesPage from "@/pages/app/notes/NotesPage";
import NoteDetailPage from "@/pages/app/notes/NoteDetailPage";
import DocumentsPage from "@/pages/app/documents/DocumentsPage";
import DocumentDetailPage from "@/pages/app/documents/DocumentDetailPage";
// FoldersPage is now embedded inside Documents/Notes - no standalone route
import CompanySettingsPage from "@/pages/app/admin/CompanySettingsPage";
import CompanyConsolePage from "@/pages/app/admin/CompanyConsolePage";
import MembersPage from "@/pages/app/admin/MembersPage";
import EmployeesPage from "@/pages/app/admin/EmployeesPage";
import AuditLogPage from "@/pages/app/admin/AuditLogPage";
import PermissionsCheckPage from "@/pages/app/admin/PermissionsCheckPage";
import AdminDeferredTasksPage from "@/pages/app/admin/DeferredTasksPage";
import DevDeferredTasksPage from "@/pages/app/dev/DeferredTasksPage";
import InvitePage from "@/pages/app/InvitePage";
import SitesPage from "@/pages/app/admin/SitesPage";
import CompaniesPage from "@/pages/app/admin/CompaniesPage";
import ModulesPage from "@/pages/app/admin/ModulesPage";
import UsersPage from "@/pages/app/admin/UsersPage";
import SiteSettingsPage from "@/pages/app/admin/SiteSettingsPage";
import SiteConsolePage from "@/pages/app/admin/SiteConsolePage";
import DbCheckPage from "@/pages/app/dev/DbCheckPage";
import BootstrapPage from "@/pages/app/dev/BootstrapPage";
import DevCompaniesPage from "@/pages/app/dev/DevCompaniesPage";
import RlsTestPage from "@/pages/app/dev/RlsTestPage";
import OnboardingPage from "@/pages/app/onboarding/OnboardingPage";
import FrameworkOnboardingPage from "@/pages/app/onboarding/FrameworkOnboardingPage";
import SettingsPage from "@/pages/app/settings/SettingsPage";
import HealthPage from "@/pages/app/health/HealthPage";
import TemplatesPage from "@/pages/app/admin/TemplatesPage";
import FrameworksPage from "@/pages/app/frameworks/FrameworksPage";
import FrameworkMarketplacePage from "@/pages/app/frameworks/FrameworkMarketplacePage";
import LmsPage from "@/pages/app/lms/LmsPage";
import LmsPathsPage from "@/pages/app/lms/PathsPage";
import LmsPathDetailPage from "@/pages/app/lms/PathDetailPage";
import LmsCoursesPage from "@/pages/app/lms/CoursesPage";
import LmsCourseDetailPage from "@/pages/app/lms/CourseDetailPage";
import LmsLessonsPage from "@/pages/app/lms/LessonsPage";
import LmsLessonDetailPage from "@/pages/app/lms/LessonDetailPage";
import LmsAssignmentsPage from "@/pages/app/lms/AssignmentsPage";
import LmsReportsPage from "@/pages/app/lms/LmsReportsPage";
import AssignmentReportPage from "@/pages/app/lms/AssignmentReportPage";
import LearnerReportPage from "@/pages/app/lms/LearnerReportPage";
import MyLearningPage from "@/pages/app/lms/MyLearningPage";
import CrmPage from "@/pages/app/crm/CrmPage";
import CrmDetailPage from "@/pages/app/crm/CrmDetailPage";
import ExternalContactsPage from "@/pages/app/contacts/ExternalContactsPage";
import ExternalContactDetailPage from "@/pages/app/contacts/ExternalContactDetailPage";
import CoachesPage from "@/pages/app/coaches/CoachesPage";
import CoachDetailPage from "@/pages/app/coaches/CoachDetailPage";
import CoachingPage from "@/pages/app/coaching/CoachingPage";
import CoachHomePage from "@/pages/app/coaching/CoachHomePage";
import CoachDashboardPage from "@/pages/app/coaching/CoachDashboardPage";
import CoachClientViewPage from "@/pages/app/coaching/CoachClientViewPage";
import CoachingClientDetailPage from "@/pages/app/coaching/ClientDetailPage";
import RecommendationFormPage from "@/pages/app/coaching/RecommendationFormPage";
import PlaybooksPage from "@/pages/app/coaching/PlaybooksPage";
import CoachRequestsInbox from "@/pages/app/coaching/CoachRequestsInbox";
import PlansUsagePage from "@/pages/app/admin/PlansUsagePage";
import KnowledgeBasePage from "@/pages/app/support/KnowledgeBasePage";
import ArticleDetailPage from "@/pages/app/support/ArticleDetailPage";
import SubmitTicketPage from "@/pages/app/support/SubmitTicketPage";
import MyTicketsPage from "@/pages/app/support/MyTicketsPage";
import TicketDetailPage from "@/pages/app/support/TicketDetailPage";
import TicketDashboardPage from "@/pages/app/support/TicketDashboardPage";
import KbAdminPage from "@/pages/app/support/KbAdminPage";
import SalesPage from "@/pages/app/sales/SalesPage";
import PipelinesPage from "@/pages/app/sales/PipelinesPage";
import OpportunityDetailPage from "@/pages/app/sales/OpportunityDetailPage";
import CampaignsPage from "@/pages/app/sales/CampaignsPage";
import FinancePage from "@/pages/app/finance/FinancePage";
import InvoicesPage from "@/pages/app/finance/InvoicesPage";
import PaymentsPage from "@/pages/app/finance/PaymentsPage";
import ReceiptsPage from "@/pages/app/finance/ReceiptsPage";
import ChartOfAccountsPage from "@/pages/app/finance/ChartOfAccountsPage";
import DonorsPage from "@/pages/app/donors/DonorsPage";
import NotFound from "@/pages/NotFound";
import WorkflowsPage from "@/pages/app/workflows/WorkflowsPage";
import WorkflowDetailPage from "@/pages/app/workflows/WorkflowDetailPage";
import FormDetailPage from "@/pages/app/workflows/FormDetailPage";
import FormSubmitPage from "@/pages/app/workflows/FormSubmitPage";
import MyWorkPage from "@/pages/app/workflows/MyWorkPage";
import WorkflowRunsPage from "@/pages/app/workflows/WorkflowRunsPage";
import ReportsPage from "@/pages/app/reports/ReportsPage";
import ReportFormPage from "@/pages/app/reports/ReportFormPage";
import ReportDetailPage from "@/pages/app/reports/ReportDetailPage";
import ExportsPage from "@/pages/app/reports/ExportsPage";
import RunDetailPage from "@/pages/app/workflows/RunDetailPage";
import ValidationDashboardPage from "@/pages/app/admin/ValidationDashboardPage";
import PilotCompanyDetailPage from "@/pages/app/admin/PilotCompanyDetailPage";
import IntegrationsPage from "@/pages/app/integrations/IntegrationsPage";
import DepartmentsPage from "@/pages/app/departments/DepartmentsPage";
import DepartmentDetailPage from "@/pages/app/departments/DepartmentDetailPage";
import CoachingInspectorPage from "@/pages/app/admin/CoachingInspectorPage";
import CoachingDebugPage from "@/pages/app/admin/CoachingDebugPage";
import OrgAdminDashboard from "@/pages/app/coaching/OrgAdminDashboard";
import OrgSettingsPage from "@/pages/app/coaching/OrgSettingsPage";
import WorkflowBuilderPage from "@/pages/app/coaching/WorkflowBuilderPage";
import ManagerDashboard from "@/pages/app/coaching/ManagerDashboard";
import MemberDashboard from "@/pages/app/coaching/MemberDashboard";
import CoachFacilitatorDashboardPage from "@/pages/app/coaching/CoachFacilitatorDashboardPage";
import CoachingAdminDashboardPage from "@/pages/app/coaching/CoachingAdminDashboardPage";
import TemplateFormPage from "@/pages/app/forms/TemplateFormPage";
import FormSubmissionsListPage from "@/pages/app/forms/FormSubmissionsListPage";
import FormSubmissionDetailPage from "@/pages/app/forms/FormSubmissionDetailPage";

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
                  <Routes>
                  {/* Public Routes */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/features" element={<FeaturesPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                  </Route>
                  
                  {/* Public Form Route (no auth required) */}
                  <Route path="/f/:token" element={<PublicFormPage />} />
                  
                  {/* Auth Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  
                  {/* Invite Route */}
                  <Route path="/invite" element={<InvitePage />} />
                  
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
                    <Route path="coaches" element={<ModuleGuard moduleKey="coaches" moduleName="Coaches"><CoachesPage /></ModuleGuard>} />
                    <Route path="coaches/:coachId" element={<ModuleGuard moduleKey="coaches" moduleName="Coaches"><CoachDetailPage /></ModuleGuard>} />
                    <Route path="coaching" element={<CoachingPage />} />
                    <Route path="coaching/home" element={<CoachHomePage />} />
                    <Route path="coaching/dashboard" element={<CoachDashboardPage />} />
                    <Route path="coaching/clients/:clientId" element={<CoachClientViewPage />} />
                    <Route path="coaching/engagements/:engagementId" element={<CoachingClientDetailPage />} />
                    <Route path="coaching/recommendations/new" element={<RecommendationFormPage />} />
                    <Route path="coaching/playbooks" element={<PlaybooksPage />} />
                    <Route path="coaching/requests" element={<CoachRequestsInbox />} />
                    <Route path="coaching/org" element={<OrgAdminDashboard />} />
                    <Route path="coaching/org/settings" element={<OrgSettingsPage />} />
                    <Route path="coaching/org/workflows" element={<WorkflowBuilderPage />} />
                    <Route path="coaching/org/workflows/:workflowId" element={<WorkflowBuilderPage />} />
                    <Route path="coaching/coach" element={<CoachFacilitatorDashboardPage />} />
                    <Route path="coaching/manager" element={<ManagerDashboard />} />
                    <Route path="coaching/member" element={<MemberDashboard />} />
                    <Route path="coaching/admin" element={<CoachingAdminDashboardPage />} />
                    <Route path="support/kb" element={<KnowledgeBasePage />} />
                    <Route path="support/kb/:articleId" element={<ArticleDetailPage />} />
                    <Route path="support/kb/admin" element={<KbAdminPage />} />
                    <Route path="support/tickets" element={<MyTicketsPage />} />
                    <Route path="support/tickets/new" element={<SubmitTicketPage />} />
                    <Route path="support/tickets/:ticketId" element={<TicketDetailPage />} />
                    <Route path="support/dashboard" element={<TicketDashboardPage />} />
                    <Route path="sales" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><SalesPage /></ModuleGuard>} />
                    <Route path="sales/pipelines" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><PipelinesPage /></ModuleGuard>} />
                    <Route path="sales/opportunities/:opportunityId" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><OpportunityDetailPage /></ModuleGuard>} />
                    <Route path="sales/campaigns" element={<ModuleGuard moduleKey="sales" moduleName="Sales"><CampaignsPage /></ModuleGuard>} />
                    <Route path="finance" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><FinancePage /></ModuleGuard>} />
                    <Route path="finance/invoices" element={<ModuleGuard moduleKey="finance" moduleName="Finance"><InvoicesPage /></ModuleGuard>} />
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
                    <Route path="admin/coaching-inspector" element={<CoachingInspectorPage />} />
                    <Route path="admin/coaching-debug" element={<CoachingDebugPage />} />
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
