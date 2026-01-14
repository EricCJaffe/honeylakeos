import { LogOut, User, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { toast } from "sonner";

const routeTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/projects": "Projects",
  "/app/tasks": "Tasks",
  "/app/calendar": "Calendar",
  "/app/documents": "Documents",
  "/app/notes": "Notes",
  "/app/folders": "Folders",
  "/app/forms": "Forms",
  "/app/workflows": "Workflows",
  "/app/groups": "Groups",
  "/app/settings": "Settings",
  "/app/admin/company": "Company Settings",
  "/app/admin/members": "Team Members",
  "/app/admin/companies": "Companies",
  "/app/admin/users": "All Users",
  "/app/admin/modules": "Modules",
  "/app/admin/settings": "Site Settings",
  "/app/admin/sites": "Sites",
  "/app/dev/db-check": "Database Check",
  "/app/dev/bootstrap": "System Bootstrap",
};

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }
  
  // Check for dynamic routes
  if (pathname.startsWith("/app/projects/")) return "Project Details";
  if (pathname.startsWith("/app/notes/")) return "Note Details";
  if (pathname.startsWith("/app/documents/")) return "Document Details";
  
  // Fallback
  return "BusinessOS";
}

export function AppTopbar() {
  const { user, signOut } = useAuth();
  const { isSiteAdmin, isSuperAdmin, isCompanyAdmin } = useMembership();
  const navigate = useNavigate();
  const location = useLocation();

  const firstName = user?.user_metadata?.first_name || "";
  const lastName = user?.user_metadata?.last_name || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  const displayName = firstName || user?.email?.split("@")[0] || "User";
  const pageTitle = getPageTitle(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <CompanySwitcher />
        
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {(isSuperAdmin || isSiteAdmin || isCompanyAdmin) && (
                  <p className="text-xs text-primary font-medium capitalize">
                    {isSuperAdmin ? "Super Admin" : isSiteAdmin ? "Site Admin" : "Company Admin"}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/app/settings")}>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            {(isSiteAdmin || isSuperAdmin) && (
              <DropdownMenuItem onClick={() => navigate("/app/admin/companies")}>
                <Shield className="mr-2 h-4 w-4" />
                Site Administration
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
