import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Building2, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

interface CompanyRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  site_id: string;
  created_at: string;
  created_by: string | null;
}

export default function CompaniesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingCompanyId, setEditingCompanyId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as CompanyRow[];
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      const trimmedEmail = adminEmail.trim().toLowerCase();
      if (!trimmedName) throw new Error("Company name is required.");
      if (!trimmedEmail) throw new Error("First admin email is required.");

      // Find existing user profile for initial admin.
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", trimmedEmail)
        .limit(1);

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        throw new Error("Admin user not found. Ask them to sign up first, then try again.");
      }
      const adminUserId = profiles[0].user_id;

      // Resolve site_id from existing companies (single-site behavior) or RPC fallback.
      let siteId: string | null = companies?.[0]?.site_id ?? null;
      if (!siteId) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_default_site_id");
        if (rpcError) throw rpcError;
        siteId = (rpcData as string | null) ?? null;
      }
      if (!siteId) throw new Error("Unable to determine site id.");

      const { data: createdCompany, error: createCompanyError } = await supabase
        .from("companies")
        .insert({
          name: trimmedName,
          description: description.trim() || null,
          site_id: siteId,
          status: "active",
          created_by: user?.id ?? null,
        })
        .select("id, name")
        .single();

      if (createCompanyError) throw createCompanyError;

      const { error: membershipError } = await supabase.from("memberships").insert({
        company_id: createdCompany.id,
        user_id: adminUserId,
        role: "company_admin",
        status: "active",
        member_type: "internal",
      });

      if (membershipError) {
        // Best-effort rollback if first-admin assignment fails.
        await supabase.from("companies").delete().eq("id", createdCompany.id);
        throw membershipError;
      }

      return createdCompany;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success(`Created company: ${company.name}`);
      setCreateOpen(false);
      setName("");
      setDescription("");
      setAdminEmail("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create company.");
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!editingCompanyId) throw new Error("No company selected.");
      const trimmedName = editName.trim();
      if (!trimmedName) throw new Error("Company name is required.");

      const { error } = await supabase
        .from("companies")
        .update({
          name: trimmedName,
          description: editDescription.trim() || null,
        })
        .eq("id", editingCompanyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated.");
      setEditOpen(false);
      setEditingCompanyId(null);
      setEditName("");
      setEditDescription("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update company.");
    },
  });

  function openEditDialog(company: CompanyRow) {
    setEditingCompanyId(company.id);
    setEditName(company.name);
    setEditDescription(company.description || "");
    setEditOpen(true);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies
            <Badge variant="secondary" className="ml-2">
              {companies?.length ?? 0} total
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {companies && companies.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {company.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={company.status === "active" ? "default" : "secondary"}
                      >
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(company.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(company)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No companies found.</p>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>
              Create a company workspace and assign the initial company admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Honey Lake Clinic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-description">Description (optional)</Label>
              <Textarea
                id="company-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short internal description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="first-admin-email">First Admin Email</Label>
              <Input
                id="first-admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@honeylakeclinic.com"
              />
              <p className="text-xs text-muted-foreground">
                User must already exist in the system (signed up) before assignment.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCompanyMutation.mutate()}
              disabled={
                createCompanyMutation.isPending ||
                !name.trim() ||
                !adminEmail.trim()
              }
            >
              {createCompanyMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingCompanyId(null);
            setEditName("");
            setEditDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-company-name">Company Name</Label>
              <Input
                id="edit-company-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Honey Lake Clinic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company-description">Description (optional)</Label>
              <Textarea
                id="edit-company-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Short internal description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateCompanyMutation.mutate()}
              disabled={updateCompanyMutation.isPending || !editName.trim()}
            >
              {updateCompanyMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
