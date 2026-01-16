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
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import HomePage from "@/pages/public/HomePage";
import FeaturesPage from "@/pages/public/FeaturesPage";
import PricingPage from "@/pages/public/PricingPage";
import AboutPage from "@/pages/public/AboutPage";
import ContactPage from "@/pages/public/ContactPage";
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
import SettingsPage from "@/pages/app/settings/SettingsPage";
import TemplatesPage from "@/pages/app/admin/TemplatesPage";
import LmsPage from "@/pages/app/lms/LmsPage";
import LmsPathsPage from "@/pages/app/lms/PathsPage";
import LmsCoursesPage from "@/pages/app/lms/CoursesPage";
import LmsLessonsPage from "@/pages/app/lms/LessonsPage";
import LmsAssignmentsPage from "@/pages/app/lms/AssignmentsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
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
                    <Route path="forms" element={<ModuleGuard moduleKey="forms" moduleName="Forms"><ModulePage /></ModuleGuard>} />
                    <Route path="workflows" element={<ModuleGuard moduleKey="workflows" moduleName="Workflows"><ModulePage /></ModuleGuard>} />
                    <Route path="lms" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsPage /></ModuleGuard>} />
                    <Route path="lms/paths" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsPathsPage /></ModuleGuard>} />
                    <Route path="lms/courses" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsCoursesPage /></ModuleGuard>} />
                    <Route path="lms/lessons" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsLessonsPage /></ModuleGuard>} />
                    <Route path="lms/assignments" element={<ModuleGuard moduleKey="lms" moduleName="LMS"><LmsAssignmentsPage /></ModuleGuard>} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="admin/company-console" element={<CompanyConsolePage />} />
                    <Route path="admin/company" element={<CompanySettingsPage />} />
                    <Route path="admin/members" element={<MembersPage />} />
                    <Route path="admin/employees" element={<EmployeesPage />} />
                    <Route path="admin/audit-log" element={<AuditLogPage />} />
                    <Route path="admin/permissions-check" element={<PermissionsCheckPage />} />
                    <Route path="admin/deferred" element={<AdminDeferredTasksPage />} />
                    <Route path="admin/templates" element={<TemplatesPage />} />
                    <Route path="admin/site-console" element={<SiteConsolePage />} />
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
  );
}

export default App;
