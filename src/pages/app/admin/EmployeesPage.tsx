import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
  Pencil,
  Link2,
  Link2Off,
  ShieldX,
  UserCheck,
  UserX,
  Mail,
  Send,
  Trash2,
  Clock,
  Copy,
  RotateCcw,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import type { Tables } from "@/integrations/supabase/types";

type Employee = Tables<"employees">;
type EmployeeInvite = Tables<"employee_invites">;

interface EmployeeFormData {
  full_name: string;
  email: string;
  title: string;
}

interface InviteWithEmployee extends EmployeeInvite {
  employees: { full_name: string } | null;
}

const INVITE_ROLES = [
  { value: "user", label: "User" },
  { value: "company_admin", label: "Company Admin" },
  { value: "location_admin", label: "Location Admin" },
  { value: "module_admin", label: "Module Admin" },
  { value: "external", label: "External" },
];

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    activeCompanyId,
    activeCompany,
    isCompanyAdmin,
    isSiteAdmin,
    isSuperAdmin,
  } = useMembership();

  const [searchQuery, setSearchQuery] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: "",
    email: "",
    title: "",
  });

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmployee, setInviteEmployee] = useState<Employee | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("user");

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const hasAdminAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Get APP_URL from window location
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Fetch employees (exclude archived for main view)
  const {
    data: employees = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employees", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", activeCompanyId)
        .neq("status", "archived")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!activeCompanyId,
  });

  // Fetch archived employees
  const {
    data: archivedEmployees = [],
    isLoading: isLoadingArchived,
    refetch: refetchArchived,
  } = useQuery({
    queryKey: ["employees-archived", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("status", "archived")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!activeCompanyId && hasAdminAccess,
  });

  // Fetch pending invites
  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ["employee-invites", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("employee_invites")
        .select(`
          *,
          employees(full_name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InviteWithEmployee[];
    },
    enabled: !!activeCompanyId && hasAdminAccess,
  });

  // Filter by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.title?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase.from("employees").insert({
        company_id: activeCompanyId,
        full_name: data.full_name,
        email: data.email.trim() || null,
        title: data.title.trim() || null,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee added successfully");
      closeFormDialog();
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("An employee with this email already exists in this company.");
      } else if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to add employees.");
      } else {
        toast.error(`Failed to add employee: ${error.message}`);
      }
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeFormData> }) => {
      const { error } = await supabase
        .from("employees")
        .update({
          full_name: data.full_name,
          email: data.email?.trim() || null,
          title: data.title?.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee updated successfully");
      closeFormDialog();
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("An employee with this email already exists in this company.");
      } else if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to update employees.");
      } else {
        toast.error(`Failed to update employee: ${error.message}`);
      }
    },
  });

  // Archive employee mutation (soft delete)
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "archived" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee archived successfully");
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["employees-archived", activeCompanyId] });
    },
    onError: (error: any) => {
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to manage employees.");
      } else {
        toast.error(`Failed to archive employee: ${error.message}`);
      }
    },
  });

  // Restore employee mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "active" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee restored successfully");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["employees-archived", activeCompanyId] });
    },
    onError: (error: any) => {
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to manage employees.");
      } else {
        toast.error(`Failed to restore employee: ${error.message}`);
      }
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("employees")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Employee ${status === "active" ? "activated" : "deactivated"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
    },
    onError: (error: any) => {
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to update employees.");
      } else {
        toast.error(`Failed to update status: ${error.message}`);
      }
    },
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async ({ employeeId, role }: { employeeId: string; role: string }) => {
      // 1. Create invite via RPC
      const { data: inviteData, error: rpcError } = await supabase
        .rpc("create_employee_invite", {
          p_employee_id: employeeId,
          p_role: role,
        });

      if (rpcError) throw rpcError;
      if (!inviteData || inviteData.length === 0) throw new Error("Failed to create invite");

      const invite = inviteData[0];

      // 2. Send email via edge function
      const { data, error: emailError } = await supabase.functions.invoke(
        "send-employee-invite-email",
        {
          body: { invite_id: invite.invite_id },
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
        return { invite, emailSent: false, error: emailError.message };
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        return { invite, emailSent: false, error: result.error };
      }

      return { invite, emailSent: true };
    },
    onSuccess: (result) => {
      if (result.emailSent) {
        toast.success("Invitation sent successfully!");
      } else {
        toast.warning(`Invitation created but email failed: ${result.error || "Unknown error"}`);
      }
      setInviteDialogOpen(false);
      setInviteEmployee(null);
      setInviteRole("user");
      refetchInvites();
    },
    onError: (error: any) => {
      console.error("Invite error:", error);
      if (error.message?.includes("already linked")) {
        toast.error("This employee is already linked to a user account.");
      } else if (error.message?.includes("no email")) {
        toast.error("This employee has no email address.");
      } else if (error.message?.includes("not active")) {
        toast.error("This employee is not active.");
      } else {
        toast.error(`Failed to send invitation: ${error.message}`);
      }
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "send-employee-invite-email",
        {
          body: { invite_id: inviteId },
        }
      );

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Invitation resent successfully!");
      refetchInvites();
    },
    onError: (error: any) => {
      toast.error(`Failed to resend: ${error.message}`);
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("employee_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      refetchInvites();
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke: ${error.message}`);
    },
  });

  const openCreateDialog = () => {
    setEditingEmployee(null);
    setFormData({ full_name: "", email: "", title: "" });
    setFormDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      email: employee.email || "",
      title: employee.title || "",
    });
    setFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    setFormDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ full_name: "", email: "", title: "" });
  };

  const openInviteDialog = (employee: Employee) => {
    setInviteEmployee(employee);
    setInviteRole("user");
    setInviteDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusToggle = (employee: Employee) => {
    const newStatus = employee.status === "active" ? "inactive" : "active";
    updateStatusMutation.mutate({ id: employee.id, status: newStatus });
  };

  const handleSendInvite = () => {
    if (!inviteEmployee) return;
    sendInviteMutation.mutate({ employeeId: inviteEmployee.id, role: inviteRole });
  };

  const handleArchive = () => {
    if (!employeeToDelete) return;
    archiveMutation.mutate(employeeToDelete.id);
  };

  const copyInviteLink = (token: string) => {
    const link = `${appUrl}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
  };

  const canInvite = (employee: Employee) =>
    employee.email && !employee.user_id && employee.status === "active";

  const isInviteExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  // Access denied state
  if (!hasAdminAccess) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-md mx-auto border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              You don't have permission to manage employees. Only company administrators can view this page.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // No active company
  if (!activeCompanyId) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Company Selected</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              Please select a company to manage its employees.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage employees for {activeCompany?.name || "this company"}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search & Stats */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                <strong className="text-foreground">{employees.filter((e) => e.status === "active").length}</strong> active
              </span>
              <span>
                <strong className="text-foreground">{employees.filter((e) => e.status === "inactive").length}</strong> inactive
              </span>
              <Button variant="ghost" size="icon" onClick={() => { refetch(); refetchInvites(); refetchArchived(); }} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Employees and Pending Invites */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Employees ({filteredEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2">
            <Mail className="h-4 w-4" />
            Pending Invites ({pendingInvites.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archivedEmployees.length})
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-destructive">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Failed to load employees
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No employees match your search." : "No employees yet. Add your first employee!"}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Linked</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">{employee.full_name}</TableCell>
                            <TableCell>
                              {employee.email ? (
                                employee.email
                              ) : (
                                <span className="text-muted-foreground text-sm italic">
                                  No email
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{employee.title || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                                {employee.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {employee.user_id ? (
                                <Badge variant="outline" className="gap-1">
                                  <Link2 className="h-3 w-3" />
                                  Linked
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Link2Off className="h-3 w-3" />
                                  No
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {canInvite(employee) && (
                                    <DropdownMenuItem onClick={() => openInviteDialog(employee)}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Invite
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleStatusToggle(employee)}>
                                    {employee.status === "active" ? (
                                      <>
                                        <UserX className="h-4 w-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(employee)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredEmployees.map((employee) => (
                      <Card key={employee.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{employee.full_name}</p>
                            {employee.email ? (
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No email</p>
                            )}
                            {employee.title && (
                              <p className="text-sm text-muted-foreground">{employee.title}</p>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                                {employee.status}
                              </Badge>
                              {employee.user_id && (
                                <Badge variant="outline" className="gap-1">
                                  <Link2 className="h-3 w-3" />
                                  Linked
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {canInvite(employee) && (
                                <DropdownMenuItem onClick={() => openInviteDialog(employee)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Invite
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusToggle(employee)}>
                                {employee.status === "active" ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(employee)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invites Tab */}
        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingInvites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No pending invitations.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((invite) => {
                        const expired = isInviteExpired(invite.expires_at);
                        return (
                          <TableRow key={invite.id} className={expired ? "opacity-60" : ""}>
                            <TableCell className="font-medium">
                              {invite.employees?.full_name || "Unknown"}
                            </TableCell>
                            <TableCell>{invite.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {INVITE_ROLES.find((r) => r.value === invite.role)?.label || invite.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(invite.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {invite.sent_at ? (
                                <span className="text-green-600">
                                  {format(new Date(invite.sent_at), "MMM d, HH:mm")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Not sent</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {expired ? (
                                <Badge variant="destructive" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Expired
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(invite.expires_at), "MMM d, yyyy")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => resendInviteMutation.mutate(invite.id)}
                                    disabled={resendInviteMutation.isPending}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Resend Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => copyInviteLink(invite.token)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                                    className="text-destructive focus:text-destructive"
                                    disabled={revokeInviteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Revoke
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Archive className="h-5 w-5" />
                Archived Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingArchived ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : archivedEmployees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No archived employees.
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Linked</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedEmployees.map((employee) => (
                          <TableRow key={employee.id} className="opacity-70">
                            <TableCell className="font-medium">{employee.full_name}</TableCell>
                            <TableCell>
                              {employee.email ? (
                                employee.email
                              ) : (
                                <span className="text-muted-foreground text-sm italic">
                                  No email
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{employee.title || "—"}</TableCell>
                            <TableCell>
                              {employee.user_id ? (
                                <Badge variant="outline" className="gap-1">
                                  <Link2 className="h-3 w-3" />
                                  Linked
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Link2Off className="h-3 w-3" />
                                  No
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => restoreMutation.mutate(employee.id)}
                                disabled={restoreMutation.isPending}
                              >
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Restore
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {archivedEmployees.map((employee) => (
                      <Card key={employee.id} className="p-4 opacity-70">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{employee.full_name}</p>
                            {employee.email ? (
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No email</p>
                            )}
                            {employee.title && (
                              <p className="text-sm text-muted-foreground">{employee.title}</p>
                            )}
                            {employee.user_id && (
                              <Badge variant="outline" className="gap-1 mt-1">
                                <Link2 className="h-3 w-3" />
                                Linked
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreMutation.mutate(employee.id)}
                            disabled={restoreMutation.isPending}
                          >
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? "Update employee information."
                : "Add a new employee to the company. Email is optional but required for invitation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Required for sending invitations and auto-linking accounts.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFormDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingEmployee ? "Save Changes" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Send an email invitation to <strong>{inviteEmployee?.full_name}</strong> ({inviteEmployee?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite_role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The role they'll have when they accept the invitation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={sendInviteMutation.isPending}
            >
              {sendInviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{employeeToDelete?.full_name}</strong> from active lists. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
