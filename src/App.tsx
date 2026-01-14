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
import CalendarPage from "@/pages/app/calendar/CalendarPage";
import GroupsPage from "@/pages/app/groups/GroupsPage";
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
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="groups" element={<GroupsPage />} />
                    <Route path="documents" element={<ModulePage />} />
                    <Route path="notes" element={<ModulePage />} />
                    <Route path="forms" element={<ModulePage />} />
                    <Route path="workflows" element={<ModulePage />} />
                    <Route path="lms" element={<ModulePage />} />
                    <Route path="settings" element={<ModulePage />} />
                    <Route path="team" element={<GroupsPage />} />
                    <Route path="company-settings" element={<ModulePage />} />
                    <Route path="admin" element={<ModulePage />} />
                    <Route path="admin/companies" element={<ModulePage />} />
                    <Route path="admin/users" element={<ModulePage />} />
                    <Route path="admin/modules" element={<ModulePage />} />
                    <Route path="admin/settings" element={<ModulePage />} />
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
