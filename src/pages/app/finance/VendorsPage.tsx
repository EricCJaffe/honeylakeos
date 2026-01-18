import * as React from "react";
import { Search, Building2, MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useVendors, useVendorMutations, Vendor } from "@/hooks/useVendors";
import { VendorFormDialog } from "./VendorFormDialog";

export default function VendorsPage() {
  const { data: vendors = [], isLoading } = useVendors();
  const { deleteVendor } = useVendorMutations();
  const [search, setSearch] = React.useState("");
  const [editingVendor, setEditingVendor] = React.useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = React.useState<Vendor | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deletingVendor) return;
    await deleteVendor.mutateAsync(deletingVendor.id);
    setDeletingVendor(null);
  };

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Vendors"
        description="Manage your suppliers and vendors"
        actionLabel="Add Vendor"
        onAction={() => setShowCreateDialog(true)}
      />

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">No vendors yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first vendor to get started with accounts payable
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{vendor.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {vendor.email || "No email"}{vendor.phone ? ` • ${vendor.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={vendor.is_active ? "default" : "secondary"}>
                      {vendor.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingVendor(vendor)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingVendor(vendor)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VendorFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <VendorFormDialog
        open={!!editingVendor}
        onOpenChange={(open) => !open && setEditingVendor(null)}
        vendor={editingVendor || undefined}
      />

      <AlertDialog open={!!deletingVendor} onOpenChange={() => setDeletingVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{deletingVendor?.name}"? This will hide them from the vendor list but preserve their history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
