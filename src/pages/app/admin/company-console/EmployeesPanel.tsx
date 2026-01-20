import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Loader2,
  Pencil,
  Send,
  Archive,
  RotateCcw,
  RefreshCw,
  Trash2,
  Link,
  Copy,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

export default function EmployeesPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId, activeCompany } = useMembership();

  const [searchQuery, setSearchQuery] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: "",
    email: "",
    title: "",
  });

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmployee, setInviteEmployee] = useState<Employee | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("user");

  const { data: employees = [], isLoading, refetch } = useQuery({
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

  const { data: archivedEmployees = [], refetch: refetchArchived } = useQuery({
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
    enabled: !!activeCompanyId,
  });

  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ["employee-invites", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("employee_invites")
        .select("*, employees(full_name)")
        .eq("company_id", activeCompanyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InviteWithEmployee[];
    },
    enabled: !!activeCompanyId,
  });

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

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { data: insertedData, error } = await supabase
        .from("employees")
        .insert({
          company_id: activeCompanyId,
          full_name: data.full_name,
          email: data.email.trim() || null,
          title: data.title.trim() || null,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: insertedData.id, ...data };
    },
    onSuccess: () => {
      toast.success("Employee added successfully");
      closeFormDialog();
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to add employee: ${error.message}`);
    },
  });

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
      toast.error(`Failed to update employee: ${error.message}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "archived" })
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee archived");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["employees-archived", activeCompanyId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to archive: ${error.message}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "active" })
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee restored");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["employees-archived", activeCompanyId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to restore: ${error.message}`);
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ employee, role }: { employee: Employee; role: string }) => {
      const { data: inviteData, error: rpcError } = await supabase.rpc("create_employee_invite", {
        p_employee_id: employee.id,
        p_role: role,
      });
      if (rpcError) throw rpcError;
      if (!inviteData || inviteData.length === 0) throw new Error("Failed to create invite");

      const invite = inviteData[0];
      const { data, error: emailError } = await supabase.functions.invoke(
        "send-employee-invite-email",
        { body: { invite_id: invite.invite_id } }
      );

      if (emailError) {
        return { invite, emailSent: false, error: emailError.message };
      }
      const result = data as { success: boolean; error?: string };
      return { invite, emailSent: result.success, error: result.error };
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
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee deleted permanently");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["employees-archived", activeCompanyId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete employee: ${error.message}`);
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (invite: InviteWithEmployee) => {
      const { error } = await supabase
        .from("employee_invites")
        .delete()
        .eq("id", invite.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite deleted");
      refetchInvites();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete invite: ${error.message}`);
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invite: InviteWithEmployee) => {
      const { data, error } = await supabase.functions.invoke(
        "send-employee-invite-email",
        { body: { invite_id: invite.id } }
      );
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Failed to send email");
      return result;
    },
    onSuccess: () => {
      toast.success("Invite email resent successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to resend invite: ${error.message}`);
    },
  });

  const copyInviteLink = (invite: InviteWithEmployee) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/accept-invite?token=${invite.token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied to clipboard");
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      if (!employee.email) throw new Error("Employee has no email address");
      const { error } = await supabase.auth.resetPasswordForEmail(employee.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: (_, employee) => {
      toast.success(`Password reset email sent to ${employee.email}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to send password reset: ${error.message}`);
    },
  });

  const closeFormDialog = () => {
    setFormDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ full_name: "", email: "", title: "" });
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData({ full_name: "", email: "", title: "" });
    setFormDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name || "",
      email: employee.email || "",
      title: employee.title || "",
    });
    setFormDialogOpen(true);
  };

  const handleSendInvite = (employee: Employee) => {
    setInviteEmployee(employee);
    setInviteRole("user");
    setInviteDialogOpen(true);
  };

  const handleFormSubmit = () => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Employees</h3>
          <p className="text-sm text-muted-foreground">
            Manage employees for {activeCompany?.name || "this company"}
          </p>
        </div>
        <Button onClick={handleCreate} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({employees.length})</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites ({pendingInvites.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedEmployees.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Employees
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No employees found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {employee.email || "—"}
                          </TableCell>
                          <TableCell>{employee.title || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                              {employee.status}
                            </Badge>
                            {employee.user_id && (
                              <Badge variant="outline" className="ml-2 text-[10px]">Linked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {employee.email && !employee.user_id && (
                                  <DropdownMenuItem onClick={() => handleSendInvite(employee)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Invite
                                  </DropdownMenuItem>
                                )}
                                {employee.email && employee.user_id && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`Send password reset email to ${employee.email}?`)) {
                                        resetPasswordMutation.mutate(employee);
                                      }
                                    }}
                                    disabled={resetPasswordMutation.isPending}
                                  >
                                    <KeyRound className="h-4 w-4 mr-2" />
                                    Reset Password
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => archiveMutation.mutate(employee)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to permanently delete ${employee.full_name}? This cannot be undone.`)) {
                                      deleteEmployeeMutation.mutate(employee);
                                    }
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Invites</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingInvites.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No pending invites.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">
                            {invite.employees?.full_name || "—"}
                          </TableCell>
                          <TableCell>{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invite.role}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(invite.expires_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyInviteLink(invite)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Invite Link
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => resendInviteMutation.mutate(invite)}
                                  disabled={resendInviteMutation.isPending}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Resend Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this invite?")) {
                                      deleteInviteMutation.mutate(invite);
                                    }
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Invite
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Archived Employees</CardTitle>
            </CardHeader>
            <CardContent>
              {archivedEmployees.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No archived employees.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {employee.email || "—"}
                          </TableCell>
                          <TableCell>{employee.title || "—"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreMutation.mutate(employee)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? "Update employee information."
                : "Add a new employee to your organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFormDialog}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={!formData.full_name.trim()}>
              {editingEmployee ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to {inviteEmployee?.full_name} ({inviteEmployee?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite_role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                inviteEmployee && sendInviteMutation.mutate({ employee: inviteEmployee, role: inviteRole })
              }
              disabled={sendInviteMutation.isPending}
            >
              {sendInviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
