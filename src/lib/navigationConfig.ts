import {
  LayoutDashboard,
  CheckCircle2,
  FolderKanban,
  Calendar,
  StickyNote,
  FileText,
  Users,
  Contact,
  UserCheck,
  Heart,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Compass,
  Receipt,
  CreditCard,
  FileCheck,
  HelpCircle,
  Ticket,
  BarChart3,
  Download,
  Building2,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ModuleKey } from "@/hooks/useModuleAccess";

export interface NavItem {
  key: string;
  title: string;
  url: string;
  icon: LucideIcon;
  moduleKey?: ModuleKey;
  terminologyKey?: string; // If set, title is replaced by terminology
}

export interface NavSection {
  key: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  /** If true, only show when at least one item is enabled */
  hideIfEmpty?: boolean;
}

/**
 * Top-level navigation sections
 * Items within each section are filtered by module enablement
 */
export const navigationSections: NavSection[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { key: "dashboard", title: "Dashboard", url: "/app", icon: LayoutDashboard },
    ],
  },
  {
    key: "work",
    title: "Work",
    icon: CheckCircle2,
    items: [
      { key: "tasks", title: "Tasks", url: "/app/tasks", icon: CheckCircle2, moduleKey: "tasks" },
      { key: "projects", title: "Projects", url: "/app/projects", icon: FolderKanban, moduleKey: "projects" },
      { key: "calendar", title: "Calendar", url: "/app/calendar", icon: Calendar, moduleKey: "calendar" },
      { key: "notes", title: "Notes", url: "/app/notes", icon: StickyNote, moduleKey: "notes" },
      { key: "documents", title: "Documents", url: "/app/documents", icon: FileText, moduleKey: "documents" },
    ],
    hideIfEmpty: true,
  },
  {
    key: "relationships",
    title: "Relationships",
    icon: Users,
    items: [
      { key: "crm", title: "Clients", url: "/app/crm", icon: Users, moduleKey: "crm", terminologyKey: "crm_client" },
      { key: "contacts", title: "Contacts", url: "/app/contacts", icon: Contact, moduleKey: "crm" },
      { key: "donors", title: "Donors", url: "/app/donors", icon: Heart, moduleKey: "donors" },
      { key: "sales", title: "Sales Pipelines", url: "/app/sales", icon: TrendingUp, moduleKey: "sales" },
    ],
    hideIfEmpty: true,
  },
  {
    key: "learning",
    title: "Learning",
    icon: GraduationCap,
    items: [
      { key: "lms", title: "LMS", url: "/app/lms", icon: BookOpen, moduleKey: "lms" },
      { key: "coaches", title: "Coaches", url: "/app/coaches", icon: UserCheck, moduleKey: "coaches" },
      { key: "framework", title: "Framework", url: "/app/framework", icon: Compass },
    ],
    hideIfEmpty: true,
  },
  {
    key: "finance",
    title: "Finance",
    icon: CreditCard,
    items: [
      // Finance module items - to be implemented in future
      // Placeholder items that won't show until modules exist
      { key: "invoices", title: "Invoices", url: "/app/invoices", icon: Receipt, moduleKey: "invoices" as ModuleKey },
      { key: "payments", title: "Payments", url: "/app/payments", icon: CreditCard, moduleKey: "payments" as ModuleKey },
      { key: "receipts", title: "Receipts", url: "/app/receipts", icon: FileCheck, moduleKey: "receipts" as ModuleKey },
    ],
    hideIfEmpty: true,
  },
  {
    key: "support",
    title: "Support",
    icon: HelpCircle,
    items: [
      { key: "kb", title: "Help Center", url: "/app/support/kb", icon: HelpCircle },
      { key: "tickets", title: "My Tickets", url: "/app/support/tickets", icon: Ticket },
    ],
  },
  {
    key: "reports",
    title: "Reports",
    icon: BarChart3,
    items: [
      { key: "analytics", title: "Analytics", url: "/app/reports/analytics", icon: BarChart3, moduleKey: "analytics" as ModuleKey },
      { key: "exports", title: "Exports", url: "/app/reports/exports", icon: Download, moduleKey: "exports" as ModuleKey },
    ],
    hideIfEmpty: true,
  },
];

/**
 * Admin navigation items - shown based on role
 */
export const adminNavItems = {
  companyConsole: {
    key: "company-console",
    title: "Company Console",
    url: "/app/admin/company-console",
    icon: Building2,
  },
  plansUsage: {
    key: "plans-usage",
    title: "Plans & Usage",
    url: "/app/admin/plans-usage",
    icon: CreditCard,
  },
  siteConsole: {
    key: "site-console",
    title: "Site Console",
    url: "/app/admin/site-console",
    icon: Shield,
  },
};

/**
 * Determines which section a route belongs to for auto-expansion
 */
export function getSectionForRoute(pathname: string): string | null {
  for (const section of navigationSections) {
    for (const item of section.items) {
      if (pathname === item.url || (item.url !== "/app" && pathname.startsWith(item.url))) {
        return section.key;
      }
    }
  }
  
  // Check admin routes
  if (pathname.startsWith("/app/admin")) {
    return "admin";
  }
  
  return null;
}
