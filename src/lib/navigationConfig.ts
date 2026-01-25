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
  Plug,
  Landmark,
  FileSpreadsheet,
  Calculator,
  Scale,
  Wallet,
  ClipboardList,
  Workflow,
  Inbox,
  Briefcase,
  UserCog,
  UsersRound,
  Settings2,
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
  financeMode?: "builtin_books" | "external_reporting"; // Filter by finance mode
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
 * Finance navigation items for Built-in Books mode
 */
export const builtinBooksNavItems: NavItem[] = [
  { key: "finance-dashboard", title: "Dashboard", url: "/app/finance", icon: LayoutDashboard, moduleKey: "finance" },
  { key: "banking", title: "Banking", url: "/app/finance/banking", icon: Landmark, moduleKey: "finance" },
  { key: "invoices", title: "Invoices (AR)", url: "/app/finance/invoices", icon: Receipt, moduleKey: "finance" },
  { key: "bills", title: "Bills (AP)", url: "/app/finance/bills", icon: FileSpreadsheet, moduleKey: "finance" },
  { key: "chart-of-accounts", title: "Chart of Accounts", url: "/app/finance/accounts", icon: Calculator, moduleKey: "finance" },
  { key: "journal-entries", title: "Journal Entries", url: "/app/finance/journal", icon: Scale, moduleKey: "finance" },
  { key: "reconciliation", title: "Reconciliation", url: "/app/finance/reconciliation", icon: CheckCircle2, moduleKey: "finance" },
  { key: "finance-reports", title: "Reports", url: "/app/finance/reports", icon: BarChart3, moduleKey: "finance" },
];

/**
 * Finance navigation items for External Reporting mode
 */
export const externalReportingNavItems: NavItem[] = [
  { key: "finance-dashboard", title: "Dashboard", url: "/app/finance", icon: LayoutDashboard, moduleKey: "finance" },
  { key: "imports", title: "Imports", url: "/app/finance/imports", icon: Download, moduleKey: "finance" },
  { key: "statements", title: "Statements", url: "/app/finance/statements", icon: FileSpreadsheet, moduleKey: "finance" },
  { key: "ar-ap-summary", title: "AR/AP Summary", url: "/app/finance/ar-ap", icon: Wallet, moduleKey: "finance" },
  { key: "metrics", title: "Metrics", url: "/app/finance/metrics", icon: TrendingUp, moduleKey: "finance" },
  { key: "finance-reports", title: "Reports", url: "/app/finance/reports", icon: BarChart3, moduleKey: "finance" },
];

/**
 * Default finance nav items when no mode is selected
 */
export const defaultFinanceNavItems: NavItem[] = [
  { key: "finance", title: "Overview", url: "/app/finance", icon: CreditCard, moduleKey: "finance" },
  { key: "invoices", title: "Invoices", url: "/app/finance/invoices", icon: Receipt, moduleKey: "finance" },
  { key: "payments", title: "Payments", url: "/app/finance/payments", icon: CreditCard, moduleKey: "finance" },
  { key: "receipts", title: "Receipts", url: "/app/finance/receipts", icon: FileCheck, moduleKey: "finance" },
];

/**
 * Get finance section title based on mode
 */
export function getFinanceSectionTitle(financeMode: "builtin_books" | "external_reporting" | null | undefined): string {
  if (financeMode === "builtin_books") {
    return "Accounting";
  }
  if (financeMode === "external_reporting") {
    return "Financial Insights";
  }
  return "Finance";
}

/**
 * Get finance nav items based on mode
 */
export function getFinanceNavItems(financeMode: "builtin_books" | "external_reporting" | null | undefined): NavItem[] {
  if (financeMode === "builtin_books") {
    return builtinBooksNavItems;
  }
  if (financeMode === "external_reporting") {
    return externalReportingNavItems;
  }
  return defaultFinanceNavItems;
}

/**
 * Top-level navigation sections (excluding finance which is dynamic)
 */
export const baseNavigationSections: NavSection[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { key: "dashboard", title: "Dashboard", url: "/app", icon: LayoutDashboard },
    ],
  },
  {
    key: "departments",
    title: "Departments",
    icon: Building2,
    items: [
      { key: "departments", title: "Departments", url: "/app/departments", icon: Building2 },
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
      { key: "my-work", title: "My Work", url: "/app/workflows/my-work", icon: Inbox, moduleKey: "workflows" },
      { key: "forms", title: "Forms", url: "/app/forms", icon: ClipboardList, moduleKey: "forms" },
      { key: "workflows", title: "Workflows", url: "/app/workflows", icon: Workflow, moduleKey: "workflows" },
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
];

/**
 * Get navigation sections with dynamic finance section based on mode
 */
export function getNavigationSections(financeMode: "builtin_books" | "external_reporting" | null | undefined): NavSection[] {
  const financeSection: NavSection = {
    key: "finance",
    title: getFinanceSectionTitle(financeMode),
    icon: CreditCard,
    items: getFinanceNavItems(financeMode),
    hideIfEmpty: true,
  };

  const supportSection: NavSection = {
    key: "support",
    title: "Support",
    icon: HelpCircle,
    items: [
      { key: "kb", title: "Help Center", url: "/app/support/kb", icon: HelpCircle },
      { key: "tickets", title: "My Tickets", url: "/app/support/tickets", icon: Ticket },
    ],
  };

  const reportsSection: NavSection = {
    key: "reports",
    title: "Reports",
    icon: BarChart3,
    items: [
      { key: "analytics", title: "Analytics", url: "/app/reports", icon: BarChart3, moduleKey: "reports" },
      { key: "exports", title: "Exports", url: "/app/reports/exports", icon: Download, moduleKey: "reports" },
    ],
    hideIfEmpty: true,
  };

  return [...baseNavigationSections, financeSection, supportSection, reportsSection];
}

/**
 * Legacy export for backwards compatibility
 */
export const navigationSections = getNavigationSections(null);

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
  integrations: {
    key: "integrations",
    title: "Integrations",
    url: "/app/integrations",
    icon: Plug,
  },
  siteConsole: {
    key: "site-console",
    title: "Site Console",
    url: "/app/admin/site-console",
    icon: Shield,
  },
  coachingInspector: {
    key: "coaching-inspector",
    title: "Coaching Inspector",
    url: "/app/admin/coaching-inspector",
    icon: Users,
  },
};

/**
 * Coaching navigation items - shown based on coaching roles
 */
export const coachingNavItems = {
  orgDashboard: {
    key: "coaching-org",
    title: "Org Dashboard",
    url: "/app/coaching/org",
    icon: Building2,
  },
  coachDashboard: {
    key: "coaching-coach",
    title: "Coach Dashboard",
    url: "/app/coaching/coach",
    icon: UserCog,
  },
  memberDashboard: {
    key: "coaching-member",
    title: "Member Dashboard",
    url: "/app/coaching/member",
    icon: UsersRound,
  },
  adminDashboard: {
    key: "coaching-admin",
    title: "Coaching Admin",
    url: "/app/coaching/admin",
    icon: Settings2,
  },
};

/**
 * Determines which section a route belongs to for auto-expansion
 */
export function getSectionForRoute(pathname: string): string | null {
  const sections = getNavigationSections(null);
  
  for (const section of sections) {
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
