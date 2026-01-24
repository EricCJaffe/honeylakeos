import * as React from "react";
import { Search, FileSpreadsheet, MoreHorizontal, Eye, Trash2, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useBills, useBillMutations, Bill, BillStatus } from "@/hooks/useBills";
import { useVendors } from "@/hooks/useVendors";

function getStatusBadgeVariant(status: BillStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid":
      return "default";
    case "approved":
      return "secondary";
    case "voided":
      return "destructive";
    default:
      return "outline";
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function BillsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BillStatus | "all">("all");
  const [vendorFilter, setVendorFilter] = React.useState<string>("all");
  const [deletingBill, setDeletingBill] = React.useState<Bill | null>(null);

  const { data: vendors = [] } = useVendors();
  const { data: bills = [], isLoading } = useBills({
    status: statusFilter === "all" ? null : statusFilter,
    vendorId: vendorFilter === "all" ? null : vendorFilter,
    search: search || null,
  });
  const { deleteBill } = useBillMutations();

  const handleDelete = async () => {
    if (!deletingBill) return;
    await deleteBill.mutateAsync(deletingBill.id);
    setDeletingBill(null);
  };

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Bills"
        description="Manage accounts payable and vendor bills"
        actionLabel="New Bill"
        onAction={() => navigate("/app/finance/bills/new")}
      />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bill number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BillStatus | "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">No bills yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first bill to track vendor expenses
            </p>
            <Button onClick={() => navigate("/app/finance/bills/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <div className="hidden md:grid grid-cols-6 gap-4 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div>Vendor</div>
            <div>Bill #</div>
            <div>Bill Date</div>
            <div>Due Date</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Status</div>
          </div>
          <div className="divide-y">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="font-medium truncate">
                  {bill.vendor?.name || "Unknown Vendor"}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {bill.bill_number}
                </div>
                <div className="hidden md:block text-sm">
                  {format(new Date(bill.bill_date), "MMM d, yyyy")}
                </div>
                <div className="hidden md:block text-sm">
                  {format(new Date(bill.due_date), "MMM d, yyyy")}
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(bill.total_amount)}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Badge variant={getStatusBadgeVariant(bill.status)}>
                    {bill.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/app/finance/bills/${bill.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {bill.status === "draft" && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingBill(bill)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingBill} onOpenChange={() => setDeletingBill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive bill "{deletingBill?.bill_number}"? This will hide it from the bills list.
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
