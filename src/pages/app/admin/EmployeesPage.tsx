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
} from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import type { Tables } from "@/integrations/supabase/types";

type Employee = Tables<"employees">;

interface EmployeeFormData {
  full_name: string;
  email: string;
  title: string;
}

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

  const hasAdminAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Fetch employees
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
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!activeCompanyId,
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
                <strong className="text-foreground">{employees.filter((e) => e.status !== "active").length}</strong> inactive
              </span>
              <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Employees ({filteredEmployees.length})
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
                              No email (cannot invite)
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
                          <p className="text-sm text-muted-foreground italic">No email (cannot invite)</p>
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

      {/* Add/Edit Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? "Update employee information."
                : "Add a new employee to the company. Email is optional but required for future login linking."}
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
                  Required for auto-linking when the employee signs up.
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
    </div>
  );
}
